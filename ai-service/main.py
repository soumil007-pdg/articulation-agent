from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import requests
import numpy as np
import soundfile as sf
import tempfile
import os
from pydantic import BaseModel
from typing import List, Dict, Optional

app = FastAPI(title="Articulation AI Service")

device = "cpu"

# Transcription is delegated to Groq's hosted Whisper API rather than running
# Whisper locally — the local model + torch requires more RAM than fits on
# constrained hosting (e.g. 512MB free tiers). Prosody/filler/pause analysis
# below still runs locally on the raw audio and Groq's word timestamps.
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_WHISPER_MODEL = os.environ.get("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")
GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
if GROQ_API_KEY:
    print(f"Groq transcription configured (model: {GROQ_WHISPER_MODEL}).")
else:
    print("Warning: GROQ_API_KEY not set. Transcription will fail until it is configured.")


def transcribe_with_groq(tmp_path: str, context: Optional[str]) -> dict:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not configured on ai-service")
    with open(tmp_path, "rb") as f:
        files = {"file": (os.path.basename(tmp_path), f)}
        data = {
            "model": GROQ_WHISPER_MODEL,
            "response_format": "verbose_json",
            "timestamp_granularities[]": "word",
        }
        if context:
            data["prompt"] = context[:300]
        resp = requests.post(
            GROQ_TRANSCRIBE_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files=files,
            data=data,
            timeout=120,
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Groq transcription failed ({resp.status_code}): {resp.text[:300]}")
    return resp.json()

# SpeechBrain emotion classifier (audio-based, 4 classes — optional, memory-heavy).
# Disabled by default so the service fits in constrained hosting (e.g. 512MB).
# Set ENABLE_EMOTION_MODEL=1 to turn it on.
emotion_model = None
if os.environ.get("ENABLE_EMOTION_MODEL") == "1":
    try:
        from speechbrain.inference import EncoderClassifier
        emotion_model = EncoderClassifier.from_hparams(
            source="speechbrain/emotion-recognition-wav2vec2-IEMOCAP",
            savedir="pretrained_models/emotion"
        )
        print("SpeechBrain emotion model loaded.")
    except Exception as e:
        print(f"Warning: SpeechBrain emotion model not loaded ({e}). Audio emotion detection disabled.")
else:
    print("SpeechBrain emotion model disabled (set ENABLE_EMOTION_MODEL=1 to enable).")

# GoEmotion text classifier (28 emotions from word choices — optional, memory-heavy).
# Disabled by default; set ENABLE_GOEMOTIONS=1 to turn it on.
goemotions_model = None
if os.environ.get("ENABLE_GOEMOTIONS") == "1":
    try:
        from transformers import pipeline as hf_pipeline
        print("Loading GoEmotion model (monologg/bert-base-cased-goemotions-original)...")
        print("  Note: First run downloads ~400MB — cached after that.")
        goemotions_model = hf_pipeline(
            "text-classification",
            model="monologg/bert-base-cased-goemotions-original",
            top_k=3,
        )
        print("GoEmotion model loaded.")
    except Exception as e:
        print(f"Warning: GoEmotion model not loaded ({e}). Text emotion detection disabled.")
else:
    print("GoEmotion model disabled (set ENABLE_GOEMOTIONS=1 to enable).")

# librosa for prosody analysis (pitch, energy, per-sentence WPM)
_librosa_available = False
try:
    import librosa as _librosa
    _librosa_available = True
    print("librosa loaded for prosody analysis.")
except ImportError:
    print("Warning: librosa not installed. Prosody analysis disabled. Run: pip install librosa")

FILLER_WORDS = {
    "um", "uh", "like", "er", "ah", "hmm", "right", "so",
    "basically", "literally", "actually", "you know", "i mean",
    "kind of", "sort of"
}


class TranscriptionResponse(BaseModel):
    transcript: str
    words: List[Dict]
    pauses: List[Dict]
    filler_words: List[Dict]
    speech_metrics: Dict
    emotion: Optional[str] = None
    text_emotion: Optional[Dict] = None
    prosody: Optional[Dict] = None


def analyze_prosody(tmp_path: str, word_segments: list, pauses: list, duration_seconds: float) -> Optional[Dict]:
    if not _librosa_available:
        return None
    try:
        import librosa
        y, sr = librosa.load(tmp_path, sr=16000)

        # ── Pitch (YIN algorithm) ─────────────────────────────────────────────
        hop = 256
        f0 = librosa.yin(y, fmin=80, fmax=400, sr=sr, hop_length=hop)
        voiced = f0[f0 > 50]  # filter out unvoiced frames
        pitch_mean = float(np.mean(voiced)) if len(voiced) > 0 else 0.0
        pitch_std = float(np.std(voiced)) if len(voiced) > 0 else 0.0
        pitch_range = float(np.max(voiced) - np.min(voiced)) if len(voiced) > 0 else 0.0

        # ── Energy (RMS per 0.5s window) ─────────────────────────────────────
        rms = librosa.feature.rms(y=y, hop_length=512)[0]
        max_rms = np.max(rms) if np.max(rms) > 0 else 1.0
        rms_norm = rms / max_rms

        window_frames = max(1, sr // 512 // 2)  # ~0.5s in RMS frames
        energy_values = []
        for i in range(0, len(rms_norm), window_frames):
            chunk = rms_norm[i:i + window_frames]
            energy_values.append(round(float(np.mean(chunk)), 3))
        energy_values = energy_values[:120]  # cap at 60s

        # Energy profile: compare first 60% vs last 20%
        n = len(energy_values)
        if n >= 5:
            first = energy_values[:int(n * 0.6)]
            mid = energy_values[int(n * 0.4):int(n * 0.6)]
            last = energy_values[int(n * 0.8):]
            avg_first = float(np.mean(first))
            avg_last = float(np.mean(last)) if last else avg_first
            avg_mid = float(np.mean(mid)) if mid else avg_first

            if avg_last < avg_first * 0.75:
                energy_profile = "drops_at_end"
            elif avg_mid > avg_first * 1.3:
                energy_profile = "spikes_mid"
            elif float(np.std(energy_values)) < 0.08:
                energy_profile = "flat"
            else:
                energy_profile = "consistent"
        else:
            energy_profile = "flat"

        # ── Per-sentence WPM ──────────────────────────────────────────────────
        sentence_wpm = []
        if word_segments:
            sentences = []
            cur = []
            for w in word_segments:
                cur.append(w)
                if any(ch in w["word"] for ch in ".!?"):
                    sentences.append(cur)
                    cur = []
            if cur:
                sentences.append(cur)

            for sent in sentences:
                if len(sent) >= 3:
                    dur = sent[-1]["end"] - sent[0]["start"]
                    wpm = round((len(sent) / dur) * 60) if dur > 0 else 0
                    text = " ".join(w["word"] for w in sent)[:70]
                    sentence_wpm.append({"sentence": text, "wpm": wpm})

        # ── Enrich pauses with the word that follows ──────────────────────────
        pauses_enriched = []
        for pause in pauses:
            enriched = dict(pause)
            # Find the word immediately after the pause
            after_time = pause["start"] + pause["duration"]
            for w in word_segments:
                if w["start"] >= after_time - 0.1:
                    enriched["before_word"] = w["word"]
                    break
            pauses_enriched.append(enriched)

        # ── Silence ratio ─────────────────────────────────────────────────────
        silence_ratio = round(float(np.mean(rms_norm < 0.05)), 3)

        return {
            "pitch_mean_hz": round(pitch_mean, 1),
            "pitch_std_hz": round(pitch_std, 1),
            "pitch_range_hz": round(pitch_range, 1),
            "energy_profile": energy_profile,
            "energy_values": energy_values,
            "sentence_wpm": sentence_wpm,
            "pauses_enriched": pauses_enriched,
            "silence_ratio": silence_ratio,
        }
    except Exception as e:
        print(f"Warning: Prosody analysis failed ({e})")
        return None


@app.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...), context: str = Form(None)):
    allowed_extensions = ('.wav', '.mp3', '.m4a', '.webm', '.ogg', '.flac', '.mp4')
    filename = (file.filename or "audio.webm").lower()
    suffix = os.path.splitext(filename)[1] or ".webm"

    if suffix not in allowed_extensions:
        raise HTTPException(400, detail=f"Unsupported format '{suffix}'. Allowed: {allowed_extensions}")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Transcribe via Groq's hosted Whisper API (verbatim, word-level
        # timestamps). The prompt primes the decoder with the topic the
        # speaker is addressing, markedly improving recognition of on-topic
        # vocabulary.
        try:
            result = transcribe_with_groq(tmp_path, context)
        except Exception as e:
            raise HTTPException(502, detail=f"Transcription failed: {e}")

        # Flatten word segments
        word_segments = []
        for w in result.get("words", []):
            word_segments.append({
                "word": w["word"].strip(),
                "start": round(w["start"], 2),
                "end": round(w["end"], 2),
                "probability": 1.0,
            })

        # Count filler words
        filler_counts: Dict[str, int] = {}
        for w in word_segments:
            clean = w["word"].lower().strip(".,!?\"'")
            if clean in FILLER_WORDS:
                filler_counts[clean] = filler_counts.get(clean, 0) + 1
        filler_word_list = [{"word": k, "count": v} for k, v in sorted(filler_counts.items(), key=lambda x: -x[1])]

        # Detect pauses (silence gaps > 0.5s between consecutive words)
        pauses = []
        for i in range(1, len(word_segments)):
            gap = word_segments[i]["start"] - word_segments[i - 1]["end"]
            if gap > 0.5:
                pauses.append({
                    "after_word": word_segments[i - 1]["word"],
                    "start": round(word_segments[i - 1]["end"], 2),
                    "duration": round(gap, 2),
                })

        # Compute speech metrics
        total_words = len(word_segments)
        duration_seconds = float(result.get("duration") or 0.0)
        if not duration_seconds and word_segments:
            duration_seconds = word_segments[-1]["end"]

        wpm = round((total_words / duration_seconds) * 60) if duration_seconds > 0 else 0
        total_fillers = sum(f["count"] for f in filler_word_list)

        speech_metrics = {
            "total_words": total_words,
            "duration_seconds": round(duration_seconds, 1),
            "words_per_minute": wpm,
            "total_filler_words": total_fillers,
            "total_pauses": len(pauses),
            "long_pauses": len([p for p in pauses if p["duration"] > 1.5]),
        }

        # ── SpeechBrain audio emotion (4-class: neutral/happy/sad/angry) ──────
        emotion = None
        if emotion_model is not None:
            try:
                import torch
                signal, _ = sf.read(tmp_path)
                signal_tensor = torch.tensor(signal, dtype=torch.float32).unsqueeze(0)
                _, _, _, text_lab = emotion_model.classify_batch(signal_tensor)
                emotion = text_lab[0]
            except Exception:
                pass

        # ── GoEmotion text emotion (28-class from word choices) ───────────────
        text_emotion = None
        transcript_text = result["text"].strip()
        if goemotions_model is not None and transcript_text:
            try:
                raw = goemotions_model(transcript_text[:512])
                # pipeline with top_k returns list of dicts for single input
                top3 = raw[0] if isinstance(raw[0], list) else raw
                text_emotion = {
                    "primary": top3[0]["label"],
                    "top3": [{"label": e["label"], "score": round(float(e["score"]), 3)} for e in top3[:3]],
                }
            except Exception as e:
                print(f"Warning: GoEmotion inference failed ({e})")

        # ── Prosody analysis (pitch, energy, per-sentence WPM) ────────────────
        prosody = analyze_prosody(tmp_path, word_segments, pauses, duration_seconds)

        return TranscriptionResponse(
            transcript=transcript_text,
            words=word_segments,
            pauses=pauses,
            filler_words=filler_word_list,
            speech_metrics=speech_metrics,
            emotion=emotion,
            text_emotion=text_emotion,
            prosody=prosody,
        )

    except Exception as e:
        raise HTTPException(500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/")
async def root():
    return {"status": "Articulation AI Service is running"}


@app.get("/health")
async def health():
    return {
        "whisper": "ready" if GROQ_API_KEY else "down",
        "whisper_model": GROQ_WHISPER_MODEL,
        "whisper_backend": "groq",
        "emotion": "ready" if emotion_model is not None else "disabled",
        "goemotions": "ready" if goemotions_model is not None else "disabled",
        "prosody": "ready" if _librosa_available else "disabled",
        "device": device,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
