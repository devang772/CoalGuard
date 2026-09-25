import json
import os
import re
from typing import Any

import httpx
from dotenv import load_dotenv


load_dotenv()


LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "").rstrip("/")
AI_TIMEOUT_SECONDS = int(os.getenv("AI_TIMEOUT_SECONDS", "40"))


class AIUnavailable(Exception):
    pass


def _extract_json(text: str) -> dict:
    """
    Extract JSON from an LLM response.

    Handles:
    - pure JSON
    - ```json ... ```
    - accidental surrounding text
    """

    text = text.strip()

    # Remove markdown code fences
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find a JSON object in the response
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)

    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError("LLM did not return valid JSON")


def llm_json(
    system: str,
    user: str,
    schema_hint: str,
    timeout: int | None = None,
) -> dict[str, Any]:
    """
    Send a request to an OpenAI-compatible chat completion endpoint
    and return parsed JSON.
    """

    if not LLM_API_KEY or not LLM_MODEL or not LLM_BASE_URL:
        raise AIUnavailable("LLM configuration missing")

    timeout = timeout or AI_TIMEOUT_SECONDS

    url = f"{LLM_BASE_URL}/chat/completions"

    payload = {
        "model": LLM_MODEL,
        "temperature": 0,
        "messages": [
            {
                "role": "system",
                "content": system,
            },
            {
                "role": "user",
                "content": (
                    f"{user}\n\n"
                    "Return JSON only.\n"
                    f"Required JSON structure:\n{schema_hint}"
                ),
            },
        ],
    }

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(
                url,
                json=payload,
                headers=headers,
            )

        response.raise_for_status()

        data = response.json()

        content = data["choices"][0]["message"]["content"]

        try:
            return _extract_json(content)

        except ValueError:
            # One retry
            retry_payload = {
                **payload,
                "messages": [
                    *payload["messages"],
                    {
                        "role": "user",
                        "content": (
                            "Your previous response was not valid JSON. "
                            "Return ONLY valid JSON matching the required schema."
                        ),
                    },
                ],
            }

            with httpx.Client(timeout=timeout) as client:
                retry_response = client.post(
                    url,
                    json=retry_payload,
                    headers=headers,
                )

            retry_response.raise_for_status()

            retry_data = retry_response.json()

            retry_content = (
                retry_data["choices"][0]["message"]["content"]
            )

            return _extract_json(retry_content)

    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        raise AIUnavailable(str(exc)) from exc
