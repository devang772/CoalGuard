"""Module 5: Satya Proof photo checks, evidence files, before/after closure checks."""
import sys
import types
from datetime import timedelta

import pytest
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import OrgUnit
from tests.photos import iso_z, make_photo, now_utc, resized

CIL, BCCL, GM, MANAGER, REGULATOR, CONTRACTOR, OFFICER, SUPERVISOR, WORKER = (
    f"90000000{i:02d}" for i in range(1, 10))


@pytest.fixture(scope="module", autouse=True)
def _data(seeded_data):
    return seeded_data


@pytest.fixture(scope="module")
def moonidih():
    with SessionLocal() as db:
        mine = db.scalar(select(OrgUnit).where(OrgUnit.name == "Moonidih UG"))
        return {"id": mine.id, "lat": mine.center_lat, "lng": mine.center_lng}


def upload(client, login, photo, mine, *, phone=OFFICER, dlat=0.0, accuracy=8.0, taken=None, mocked=False,
           uuid=None, filename="photo.jpg", mine_id=None):
    taken = taken or now_utc()
    form = {"mine_id": str(mine_id or mine["id"]), "lat": str(mine["lat"] + dlat), "lng": str(mine["lng"]),
            "accuracy": str(accuracy), "device_time": iso_z(taken), "device_id": "TEST-PHONE",
            "is_mocked": str(mocked).lower()}
    if uuid:
        form["client_uuid"] = uuid
    return client.post("/evidence", data=form, files={"file": (filename, photo, "image/jpeg")}, headers=login(phone))


def failed(evidence):
    return {c["name"] for c in evidence["checks"] if not c["passed"]}


# ---------------------------------------------------------------- trust score

def test_genuine_photo_is_verified(client, login, moonidih):
    r = upload(client, login, make_photo(101), moonidih, uuid="ev-101")
    assert r.status_code == 201, r.text
    ev = r.json()
    assert ev["trust_score"] == 100 and ev["trust_level"] == "verified" and ev["flags"] == []
    assert ev["exif"]["make"] == "Samsung" and ev["url"].startswith(f"/evidence/{ev['id']}/file?sig=")
    assert any(c["name"] == "Inside the mine boundary" and c["passed"] for c in ev["checks"])
    retry = upload(client, login, make_photo(101), moonidih, uuid="ev-101")
    assert retry.status_code == 200 and retry.json()["id"] == ev["id"]


def test_reused_and_look_alike_photos_are_caught(client, login, moonidih):
    original = make_photo(102)
    first = upload(client, login, original, moonidih).json()
    exact = upload(client, login, original, moonidih).json()
    assert "reused_photo" in exact["flags"] and exact["trust_score"] == 50 and exact["trust_level"] == "suspicious"
    assert f"photo #{first['id']}" in next(c["detail"] for c in exact["checks"] if c["name"].startswith("Fresh"))
    copy = upload(client, login, resized(original), moonidih).json()
    assert "reused_photo" in copy["flags"] and copy["trust_score"] == 60
    assert "Looks the same" in next(c["detail"] for c in copy["checks"] if c["name"].startswith("Fresh"))


def test_location_problems_lose_points(client, login, moonidih):
    outside = upload(client, login, make_photo(103), moonidih, dlat=0.03).json()
    assert "outside_boundary" in outside["flags"] and outside["trust_score"] == 65
    detail = next(c["detail"] for c in outside["checks"] if c["name"] == "Inside the mine boundary")
    assert "km outside Moonidih UG" in detail
    fake = upload(client, login, make_photo(104), moonidih, mocked=True, accuracy=200).json()
    assert {"mock_location", "low_gps_accuracy"} <= set(fake["flags"]) and fake["trust_score"] == 50


def test_time_and_exif_checks(client, login, moonidih):
    no_exif = upload(client, login, make_photo(105, exif=False, fmt="PNG"), moonidih, filename="p.png").json()
    assert no_exif["flags"] == ["no_exif"] and no_exif["trust_score"] == 90
    mismatch = upload(client, login, make_photo(106, taken_utc=now_utc() - timedelta(hours=3)), moonidih).json()
    assert "time_mismatch" in mismatch["flags"]
    old = now_utc() - timedelta(days=10)
    stale = upload(client, login, make_photo(107, taken_utc=old), moonidih, taken=old).json()
    assert "stale_photo" in stale["flags"]
    offline = now_utc() - timedelta(hours=4)             # taken underground, uploaded later: fine
    later = upload(client, login, make_photo(108, taken_utc=offline), moonidih, taken=offline).json()
    assert later["flags"] == []


def test_bad_uploads(client, login, moonidih, monkeypatch):
    assert upload(client, login, b"not an image at all", moonidih).status_code == 422
    gif = make_photo(109, exif=False, fmt="GIF")
    assert upload(client, login, gif, moonidih, filename="a.gif").status_code == 415
    monkeypatch.setattr(settings, "max_upload_mb", 0.001)
    assert upload(client, login, make_photo(110), moonidih).status_code == 413


def test_scope_and_file_access(client, login, moonidih):
    with SessionLocal() as db:
        kusunda = db.scalar(select(OrgUnit.id).where(OrgUnit.name == "Kusunda OCP"))
    assert upload(client, login, make_photo(111), moonidih, mine_id=kusunda).status_code == 403
    photo = make_photo(112)
    ev = upload(client, login, photo, moonidih).json()
    assert client.get(f"/evidence/{ev['id']}", headers=login(GM)).status_code == 200
    assert client.get(f"/evidence/{ev['id']}", headers=login("91" + "00000001")).status_code in (403, 401)
    signed = client.get(ev["url"])                                   # no header needed with the signed link
    assert signed.status_code == 200 and signed.content == photo
    assert client.get(f"/evidence/{ev['id']}/file?sig=forged").status_code == 401
    assert client.get(f"/evidence/{ev['id']}/file", headers=login(MANAGER)).status_code == 200
    sample = client.get("/evidence/1/file", headers=login(CIL))          # seeded record, no real file
    assert sample.status_code == 200 and sample.headers["content-type"] == "image/png"
    listed = client.get("/evidence", params={"ids": f"{ev['id']},1"}, headers=login(MANAGER)).json()
    assert ev["id"] in {e["id"] for e in listed}


# ---------------------------------------------------------------- before / after closure

def _capa_with_before_photo(client, login, mine, scene, severity="high"):
    before = upload(client, login, make_photo(scene), mine).json()
    inspection = client.post("/inspections", json={"mine_id": mine["id"], "lat": mine["lat"], "lng": mine["lng"]},
                             headers=login(OFFICER)).json()
    finding = client.post(f"/inspections/{inspection['id']}/findings",
                          json={"category": "roof", "description": "Loose roof at junction", "severity": severity,
                                "photo_evidence_id": before["id"]}, headers=login(OFFICER)).json()
    return finding["capa_id"], before


def close(client, login, capa_id, evidence_id=None, phone=OFFICER):
    return client.post(f"/capa/{capa_id}/request-closure", json={"evidence_id": evidence_id, "note": "Fixed"},
                       headers=login(phone))


def test_high_severity_needs_after_photo(client, login, moonidih):
    capa_id, _ = _capa_with_before_photo(client, login, moonidih, 201)
    r = close(client, login, capa_id)
    assert r.status_code == 422 and "after-photo is required" in r.json()["detail"]


def test_fake_fix_is_rejected_automatically(client, login, moonidih):
    capa_id, before = _capa_with_before_photo(client, login, moonidih, 202)
    old = make_photo(202)                                   # the before-photo again, from 412 m away
    after = upload(client, login, old, moonidih, dlat=0.0037).json()
    capa = close(client, login, capa_id, after["id"]).json()
    assert capa["status"] == "rejected"
    failures = {c["name"]: c["detail"] for c in capa["closure_checks"] if not c["passed"]}
    assert "Same location" in failures and failures["Same location"].startswith("411 m from the before-photo")
    assert "Fresh photo (not reused)" in failures
    assert capa["before_photo"]["id"] == before["id"] and capa["after_photo"]["id"] == after["id"]


def test_genuine_fix_goes_to_review_then_closes(client, login, moonidih):
    capa_id, _ = _capa_with_before_photo(client, login, moonidih, 203)
    after = upload(client, login, make_photo(903), moonidih, dlat=0.00008).json()
    capa = close(client, login, capa_id, after["id"]).json()
    assert capa["status"] == "in_review", capa["closure_checks"]
    assert all(c["passed"] for c in capa["closure_checks"]) and capa["closure_score"] == 100
    assert {c["name"] for c in capa["closure_checks"]} == {
        "Same location", "Fresh photo (not reused)", "Taken after the problem was reported", "Trust score"}
    approved = client.post("/approvals", json={"entity": "capa", "entity_id": capa_id, "decision": "approve"},
                           headers=login(GM))
    assert approved.status_code == 201
    assert client.get(f"/capa/{capa_id}", headers=login(MANAGER)).json()["status"] == "closed"


def test_after_photo_older_than_finding_fails(client, login, moonidih):
    capa_id, _ = _capa_with_before_photo(client, login, moonidih, 204)
    earlier = now_utc() - timedelta(hours=2)
    after = upload(client, login, make_photo(904, taken_utc=earlier), moonidih, taken=earlier, dlat=0.00005).json()
    capa = close(client, login, capa_id, after["id"]).json()
    assert capa["status"] == "rejected"
    assert "Taken after the problem was reported" in {c["name"] for c in capa["closure_checks"] if not c["passed"]}


def test_ai_hazard_check_is_used_when_available(client, login, moonidih, monkeypatch):
    calls = []
    module = types.ModuleType("app.ai.photo_check")

    def verify_hazard_gone(before_path, after_path, finding_text):
        calls.append((before_path, after_path, finding_text))
        return {"hazard_gone": False, "confidence": 0.8, "explanation": "Crack still visible."}

    module.verify_hazard_gone = verify_hazard_gone
    monkeypatch.setitem(sys.modules, "app.ai.photo_check", module)
    capa_id, _ = _capa_with_before_photo(client, login, moonidih, 205)
    after = upload(client, login, make_photo(905), moonidih, dlat=0.00005).json()
    capa = close(client, login, capa_id, after["id"]).json()
    assert calls and calls[0][2] == "Loose roof at junction"
    ai = next(c for c in capa["closure_checks"] if c["name"].startswith("AI"))
    assert ai["passed"] is False and ai["detail"] == "Crack still visible."
    assert capa["status"] == "rejected"
