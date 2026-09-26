"""Speak-to-report: audio -> transcript (Whisper, offline) -> structured field report.

- Speech to text: faster-whisper "small" model running on this computer (no API key, audio never leaves the
  server). Model files: app/ai/models/whisper (downloaded once, git-ignored). Supports English, Hindi, Bengali
  and mixed Hinglish; Odia is not in Whisper, so it is auto-detected.
- Structuring: keyword rules in English, Hindi (Devanagari) and romanised Hindi pick the report type, category,
  severity and place. The worker sees and can correct every field before submitting.
"""
from __future__ import annotations

import io
import logging
import os
import re
import threading
import time
from pathlib import Path

log = logging.getLogger(__name__)

MODEL_NAME = os.getenv("WHISPER_MODEL", "small")
MODEL_DIR = Path(__file__).resolve().parent / "models" / "whisper"
WHISPER_LANGUAGES = {"en", "hi", "bn"}          # app languages Whisper knows; "or" (Odia) -> auto-detect

_model = None
_lock = threading.Lock()


class VoiceUnavailable(Exception):
    pass


def _get_model():
    global _model
    with _lock:
        if _model is None:
            try:
                from faster_whisper import WhisperModel
            except ImportError as exc:
                raise VoiceUnavailable("Speech-to-text is not installed (pip install faster-whisper).") from exc
            _model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8", download_root=str(MODEL_DIR))
            log.info("Whisper '%s' model loaded", MODEL_NAME)
        return _model


def warm_up() -> None:
    try:
        _get_model()
    except Exception as exc:  # noqa: BLE001 - voice then answers 503 with the reason
        log.warning("Voice model not ready: %s", exc)


def transcribe(audio: bytes, language: str | None) -> dict:
    model = _get_model()
    lang = language if language in WHISPER_LANGUAGES else None
    started = time.perf_counter()
    try:
        segments, info = model.transcribe(io.BytesIO(audio), language=lang, beam_size=1, vad_filter=True,
                                          initial_prompt="Coal mine safety report: roof, conveyor, dumper, gas, fire.")
        text = " ".join(segment.text.strip() for segment in segments).strip()
    except Exception as exc:  # noqa: BLE001 - unreadable / unsupported audio
        raise ValueError(f"Could not read the recording: {exc}") from exc
    return {"transcript": text, "language": info.language, "language_probability": round(info.language_probability, 2),
            "audio_seconds": round(info.duration, 1), "seconds": round(time.perf_counter() - started, 1)}


# ---------------------------------------------------------------- transcript -> report fields
_TYPES = [  # checked in order: the first match wins
    ("incident", r"injur|hurt|accident|died|dead|fatal|bleed|fracture|hospital|घायल|चोट|दुर्घटना|हादसा|मौत|"
                 r"ghayal|chot|durghatna|hadsa|আহত|দুর্ঘটনা"),
    ("near_miss", r"near miss|almost|narrowly|nearly|missed (him|me|us)|बाल[- ]बाल|बच गया|बच गए|bal bal|bach gay|"
                  r"অল্পের জন্য"),
    ("unsafe_act", r"not wearing|without (a )?(helmet|mask|boots|belt)|no helmet|smoking|drunk|sleeping|bypass|"
                   r"बिना (हेलमेट|मास्क|जूते)|हेलमेट नहीं|बीड़ी|सिगरेट|नशे|bina helmet|helmet nahi|beedi"),
]
_CATEGORIES = [
    ("fire", r"fire|smoke|burn|flame|आग|धुआं|धुंआ|जल रहा|aag|dhuan|আগুন|ধোঁয়া"),
    ("roof", r"roof|crack|side fall|overhang|loose (stone|coal|rock)|strata|छत|दरार|चट्टान|chhat|chat |darar|ছাদ|ফাটল"),
    ("conveyor", r"conveyor|belt|कन्वेयर|बेल्ट|kanveyar|কনভেয়ার"),
    ("electrical", r"electric|cable|wire|shock|spark|panel|बिजली|तार|करंट|केबल|bijli|taar|current|বিদ্যুৎ|তার"),
    ("water", r"water|flood|seepage|leak|pump|sump|पानी|बाढ़|रिसाव|paani|pani|जल भराव|পানি|জল"),
    ("explosives", r"explosive|blast|detonator|misfire|magazine|विस्फोटक|ब्लास्ट|visphotak|বিস্ফোরক"),
    ("machinery", r"dumper|shovel|machine|dozer|truck|brake|crane|drill|डम्पर|मशीन|ट्रक|ब्रेक|dumpar|machine|যন্ত্র"),
    ("haul_road", r"haul road|road|pothole|berm|सड़क|रोड|sadak|রাস্তা"),
    ("dust", r"dust|धूल|dhool|dhul|ধুলো"),
    ("ppe", r"helmet|mask|boots|gloves|safety belt|हेलमेट|मास्क|जूते|ppe|হেলমেট"),
]
_CRITICAL = (r"fire|gas|methane|trapped|collapse|explosion|died|dead|fatal|unconscious|आग|गैस|फंस|धंस|बेहोश|मौत|"
             r"aag|gas|phans|behosh|আগুন|গ্যাস")
_HIGH = r"crack|leak|broken|shock|spark|injur|flood|दरार|रिसाव|टूट|करंट|घायल|darar|toot|current|ফাটল"
_LOW = r"minor|small|little|थोड़ा|छोटा|thoda|chhota|সামান্য"
_PLACE = [
    r"(?:near|beside|behind|next to)\s+((?:the\s+)?(?:[A-Za-z]+\s+){0,3}(?:no\.?\s*)?\d+[A-Za-z]?)",  # near conveyor 3
    r"(?:near|beside|behind|next to)\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+){0,2})",                  # near the crusher
    r"(?:at|in|on)\s+(?:the\s+)?((?:[A-Za-z]+\s+){0,2}(?:no\.?\s*)?\d+[A-Za-z]?)",                  # at level 2
    r"(?:at|in|on)\s+the\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)",                                             # at the coal yard
    r"((?:\S+\s+){0,2}\S+)\s+के\s+(?:पास|नज़दीक|नजदीक|सामने|पीछे)",                                   # कन्वेयर 3 के पास
    r"((?:\w+\s+){0,2}\w+)\s+ke\s+(?:paas|pass|pas|samne|piche)",                                   # conveyor 3 ke paas
]
_FILLER = {"है", "हैं", "था", "थी", "रहा", "रही", "में", "और", "की", "का", "के", "hai", "tha", "mein", "aur", "ki", "ka"}


def structure(text: str) -> dict:
    t = text.lower()
    report_type = next((name for name, words in _TYPES if re.search(words, t)), "unsafe_condition")
    category = next((name for name, words in _CATEGORIES if re.search(words, t)), "other")
    severity = ("critical" if re.search(_CRITICAL, t) else "high" if re.search(_HIGH, t)
                else "low" if re.search(_LOW, t) else "medium")
    if report_type == "incident" and severity in ("low", "medium"):
        severity = "high"
    place = next((m.group(1).strip() for p in _PLACE for m in [re.search(p, text, re.I)] if m), "")
    words = place.split()
    while words and words[0].lower() in _FILLER:          # "है पंप हाउस" -> "पंप हाउस"
        words.pop(0)
    return {"type": report_type, "category": category, "severity": severity,
            "hazard": text.strip(), "location_text": " ".join(words)[:200]}
