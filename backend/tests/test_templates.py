import io
from pathlib import Path
from unittest.mock import patch


def test_create_and_list_templates(client, sample_user, auth_header):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/templates",
        json={"name": "Standard", "content": "Dear hiring manager, ..."},
        headers=auth_header,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Standard"
    assert response.json()["file_path"] is None

    response = client.get(f"/users/{uid}/templates", headers=auth_header)
    assert len(response.json()["items"]) == 1


def test_delete_template(client, sample_user, auth_header):
    uid = sample_user["id"]
    tpl = client.post(
        f"/users/{uid}/templates",
        json={"name": "Formal", "content": "To whom it may concern, ..."},
        headers=auth_header,
    ).json()

    response = client.delete(f"/users/{uid}/templates/{tpl['id']}", headers=auth_header)
    assert response.status_code == 200

    response = client.get(f"/users/{uid}/templates", headers=auth_header)
    assert len(response.json()["items"]) == 0


def test_upload_pdf_template(client, sample_user, auth_header, tmp_path):
    uid = sample_user["id"]
    fake_content = "Dear recruiter, I am writing to express my interest."

    with (
        patch("src.routers.templates.save_upload") as mock_save,
        patch("src.routers.templates.extract_text_from_pdf") as mock_extract,
    ):
        mock_save.return_value = tmp_path / "letter.pdf"
        mock_extract.return_value = fake_content

        pdf_bytes = b"%PDF-1.4 fake content"
        response = client.post(
            f"/users/{uid}/templates/upload",
            files={"file": ("letter.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            headers=auth_header,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "letter"
    assert data["content"] == fake_content
    assert data["file_path"] is not None


def test_upload_pdf_with_custom_name(client, sample_user, auth_header, tmp_path):
    uid = sample_user["id"]

    with (
        patch("src.routers.templates.save_upload") as mock_save,
        patch("src.routers.templates.extract_text_from_pdf") as mock_extract,
    ):
        mock_save.return_value = tmp_path / "letter.pdf"
        mock_extract.return_value = "Some extracted text"

        response = client.post(
            f"/users/{uid}/templates/upload?name=My+Custom+Template",
            files={"file": ("letter.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
            headers=auth_header,
        )

    assert response.status_code == 200
    assert response.json()["name"] == "My Custom Template"


def test_upload_rejects_non_pdf(client, sample_user, auth_header):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/templates/upload",
        files={"file": ("letter.docx", io.BytesIO(b"data"), "application/msword")},
        headers=auth_header,
    )
    assert response.status_code == 400
    assert "PDF" in response.json()["detail"]


def test_upload_rejects_empty_pdf(client, sample_user, auth_header, tmp_path):
    uid = sample_user["id"]

    with (
        patch("src.routers.templates.save_upload") as mock_save,
        patch("src.routers.templates.extract_text_from_pdf") as mock_extract,
    ):
        mock_save.return_value = tmp_path / "empty.pdf"
        mock_extract.return_value = "   "

        response = client.post(
            f"/users/{uid}/templates/upload",
            files={"file": ("empty.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
            headers=auth_header,
        )

    assert response.status_code == 422
    assert "extract" in response.json()["detail"].lower()


def test_upload_unauthenticated(client):
    response = client.post(
        "/users/9999/templates/upload",
        files={"file": ("letter.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    assert response.status_code == 401


def test_delete_template_with_file(client, sample_user, auth_header, tmp_path):
    """Deleting a template that has a file_path also deletes the file on disk."""
    uid = sample_user["id"]

    with (
        patch("src.routers.templates.save_upload") as mock_save,
        patch("src.routers.templates.extract_text_from_pdf") as mock_extract,
    ):
        mock_save.return_value = tmp_path / "to_delete.pdf"
        mock_extract.return_value = "Content to delete"

        tpl = client.post(
            f"/users/{uid}/templates/upload",
            files={
                "file": (
                    "to_delete.pdf",
                    io.BytesIO(b"%PDF-1.4"),
                    "application/pdf",
                )
            },
            headers=auth_header,
        ).json()

    # Create a real file at the stored path so delete_file can find it
    fake_file = Path(tpl["file_path"])
    fake_file.parent.mkdir(parents=True, exist_ok=True)
    fake_file.write_bytes(b"fake pdf")

    response = client.delete(f"/users/{uid}/templates/{tpl['id']}", headers=auth_header)
    assert response.status_code == 200
    assert not fake_file.exists()
