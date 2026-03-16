def test_create_and_list_templates(client, sample_user):
    uid = sample_user["id"]
    response = client.post(
        f"/users/{uid}/templates",
        json={"name": "Standard", "content": "Dear hiring manager, ..."},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Standard"

    response = client.get(f"/users/{uid}/templates")
    assert len(response.json()) == 1


def test_delete_template(client, sample_user):
    uid = sample_user["id"]
    tpl = client.post(
        f"/users/{uid}/templates",
        json={"name": "Formal", "content": "To whom it may concern, ..."},
    ).json()

    response = client.delete(f"/users/{uid}/templates/{tpl['id']}")
    assert response.status_code == 200

    response = client.get(f"/users/{uid}/templates")
    assert len(response.json()) == 0
