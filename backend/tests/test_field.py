"""Module 7: field reports, SOS (+ live WebSocket push), grievances, notifications, offline sync."""
import pytest
from sqlalchemy import select

from app.db import SessionLocal
from app.models import AuditLog, ComplianceTask, Grievance, OrgUnit
from app.utils import today_ist
from tests.photos import iso_z, make_photo, now_utc

CIL, BCCL, GM, MANAGER, REGULATOR, CONTRACTOR, OFFICER, SUPERVISOR, WORKER = (
    f"90000000{i:02d}" for i in range(1, 10))


@pytest.fixture(scope="module", autouse=True)
def _data(seeded_data):
    return seeded_data


@pytest.fixture(scope="module")
def moonidih():
    with SessionLocal() as db:
        m = db.scalar(select(OrgUnit).where(OrgUnit.name == "Moonidih UG"))
        return {"id": m.id, "lat": m.center_lat, "lng": m.center_lng}


def token_of(login, phone):
    return login(phone)["Authorization"].split(" ", 1)[1]


def photo_id(client, login, mine, scene, phone=WORKER):
    form = {"mine_id": str(mine["id"]), "lat": str(mine["lat"]), "lng": str(mine["lng"]), "accuracy": "8",
            "device_time": iso_z(now_utc())}
    r = client.post("/evidence", data=form, files={"file": ("p.jpg", make_photo(scene), "image/jpeg")},
                    headers=login(phone))
    return r.json()["id"]


def report(client, login, phone=WORKER, **body):
    return client.post("/observations", json={"type": "near_miss", "text": "Stone fell near the face",
                                              "severity": "low", **body}, headers=login(phone))


def notifications_of(client, login, phone):
    return client.get("/notifications", params={"page_size": 50}, headers=login(phone)).json()


# ---------------------------------------------------------------- field reports

def test_serious_hazard_becomes_capa_and_alerts(client, login, moonidih):
    before = notifications_of(client, login, GM)["total"]
    assert report(client, login, type="unsafe_condition", severity="critical", category="roof",
                  text="Big crack in roof near conveyor 3").status_code == 422          # photo required
    r = report(client, login, type="unsafe_condition", severity="critical", category="roof",
               text="Big crack in roof near conveyor 3", evidence_id=photo_id(client, login, moonidih, 301),
               lat=moonidih["lat"], lng=moonidih["lng"])
    assert r.status_code == 201, r.text
    obs = r.json()
    assert obs["capa_id"] and obs["capa_status"] == "open" and obs["reporter_name"].startswith("Birsa Hansda")
    assert obs["evidence"]["trust_level"] == "verified"
    gm = notifications_of(client, login, GM)
    assert gm["total"] == before + 1 and gm["items"][0]["kind"] == "incident" and gm["items"][0]["level"] == "critical"
    capa = client.get(f"/capa/{obs['capa_id']}", headers=login(MANAGER)).json()
    assert capa["finding"]["description"].startswith("[unsafe condition] Big crack")


def test_voice_report_keeps_the_original_words(client, login):
    r = report(client, login, type="unsafe_condition", severity="medium", category="roof", source="voice",
               language="hi", transcript="कन्वेयर 3 के पास छत में दरार है", text="Crack in roof near Conveyor 3")
    assert r.status_code == 201                        # voice reports may come without a photo
    obs = r.json()
    assert obs["source"] == "voice" and obs["transcript"] == "कन्वेयर 3 के पास छत में दरार है"
    assert obs["capa_id"] is None                      # medium hazard: no automatic CAPA


def test_anonymous_report_hides_the_reporter_everywhere(client, login):
    obs = report(client, login, type="unsafe_act", text="Operator using phone while driving", anonymous=True).json()
    assert obs["anonymous"] and obs["reporter_id"] is None and obs["reporter_name"] is None
    with SessionLocal() as db:
        entry = db.scalar(select(AuditLog).where(AuditLog.table_name == "observations",
                                                 AuditLog.record_id == obs["id"]))
        assert entry.user_id is None and '"reporter_id":null' in entry.data


def test_convert_and_worker_visibility(client, login):
    obs = report(client, login, text="Slipped near sump, no injury").json()
    assert obs["capa_id"] is None
    assert client.post(f"/observations/{obs['id']}/convert", headers=login(WORKER)).status_code == 403
    first = client.post(f"/observations/{obs['id']}/convert", headers=login(OFFICER)).json()
    again = client.post(f"/observations/{obs['id']}/convert", headers=login(MANAGER)).json()
    assert first["capa_id"] and first["capa_id"] == again["capa_id"]
    mine = client.get("/observations", params={"page_size": 200}, headers=login(WORKER)).json()["items"]
    assert mine and all(o["reporter_name"].startswith("Birsa Hansda") for o in mine)
    everyone = client.get("/observations", params={"page_size": 200}, headers=login(MANAGER)).json()
    assert everyone["total"] > len(mine)


# ---------------------------------------------------------------- SOS + live push

def test_sos_reaches_the_chain_live(client, login, moonidih):
    with client.websocket_connect(f"/ws/notifications?token={token_of(login, GM)}") as ws:
        hello = ws.receive_json()
        assert hello["type"] == "hello" and hello["unread"] >= 0
        r = client.post("/sos", json={"kind": "roof_fall", "note": "Gallery 4", "lat": moonidih["lat"],
                                      "lng": moonidih["lng"]}, headers=login(WORKER))
        assert r.status_code == 201
        sos = r.json()
        assert sos["notified"] == 5 and sos["severity"] == "critical" and sos["text"] == "SOS: Roof fall: Gallery 4"
        pushed = ws.receive_json()
        assert pushed["type"] == "notification"
        assert pushed["notification"]["kind"] == "sos" and "Moonidih UG" in pushed["notification"]["title"]
        ws.send_text("ping")
        assert ws.receive_text() == "pong"

    active = client.get("/sos/active", headers=login(GM)).json()
    assert sos["id"] in [a["id"] for a in active]
    ack = client.post(f"/observations/{sos['id']}/acknowledge", headers=login(MANAGER)).json()
    assert ack["acknowledged_by_name"].startswith("Vikram") and ack["response_minutes"] >= 0
    assert sos["id"] not in [a["id"] for a in client.get("/sos/active", headers=login(GM)).json()]
    assert notifications_of(client, login, WORKER)["items"][0]["title"] == "Help is on the way"
    listed = client.get("/observations", params={"type": "sos"}, headers=login(CIL)).json()["items"]
    assert all(o["type"] == "sos" for o in listed)


def test_websocket_rejects_bad_token(client):
    from starlette.websockets import WebSocketDisconnect
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/notifications?token=not-a-token") as ws:
            ws.receive_json()


# ---------------------------------------------------------------- grievances

def test_anonymous_grievance_and_tracking(client, login):
    r = client.post("/grievances", json={"category": "wages", "text": "Overtime not paid for 2 months"},
                    headers=login(WORKER))
    assert r.status_code == 201
    receipt = r.json()
    assert receipt["token"].startswith("GRV-") and len(receipt["token"]) == 10 and receipt["anonymous"]
    with SessionLocal() as db:
        g = db.get(Grievance, receipt["id"])
        assert g.user_id is None
        entry = db.scalar(select(AuditLog).where(AuditLog.table_name == "grievances", AuditLog.record_id == g.id))
        assert entry.user_id is None
    tracked = client.get(f"/grievances/track/{receipt['token'].lower()}", headers=login(WORKER)).json()
    assert tracked["status"] == "new" and tracked["response"] is None
    reply = client.patch(f"/grievances/{receipt['id']}", json={"response": "Payment released on Friday."},
                         headers=login(MANAGER)).json()
    assert reply["status"] == "in_progress" and reply["reporter_name"] is None
    assert client.get(f"/grievances/track/{receipt['token']}", headers=login(WORKER)).json()["response"] == \
        "Payment released on Friday."
    assert client.get("/grievances/track/GRV-NOPE00", headers=login(WORKER)).status_code == 404


def test_named_and_harassment_grievances(client, login):
    forced = client.post("/grievances", json={"category": "harassment", "text": "Supervisor is abusive",
                                              "anonymous": False}, headers=login(WORKER)).json()
    assert forced["anonymous"] is True
    named = client.post("/grievances", json={"category": "facilities", "text": "No drinking water at pit top",
                                             "anonymous": False}, headers=login(WORKER)).json()
    detail = client.get(f"/grievances/{named['id']}", headers=login(MANAGER)).json()
    assert detail["reporter_name"].startswith("Birsa Hansda")
    client.patch(f"/grievances/{named['id']}", json={"status": "resolved", "response": "Water cooler installed."},
                 headers=login(GM))
    assert notifications_of(client, login, WORKER)["items"][0]["kind"] == "grievance"
    assert client.get("/grievances", headers=login(WORKER)).status_code == 403
    assert client.patch(f"/grievances/{named['id']}", json={}, headers=login(MANAGER)).status_code == 422
    listing = client.get("/grievances", params={"status": "new"}, headers=login(MANAGER)).json()
    assert all(g["status"] == "new" for g in listing["items"])


# ---------------------------------------------------------------- notifications

def test_notification_read_flow(client, login):
    page = notifications_of(client, login, GM)
    assert page["unread"] >= 1
    first = page["items"][0]
    assert client.post(f"/notifications/{first['id']}/read", headers=login(GM)).json()["read"] is True
    assert client.post(f"/notifications/{first['id']}/read", headers=login(WORKER)).status_code == 404
    client.post("/notifications/read-all", headers=login(GM))
    assert client.get("/notifications/unread-count", headers=login(GM)).json() == {"unread": 0}


# ---------------------------------------------------------------- offline sync

def test_master_pack(client, login):
    pack = client.get("/sync/master", headers=login(OFFICER)).json()
    assert [m["name"] for m in pack["mines"]] == ["Moonidih UG"] and pack["mines"][0]["boundary"]["type"] == "Polygon"
    assert {c["mine_type"] for c in pack["checklists"]} <= {"UG", None}
    assert len(pack["hazard_categories"]) == 11 and pack["hazard_categories"][0]["label_hi"]
    assert pack["workers"] and pack["obligations"] and pack["tasks"]
    assert pack["user"]["mine_name"] == "Moonidih UG"
    assert client.get("/sync/master", headers=login(WORKER)).json()["workers"] == []


def test_bulk_queue(client, login, moonidih):
    with SessionLocal() as db:
        task_id = db.scalar(select(ComplianceTask.id).where(
            ComplianceTask.mine_id == moonidih["id"], ComplianceTask.status == "pending",
            ComplianceTask.due_date >= today_ist()).order_by(ComplianceTask.id))
    items = [
        {"client_uuid": "q-insp", "kind": "inspection", "payload": {"mine_id": moonidih["id"], "type": "internal"}},
        {"client_uuid": "q-find", "kind": "finding",
         "payload": {"inspection_client_uuid": "q-insp", "category": "fire", "description": "Extinguisher empty",
                     "severity": "medium"}},
        {"client_uuid": "q-submit", "kind": "inspection_submit",
         "payload": {"inspection_client_uuid": "q-insp", "checklist_answers": [{"item_id": "RS-9", "answer": "not_ok"}]}},
        {"client_uuid": "q-obs", "kind": "observation", "payload": {"type": "near_miss", "text": "Rope snapped near winch"}},
        {"client_uuid": "q-task", "kind": "task_complete", "payload": {"task_id": task_id, "remarks": "Done offline"}},
        {"client_uuid": "q-bad", "kind": "observation", "payload": {"type": "near_miss"}},                 # no text
        {"client_uuid": "q-lost", "kind": "finding",
         "payload": {"inspection_client_uuid": "never-sent", "category": "fire", "description": "x y z",
                     "severity": "low"}},
        {"client_uuid": "q-obs", "kind": "observation", "payload": {"type": "near_miss", "text": "Rope snapped near winch"}},
    ]
    result = client.post("/sync/bulk", json={"items": items}, headers=login(OFFICER)).json()
    statuses = [r["status"] for r in result["results"]]
    assert statuses == ["created", "created", "created", "created", "created", "error", "error", "duplicate"]
    assert result["summary"] == {"created": 5, "duplicate": 1, "error": 2}
    bad, lost = result["results"][5], result["results"][6]
    assert bad["http_status"] == 422 and "text" in bad["error"]
    assert lost["http_status"] == 404 and "send the inspection earlier" in lost["error"]
    inspection = client.get(f"/inspections/{result['results'][0]['server_id']}", headers=login(MANAGER)).json()
    assert inspection["status"] == "submitted" and inspection["findings_count"] == 1

    again = client.post("/sync/bulk", json={"items": items[:5]}, headers=login(OFFICER)).json()
    assert [r["status"] for r in again["results"]] == ["duplicate"] * 5

    worker = client.post("/sync/bulk", json={"items": [
        {"client_uuid": "w-insp", "kind": "inspection", "payload": {"mine_id": moonidih["id"]}},
        {"client_uuid": "w-griev", "kind": "grievance", "payload": {"category": "leave", "text": "Leave not approved"}},
    ]}, headers=login(WORKER)).json()
    assert [r["status"] for r in worker["results"]] == ["error", "created"]
    assert worker["results"][0]["http_status"] == 403
