"""Router for offer search / scraping endpoints."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src import crud, schemas
from src.auth import get_current_user
from src.database import get_db
from src.llm_service import (
    extract_search_params,
    extract_search_params_async,
    match_offers_to_profile,
    match_offers_to_profile_async,
)
from src.models import User
from src.scrapers import FranceTravailSource, TheMuseSource, WTTJSource, RawOffer

logger = logging.getLogger(__name__)

router = APIRouter(tags=["search"])

# Singleton instances (stateless aside from cached FT token)
_ft_source = FranceTravailSource()
_wttj_source = WTTJSource()
_muse_source = TheMuseSource()


def _verify_owner(user_id: int, current_user: User) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


def _build_profile_summary(user: User, db: Session) -> str:
    """Build a text summary of the user's profile for matching."""
    skills = crud.get_skills(db, user_id=user.id)
    experiences = crud.get_experiences(db, user_id=user.id)
    education = crud.get_education(db, user_id=user.id)

    parts = [f"Name: {user.name}"]
    if skills:
        parts.append("Skills: " + ", ".join(s.name for s in skills))
    if experiences:
        exp_lines = []
        for e in experiences:
            line = e.title
            if e.technologies:
                line += f" ({e.technologies})"
            if e.client:
                line += f" - {e.client}"
            exp_lines.append(line)
        parts.append("Experience: " + "; ".join(exp_lines))
    if education:
        edu_lines = []
        for edu in education:
            line = f"{edu.degree} at {edu.school}"
            if edu.field:
                line += f" in {edu.field}"
            edu_lines.append(line)
        parts.append("Education: " + "; ".join(edu_lines))

    return "\n".join(parts)


@router.post(
    "/users/{user_id}/chat-search",
    response_model=schemas.OfferSearchResponse,
)
async def chat_search(
    user_id: int,
    body: schemas.ChatSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search for offers using natural language. Mistral extracts the search parameters."""
    _verify_owner(user_id, current_user)

    # Use Mistral to extract search params from the user message
    try:
        params = await extract_search_params_async(body.message)
    except Exception as exc:
        logger.error("Failed to extract search params: %s", exc)
        raise HTTPException(status_code=502, detail=f"Mistral API error: {exc}")

    # Build an OfferSearchRequest from extracted params
    raw_max = params.get("max_results")
    max_results = max(
        1,
        min(int(raw_max) if isinstance(raw_max, (str, int)) else body.max_results, 30),
    )

    search_body = schemas.OfferSearchRequest(
        keywords=params.get("keywords") or body.message,  # type: ignore[arg-type]
        location=params.get("location"),  # type: ignore[arg-type]
        country=params.get("country") or "France",  # type: ignore[arg-type]
        radius_km=int(params.get("radius_km") or 30),  # type: ignore[arg-type]
        sources=params.get("sources") or ["francetravail", "wttj"],  # type: ignore[arg-type]
        max_results=max_results,
    )

    # Reuse the search_offers logic
    result = await _do_search_async(user_id, search_body, current_user, db)
    result.parsed_query = params
    return result


@router.post(
    "/users/{user_id}/search-offers",
    response_model=schemas.OfferSearchResponse,
)
async def search_offers(
    user_id: int,
    body: schemas.OfferSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search for internship offers across configured sources and match against profile."""
    _verify_owner(user_id, current_user)
    return await _do_search_async(user_id, body, current_user, db)


def _do_search(
    user_id: int,
    body: schemas.OfferSearchRequest,
    current_user: User,
    db: Session,
) -> schemas.OfferSearchResponse:
    """Core search logic shared by search_offers and chat_search."""
    all_offers: list[RawOffer] = []
    sources_used: list[str] = []

    is_france = body.country.strip().lower() in (
        "france",
        "fr",
        "france metropolitaine",
    )

    # Collect from each source
    if "francetravail" in body.sources and is_france:
        try:
            ft_offers = _ft_source.search(
                body.keywords, body.location, body.radius_km, body.max_results
            )
            all_offers.extend(ft_offers)
            sources_used.append("francetravail")
        except Exception as exc:
            logger.warning("France Travail search failed: %s", exc)

    if "wttj" in body.sources:
        try:
            wttj_offers = _wttj_source.search(
                body.keywords, body.location, body.radius_km, body.max_results
            )
            all_offers.extend(wttj_offers)
            sources_used.append("wttj")
        except Exception as exc:
            logger.warning("WTTJ search failed: %s", exc)

    if "themuse" in body.sources:
        try:
            muse_offers = _muse_source.search(
                body.keywords,
                body.location,
                body.radius_km,
                body.max_results,
                country=body.country,
            )
            all_offers.extend(muse_offers)
            sources_used.append("themuse")
        except Exception as exc:
            logger.warning("The Muse search failed: %s", exc)

    if not all_offers:
        return schemas.OfferSearchResponse(
            results=[], total=0, sources_used=sources_used
        )

    # Build profile summary for matching
    profile_summary = _build_profile_summary(current_user, db)

    # Match offers against profile using Mistral
    offers_for_matching = [
        {
            "title": o.title,
            "company": o.company,
            "description": o.description,
        }
        for o in all_offers
    ]

    try:
        match_results = match_offers_to_profile(profile_summary, offers_for_matching)
    except Exception as exc:
        logger.warning("Matching failed, returning unscored offers: %s", exc)
        match_results = [{"score": 50, "reasons": []} for _ in all_offers]

    # Clear previous results and save new ones
    crud.clear_scraped_offers(db, user_id)

    results: list[schemas.ScrapedOfferResponse] = []
    for offer, match in zip(all_offers, match_results):
        score = float(match.get("score", 50))  # type: ignore[arg-type]
        reasons: list[str] = match.get("reasons", [])  # type: ignore[assignment]

        db_obj = crud.create_scraped_offer(
            db,
            user_id=user_id,
            source=offer.source,
            source_id=offer.source_id,
            company=offer.company,
            title=offer.title,
            description=offer.description,
            locations=offer.locations,
            link=offer.link,
            contract_type=offer.contract_type,
            salary=offer.salary,
            published_at=offer.published_at,
            match_score=score,
            match_reasons=json.dumps(reasons) if reasons else None,
        )

        results.append(
            schemas.ScrapedOfferResponse(
                id=db_obj.id,
                source=offer.source,
                source_id=offer.source_id,
                company=offer.company,
                title=offer.title,
                description=offer.description,
                locations=offer.locations,
                link=offer.link,
                contract_type=offer.contract_type,
                salary=offer.salary,
                published_at=offer.published_at,
                match_score=score,
                match_reasons=reasons if isinstance(reasons, list) else [],
                saved=False,
                created_at=db_obj.created_at,
            )
        )

    # Sort by match score descending
    results.sort(key=lambda r: r.match_score or 0, reverse=True)

    return schemas.OfferSearchResponse(
        results=results[: body.max_results],
        total=len(results),
        sources_used=sources_used,
    )


async def _do_search_async(
    user_id: int,
    body: schemas.OfferSearchRequest,
    current_user: User,
    db: Session,
) -> schemas.OfferSearchResponse:
    """Async version of _do_search — uses async LLM matching."""
    all_offers: list[RawOffer] = []
    sources_used: list[str] = []

    is_france = body.country.strip().lower() in (
        "france", "fr", "france metropolitaine",
    )

    # Scraper calls remain sync (HTTP via urllib)
    if "francetravail" in body.sources and is_france:
        try:
            all_offers.extend(_ft_source.search(
                body.keywords, body.location, body.radius_km, body.max_results
            ))
            sources_used.append("francetravail")
        except Exception as exc:
            logger.warning("France Travail search failed: %s", exc)

    if "wttj" in body.sources:
        try:
            all_offers.extend(_wttj_source.search(
                body.keywords, body.location, body.radius_km, body.max_results
            ))
            sources_used.append("wttj")
        except Exception as exc:
            logger.warning("WTTJ search failed: %s", exc)

    if "themuse" in body.sources:
        try:
            all_offers.extend(_muse_source.search(
                body.keywords, body.location, body.radius_km, body.max_results,
                country=body.country,
            ))
            sources_used.append("themuse")
        except Exception as exc:
            logger.warning("The Muse search failed: %s", exc)

    if not all_offers:
        return schemas.OfferSearchResponse(
            results=[], total=0, sources_used=sources_used
        )

    profile_summary = _build_profile_summary(current_user, db)

    offers_for_matching = [
        {"title": o.title, "company": o.company, "description": o.description}
        for o in all_offers
    ]

    try:
        match_results = await match_offers_to_profile_async(
            profile_summary, offers_for_matching
        )
    except Exception as exc:
        logger.warning("Matching failed, returning unscored offers: %s", exc)
        match_results = [{"score": 50, "reasons": []} for _ in all_offers]

    crud.clear_scraped_offers(db, user_id)

    results: list[schemas.ScrapedOfferResponse] = []
    for offer, match in zip(all_offers, match_results):
        score = float(match.get("score", 50))  # type: ignore[arg-type]
        reasons: list[str] = match.get("reasons", [])  # type: ignore[assignment]

        db_obj = crud.create_scraped_offer(
            db,
            user_id=user_id,
            source=offer.source,
            source_id=offer.source_id,
            company=offer.company,
            title=offer.title,
            description=offer.description,
            locations=offer.locations,
            link=offer.link,
            contract_type=offer.contract_type,
            salary=offer.salary,
            published_at=offer.published_at,
            match_score=score,
            match_reasons=json.dumps(reasons) if reasons else None,
        )

        results.append(
            schemas.ScrapedOfferResponse(
                id=db_obj.id,
                source=offer.source,
                source_id=offer.source_id,
                company=offer.company,
                title=offer.title,
                description=offer.description,
                locations=offer.locations,
                link=offer.link,
                contract_type=offer.contract_type,
                salary=offer.salary,
                published_at=offer.published_at,
                match_score=score,
                match_reasons=reasons if isinstance(reasons, list) else [],
                saved=False,
                created_at=db_obj.created_at,
            )
        )

    results.sort(key=lambda r: r.match_score or 0, reverse=True)

    return schemas.OfferSearchResponse(
        results=results[: body.max_results],
        total=len(results),
        sources_used=sources_used,
    )


@router.get(
    "/users/{user_id}/scraped-offers",
    response_model=list[schemas.ScrapedOfferResponse],
)
def list_scraped_offers(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List previously scraped offers for the user."""
    _verify_owner(user_id, current_user)
    rows = crud.get_scraped_offers(db, user_id)
    return [
        schemas.ScrapedOfferResponse(
            id=r.id,
            source=r.source,
            source_id=r.source_id,
            company=r.company,
            title=r.title,
            description=r.description,
            locations=r.locations,
            link=r.link,
            contract_type=r.contract_type,
            salary=r.salary,
            published_at=r.published_at,
            match_score=r.match_score,
            match_reasons=json.loads(r.match_reasons) if r.match_reasons else [],
            saved=r.saved,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/users/{user_id}/scraped-offers/{offer_id}/save")
def save_offer_to_tracker(
    user_id: int,
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a scraped offer to the user's internship offer tracker."""
    _verify_owner(user_id, current_user)

    scraped = crud.get_scraped_offer(db, offer_id)
    if not scraped:
        raise HTTPException(status_code=404, detail="Scraped offer not found")
    if scraped.user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    db_offer = crud.save_scraped_offer_to_tracker(db, scraped, user_id)
    return {
        "detail": "Offer saved to tracker",
        "offer_id": db_offer.id,
    }


@router.delete("/users/{user_id}/scraped-offers/{offer_id}")
def delete_scraped_offer(
    user_id: int,
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    if not crud.delete_scraped_offer(db, offer_id):
        raise HTTPException(status_code=404, detail="Scraped offer not found")
    return {"detail": "Deleted"}


@router.delete("/users/{user_id}/scraped-offers")
def clear_scraped_offers(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_owner(user_id, current_user)
    count = crud.clear_scraped_offers(db, user_id)
    return {"detail": f"Deleted {count} scraped offers"}
