"""Speak-to-report: transcript -> report fields, and the /ai/voice endpoint's error handling.
(Transcription itself needs the ~460 MB Whisper model, so it is checked by hand, not in the test run.)"""
import pytest

from app.ai.voice import structure


@pytest.mark.parametrize("text, expected", [
    ("There is a big crack in the roof near conveyor 3. Loose stones are falling.",
     ("unsafe_condition", "roof", "high", "conveyor 3")),
    ("A worker was injured when the dumper brake failed on the haul road near the crusher.",
     ("incident", "machinery", "high", "crusher")),
    ("I saw a helper working without a helmet at the coal yard.", ("unsafe_act", "ppe", "medium", "coal yard")),
    ("कन्वेयर 3 के पास छत में बड़ी दरार है", ("unsafe_condition", "roof", "high", "कन्वेयर 3")),
    ("Conveyor 3 ke paas roof mein crack hai", ("unsafe_condition", "roof", "high", "Conveyor 3")),
    ("गैस की बदबू आ रही है पंप हाउस के पास", ("unsafe_condition", "other", "critical", "पंप हाउस")),
    ("डम्पर का ब्रेक फेल हो गया, एक मजदूर घायल हो गया", ("incident", "machinery", "high", "")),
])
def test_transcript_becomes_report_fields(text, expected):
    r = structure(text)
    assert (r["type"], r["category"], r["severity"], r["location_text"]) == expected
    assert r["hazard"] == text


def test_voice_endpoint_rejects_bad_recordings(client, login):
    headers = login("9000000009")
    empty = client.post("/ai/voice", files={"audio": ("v.webm", b"", "audio/webm")}, data={"language": "hi"}, headers=headers)
    assert empty.status_code == 422 and "empty" in empty.json()["message"]
    junk = client.post("/ai/voice", files={"audio": ("v.webm", b"not audio at all", "audio/webm")},
                       data={"language": "hi"}, headers=headers)
    assert junk.status_code in (422, 503)
    assert client.post("/ai/voice", files={"audio": ("v.webm", b"x", "audio/webm")}).status_code == 401
