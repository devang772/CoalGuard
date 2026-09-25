"""Compatibility with the apps already on main: /api/v1 base URL and error text under "message"."""


def test_api_v1_alias_for_http(client):
    assert client.get("/api/v1/health").json()["status"] == "ok"
    r = client.post("/api/v1/auth/login", json={"phone": "9000000004", "password": "demo123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["mine_name"] == "Moonidih UG"


def test_api_v1_alias_for_websocket(client, login):
    token = login("9000000003")["Authorization"].split(" ", 1)[1]
    with client.websocket_connect(f"/api/v1/ws/notifications?token={token}") as ws:
        assert ws.receive_json()["type"] == "hello"


def test_errors_have_detail_and_message(client, login):
    wrong = client.post("/auth/login", json={"phone": "9000000004", "password": "nope"}).json()
    assert wrong["detail"] == wrong["message"] == "Wrong phone number or password."
    missing = client.get("/mines/99999", headers=login("9000000001")).json()
    assert missing["message"] == "Mine not found."
    invalid = client.post("/observations", json={"type": "near_miss"}, headers=login("9000000009")).json()
    assert invalid["detail"] == invalid["message"] == "text: Field required"
    unauth = client.get("/auth/me")
    assert unauth.status_code == 401 and unauth.headers.get("www-authenticate") == "Bearer"
