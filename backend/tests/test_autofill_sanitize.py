"""Tests for _sanitize_extracted – the safety net between AI output and DB schemas."""

import pytest

from src.routers.ai import _sanitize_extracted

# ------------------------------------------------------------------
# helpers
# ------------------------------------------------------------------


def _make_extracted(**overrides):
    """Return a minimal valid extracted dict, with per-section overrides."""
    base = {
        "skills": [],
        "experiences": [],
        "education": [],
        "languages": [],
        "extracurriculars": [],
    }
    base.update(overrides)
    return base


# ------------------------------------------------------------------
# technologies: list → string
# ------------------------------------------------------------------


class TestTechnologiesCoercion:
    def test_list_joined(self):
        data = _make_extracted(
            experiences=[
                {"title": "Dev", "technologies": ["Python", "Mediapipe", "Pygame"]},
            ]
        )
        _sanitize_extracted(data)
        assert data["experiences"][0]["technologies"] == "Python, Mediapipe, Pygame"

    def test_string_unchanged(self):
        data = _make_extracted(
            experiences=[
                {"title": "Dev", "technologies": "Python, Go"},
            ]
        )
        _sanitize_extracted(data)
        assert data["experiences"][0]["technologies"] == "Python, Go"

    def test_none_stays_none(self):
        data = _make_extracted(
            experiences=[
                {"title": "Dev", "technologies": None},
            ]
        )
        _sanitize_extracted(data)
        assert data["experiences"][0]["technologies"] is None


# ------------------------------------------------------------------
# dates: YYYY-MM-DD → YYYY-MM (fits String(7))
# ------------------------------------------------------------------


class TestDateNormalisation:
    @pytest.mark.parametrize(
        "raw,expected",
        [
            ("2026-02-01", "2026-02"),
            ("2024-09-15", "2024-09"),
            ("2024-09", "2024-09"),
            ("2024/09/15", "2024-09"),
            (None, None),
            ("", None),
            (123, None),
        ],
    )
    def test_experience_dates(self, raw, expected):
        data = _make_extracted(
            experiences=[
                {"title": "X", "start_date": raw, "end_date": raw},
            ]
        )
        _sanitize_extracted(data)
        assert data["experiences"][0]["start_date"] == expected
        assert data["experiences"][0]["end_date"] == expected

    def test_education_dates(self):
        data = _make_extracted(
            education=[
                {
                    "school": "MIT",
                    "degree": "BS",
                    "start_date": "2020-09-01",
                    "end_date": "2024-06-30",
                },
            ]
        )
        _sanitize_extracted(data)
        assert data["education"][0]["start_date"] == "2020-09"
        assert data["education"][0]["end_date"] == "2024-06"


# ------------------------------------------------------------------
# truncation: oversized strings
# ------------------------------------------------------------------


class TestTruncation:
    def test_experience_title_truncated_to_200(self):
        long_title = "A" * 300
        data = _make_extracted(experiences=[{"title": long_title}])
        _sanitize_extracted(data)
        assert len(data["experiences"][0]["title"]) == 200

    def test_skill_name_truncated_to_100(self):
        data = _make_extracted(skills=[{"name": "X" * 150}])
        _sanitize_extracted(data)
        assert len(data["skills"][0]["name"]) == 100

    def test_technologies_truncated_to_500(self):
        data = _make_extracted(
            experiences=[
                {"title": "Dev", "technologies": "T" * 600},
            ]
        )
        _sanitize_extracted(data)
        assert len(data["experiences"][0]["technologies"]) == 500

    def test_school_truncated_to_200(self):
        data = _make_extracted(
            education=[
                {"school": "S" * 300, "degree": "D" * 300},
            ]
        )
        _sanitize_extracted(data)
        assert len(data["education"][0]["school"]) == 200
        assert len(data["education"][0]["degree"]) == 200

    def test_language_truncated_to_50(self):
        data = _make_extracted(
            languages=[
                {"language": "L" * 80, "level": "V" * 80},
            ]
        )
        _sanitize_extracted(data)
        assert len(data["languages"][0]["language"]) == 50
        assert len(data["languages"][0]["level"]) == 50

    def test_extracurricular_name_truncated_to_200(self):
        data = _make_extracted(extracurriculars=[{"name": "N" * 300}])
        _sanitize_extracted(data)
        assert len(data["extracurriculars"][0]["name"]) == 200


# ------------------------------------------------------------------
# defaults: missing / None required fields
# ------------------------------------------------------------------


class TestDefaults:
    def test_missing_experience_title_defaults_empty(self):
        data = _make_extracted(experiences=[{}])
        _sanitize_extracted(data)
        assert data["experiences"][0]["title"] == ""

    def test_missing_school_defaults_empty(self):
        data = _make_extracted(education=[{}])
        _sanitize_extracted(data)
        assert data["education"][0]["school"] == ""
        assert data["education"][0]["degree"] == ""

    def test_missing_language_level_defaults_intermediate(self):
        data = _make_extracted(languages=[{"language": "French"}])
        _sanitize_extracted(data)
        assert data["languages"][0]["level"] == "intermediate"

    def test_invalid_skill_category_defaults_other(self):
        data = _make_extracted(
            skills=[
                {"name": "Python", "category": "invented_category"},
            ]
        )
        _sanitize_extracted(data)
        assert data["skills"][0]["category"] == "other"


# ------------------------------------------------------------------
# empty / missing sections don't crash
# ------------------------------------------------------------------


class TestEmptySections:
    def test_empty_dict(self):
        data = {}
        _sanitize_extracted(data)
        # no error

    def test_partial_sections(self):
        data = {"skills": [{"name": "Go"}]}
        _sanitize_extracted(data)
        assert data["skills"][0]["name"] == "Go"


# ------------------------------------------------------------------
# integration: realistic AI output that previously caused 500s
# ------------------------------------------------------------------


class TestRealisticAIOutput:
    def test_full_realistic_payload(self):
        """Simulate the exact payload that caused the production 500."""
        data = {
            "skills": [
                {"name": "Python", "category": "programming", "level": "advanced"},
                {"name": "Mediapipe", "category": "framework", "level": "intermediate"},
                {"name": "Teamwork", "category": "soft_skill", "level": None},
            ],
            "experiences": [
                {
                    "title": "Agile Prototyper",
                    "description": "Developed 3 MVPs in teams of 3-4 over 7 weeks.",
                    "technologies": ["Python", "Mediapipe", "Pygame"],
                    "client": None,
                    "start_date": "2026-02-01",
                    "end_date": "2026-07-31",
                },
            ],
            "education": [
                {
                    "school": "MIT",
                    "degree": "Bachelor of Science",
                    "field": "Computer Science",
                    "description": None,
                    "start_date": "2020-09-01",
                    "end_date": "2024-06-30",
                },
            ],
            "languages": [
                {"language": "French", "level": "native"},
                {"language": "English", "level": "advanced"},
            ],
            "extracurriculars": [
                {"name": "Robotics Club", "description": "Built autonomous robots."},
            ],
        }
        _sanitize_extracted(data)

        exp = data["experiences"][0]
        assert exp["technologies"] == "Python, Mediapipe, Pygame"
        assert exp["start_date"] == "2026-02"
        assert exp["end_date"] == "2026-07"
        assert len(exp["start_date"]) <= 7
        assert len(exp["end_date"]) <= 7

        # Skill category mapping: "soft_skill" not in SkillCategory → "other"
        assert data["skills"][2]["category"] == "other"
        # "framework" not in SkillCategory → "other"
        assert data["skills"][1]["category"] == "other"
