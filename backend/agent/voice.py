"""
Voice transcription for Hunch:
1. Google Cloud Speech-to-Text API (v1 / speech.googleapis.com) with automatic language detection:
   Indian English (en-IN), Hindi (hi-IN), Punjabi (pa-Guru-IN).
   Free tier: 60 minutes/month free on GCP hunch-food-5921.
2. Gemini API fallback using GEMINI_API_KEY (gemini-3.5-flash-lite).
"""

import base64
import io
import logging
import subprocess
import httpx
from django.conf import settings

log = logging.getLogger('hunch')

GOOGLE_STT_URL = "https://speech.googleapis.com/v1/speech:recognize"
GCP_PROJECT = "hunch-food-5921"


def get_google_token() -> str | None:
    """Get Google Cloud OAuth2 token from Cloud Run metadata server or local gcloud."""
    # 1. Cloud Run / Compute Engine metadata server
    try:
        r = httpx.get(
            'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
            headers={'Metadata-Flavor': 'Google'},
            timeout=1.0,
        )
        if r.status_code == 200:
            return r.json().get('access_token')
    except Exception:
        pass

    # 2. Local gcloud CLI fallback
    try:
        return subprocess.check_output(
            ['gcloud', 'auth', 'print-access-token'],
            timeout=3.0,
        ).decode().strip()
    except Exception:
        pass

    return None


def transcribe_google_stt(audio_bytes: bytes, mime_type: str) -> str:
    """Transcribe using Google Cloud Speech-to-Text with language auto-detect."""
    token = get_google_token()
    if not token:
        raise RuntimeError("No Google Cloud auth token available.")

    clean_mime = mime_type.lower().split(';')[0].strip()
    encoding = None
    sample_rate = None

    if 'webm' in clean_mime:
        encoding = 'WEBM_OPUS'
        sample_rate = 48000
    elif 'ogg' in clean_mime:
        encoding = 'OGG_OPUS'
        sample_rate = 48000
    elif 'mp3' in clean_mime or 'mpeg' in clean_mime:
        encoding = 'MP3'
        sample_rate = 16000

    config: dict = {
        'languageCode': 'en-IN',
        'alternativeLanguageCodes': ['hi-IN', 'pa-Guru-IN'],
        'model': 'default',
    }
    if encoding:
        config['encoding'] = encoding
    if sample_rate:
        config['sampleRateHertz'] = sample_rate

    payload = {
        'config': config,
        'audio': {
            'content': base64.b64encode(audio_bytes).decode('utf-8'),
        },
    }
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Goog-User-Project': GCP_PROJECT,
        'Content-Type': 'application/json',
    }

    resp = httpx.post(GOOGLE_STT_URL, headers=headers, json=payload, timeout=12.0)
    if resp.status_code != 200:
        raise RuntimeError(f"Google STT returned {resp.status_code}: {resp.text}")

    data = resp.json()
    results = data.get('results', [])
    transcripts = []
    for r in results:
        alts = r.get('alternatives', [])
        if alts and alts[0].get('transcript'):
            transcripts.append(alts[0]['transcript'])

    return ' '.join(transcripts).strip()


def transcribe_gemini(audio_bytes: bytes, mime_type: str) -> str:
    """Transcribe using Gemini API with language understanding."""
    import truststore
    truststore.inject_into_ssl()
    from google import genai
    from google.genai import types

    key = getattr(settings, 'GEMINI_API_KEY', '')
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set.")

    client = genai.Client(
        api_key=key,
        http_options=types.HttpOptions(
            client_args={'verify': False},
            async_client_args={'verify': False},
        ),
    )
    clean_mime = mime_type.lower().split(';')[0].strip() or 'audio/webm'
    part = types.Part.from_bytes(data=audio_bytes, mime_type=clean_mime)
    model_name = getattr(settings, 'GEMINI_TRANSCRIBE_MODEL', 'gemini-3.5-flash-lite')
    res = client.models.generate_content(
        model=model_name,
        contents=[
            part,
            "Transcribe this audio exactly as spoken in English, Hindi, or Punjabi (romanized or in the spoken language). Return only the exact transcription text, nothing else.",
        ],
    )
    return (res.text or '').strip()


def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """
    Main transcription entry point:
    1. Tries Google Cloud Speech-to-Text with auto-detection for Indian English / Hindi / Punjabi.
    2. Falls back to Gemini.
    """
    if not audio_bytes or len(audio_bytes) < 400:
        return ""

    # 1. Try Google Cloud Speech-to-Text
    try:
        text = transcribe_google_stt(audio_bytes, mime_type)
        if text:
            return text
    except Exception as e:
        log.warning("Google STT failed, falling back to Gemini: %s", e)

    # 2. Fallback to Gemini
    try:
        return transcribe_gemini(audio_bytes, mime_type)
    except Exception as e:
        log.error("Gemini transcription failed: %s", e)
        raise RuntimeError(f"Transcription failed: {e}") from e
