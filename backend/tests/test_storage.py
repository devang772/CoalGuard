"""Storage switch: local folder vs Cloudinary (the two Cloudinary SDK calls are replaced by a fake cloud)."""
import io

import pytest
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import Evidence, OrgUnit
from app.services import storage
from tests.photos import iso_z, make_photo, now_utc

OFFICER, MANAGER = "9000000007", "9000000004"


@pytest.fixture(scope="module", autouse=True)
def _data(seeded_data):
    return seeded_data


@pytest.fixture
def fake_cloud(monkeypatch):
    """Cloudinary configured + a fake cloud that keeps uploaded bytes in memory."""
    files: dict[str, bytes] = {}
    calls = {"upload": [], "link": []}

    def upload(data, public_id, resource_type):
        calls["upload"].append((public_id, resource_type))
        files[public_id] = data
        return {"public_id": public_id, "format": "jpg" if resource_type == "image" else None,
                "resource_type": resource_type}

    def download_url(public_id, fmt, resource_type, expires_at):
        calls["link"].append((public_id, fmt, resource_type, expires_at))
        return f"https://api.cloudinary.com/v1_1/demo/{resource_type}/download?public_id={public_id}&expires_at={expires_at}"

    class FakeResponse(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    def urlopen(url, timeout=None):
        public_id = url.split("public_id=")[1].split("&")[0]
        return FakeResponse(files[public_id])

    monkeypatch.setattr(settings, "storage_backend", "cloudinary")
    monkeypatch.setattr(settings, "cloudinary_url", "cloudinary://123456:secret-abc@demo-cloud")
    monkeypatch.setattr(storage, "_cloud_upload", upload)
    monkeypatch.setattr(storage, "_cloud_download_url", download_url)
    monkeypatch.setattr(storage.urllib.request, "urlopen", urlopen)
    return {"files": files, "calls": calls}


@pytest.fixture(scope="module")
def mine():
    with SessionLocal() as db:
        m = db.scalar(select(OrgUnit).where(OrgUnit.name == "Moonidih UG"))
        return {"id": m.id, "lat": m.center_lat, "lng": m.center_lng}


def upload(client, login, mine, scene, dlat=0.0):
    form = {"mine_id": str(mine["id"]), "lat": str(mine["lat"] + dlat), "lng": str(mine["lng"]), "accuracy": "8",
            "device_time": iso_z(now_utc())}
    return client.post("/evidence", data=form, files={"file": ("p.jpg", make_photo(scene), "image/jpeg")},
                       headers={"Authorization": login(OFFICER)["Authorization"]})


def test_photo_goes_to_cloudinary_privately(client, login, mine, fake_cloud):
    r = upload(client, login, mine, 501)
    assert r.status_code == 201, r.text
    ev = r.json()
    assert ev["stored_in"] == "cloudinary" and ev["trust_score"] == 100          # Satya Proof ran before upload
    public_id, resource_type = fake_cloud["calls"]["upload"][0]
    assert resource_type == "image" and public_id.startswith("khanan-netra/evidence/")
    with SessionLocal() as db:
        ref = db.get(Evidence, ev["id"]).file_path
    assert ref == f"cloudinary:image:{public_id}.jpg"

    # our signed link checks access, then redirects to a short-lived Cloudinary link
    r = client.get(ev["url"], follow_redirects=False)
    assert r.status_code == 307 and r.headers["location"].startswith("https://api.cloudinary.com/")
    assert fake_cloud["calls"]["link"][-1][:3] == (public_id, "jpg", "image")
    assert client.get(f"/evidence/{ev['id']}/file?sig=forged", follow_redirects=False).status_code == 401


def test_cloud_photos_still_work_for_closure_and_ai(client, login, mine, fake_cloud, monkeypatch):
    import sys
    import types
    seen = {}

    def verify_hazard_gone(before_path, after_path, finding_text):
        with open(before_path, "rb") as b, open(after_path, "rb") as a:
            seen["sizes"] = (len(b.read()), len(a.read()))
        return {"hazard_gone": True, "confidence": 0.9, "explanation": "Roof supported."}

    module = types.ModuleType("app.ai.photo_check")
    module.verify_hazard_gone = verify_hazard_gone
    monkeypatch.setitem(sys.modules, "app.ai.photo_check", module)
    headers = login(OFFICER)
    before = upload(client, login, mine, 502).json()
    inspection = client.post("/inspections", json={"mine_id": mine["id"]}, headers=headers).json()
    finding = client.post(f"/inspections/{inspection['id']}/findings",
                          json={"category": "roof", "description": "Loose roof", "severity": "high",
                                "photo_evidence_id": before["id"], "lat": mine["lat"], "lng": mine["lng"]},
                          headers=headers).json()
    after = upload(client, login, mine, 503, dlat=0.00005).json()
    capa = client.post(f"/capa/{finding['capa_id']}/request-closure", json={"evidence_id": after["id"]},
                       headers=headers).json()
    assert capa["status"] == "in_review", capa["closure_checks"]
    assert any(c["name"].startswith("AI") and c["passed"] for c in capa["closure_checks"])
    assert seen["sizes"][0] > 1000 and seen["sizes"][1] > 1000        # the AI got real copies of both photos


def test_old_local_files_keep_working_after_switch(client, login, mine, fake_cloud, monkeypatch):
    monkeypatch.setattr(settings, "storage_backend", "local")
    local = upload(client, login, mine, 504).json()
    assert local["stored_in"] == "local"
    monkeypatch.setattr(settings, "storage_backend", "cloudinary")
    r = client.get(local["url"])
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"


def test_cloud_failure_is_a_clear_503_and_saves_nothing(client, login, mine, fake_cloud, monkeypatch):
    def broken(data, public_id, resource_type):
        raise ConnectionError("no internet")

    monkeypatch.setattr(storage, "_cloud_upload", broken)
    with SessionLocal() as db:
        before = db.query(Evidence).count()
    r = upload(client, login, mine, 505)
    assert r.status_code == 503 and "not reachable" in r.json()["detail"]
    with SessionLocal() as db:
        assert db.query(Evidence).count() == before


def test_configuration_checks(monkeypatch):
    monkeypatch.setattr(settings, "storage_backend", "cloudinary")
    monkeypatch.setattr(settings, "cloudinary_url", None)
    monkeypatch.setattr(settings, "cloudinary_cloud_name", None)
    with pytest.raises(storage.StorageError, match="needs CLOUDINARY_URL"):
        storage.check_configuration()
    monkeypatch.setattr(settings, "cloudinary_url", "https://wrong")
    with pytest.raises(storage.StorageError, match="must look like"):
        storage.check_configuration()
    monkeypatch.setattr(settings, "cloudinary_url", "cloudinary://key:secret@my-cloud")
    assert "my-cloud" in storage.check_configuration()
    monkeypatch.setattr(settings, "storage_backend", "s3")
    with pytest.raises(storage.StorageError, match="Unknown STORAGE_BACKEND"):
        storage.check_configuration()


def test_reports_will_be_raw_files(fake_cloud):
    ref = storage.save(b"%PDF-1.4 test", "pdf", kind="reports")
    assert ref.startswith("cloudinary:raw:khanan-netra/reports/") and ref.endswith(".pdf")
    assert fake_cloud["calls"]["upload"][-1][1] == "raw"
    assert storage.download_url(ref).startswith("https://api.cloudinary.com/v1_1/demo/raw/")
