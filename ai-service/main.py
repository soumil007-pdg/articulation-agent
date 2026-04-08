from fastapi import FastAPI, UploadFile, File, HTTPException
import whisper
import torch
import soundfile as sf
from speechbrain.inference import EncoderClassifier
import tempfile
import os
from pydantic import BaseModel
from typing import List, Dict, Optional

app = FastAPI(title="Articulation AI Service")

device = "cpu"

# Load Whisper model once at startup
print("Loading Whisper model (base)...")
whisper_model = whisper.load_model("base", device=device)
print("Whisper model loaded.")

# Emotion classifier (optional — gracefully disabled if unavailable)
emotion_model = None
try:
    emotion_model = EncoderClassifier.from_hparams(
        source="speechbrain/emotion-recognition-wav2vec2-IEMOCAP",
        savedir="pretrained_models/emotion"
    )
    print("Emotion model loaded.")
except Exception as e:
    print(f"Warning: Emotion model not loaded ({e}). Emotion detection disabled.")

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


@app.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...)):
    allowed_extensions = ('.wav', '.mp3', '.m4a', '.webm', '.ogg', '.flac', '.mp4')
    filename = (file.filename or "audio.webm").lower()
    suffix = os.path.splitext(filename)[1] or ".webm"

    if suffix not in allowed_extensions:
        raise HTTPException(400, detail=f"Unsupported format '{suffix}'. Allowed: {allowed_extensions}")

    tmp_path = None
    try:
        # Save uploaded audio to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Transcribe with Whisper (verbatim, word-level timestamps)
        result = whisper_model.transcribe(tmp_path, word_timestamps=True)

        # Flatten word segments from all segments
        word_segments = []
        for seg in result.get("segments", []):
            for w in seg.get("words", []):
                word_segments.append({
                    "word": w["word"].strip(),
                    "start": round(w["start"], 2),
                    "end": round(w["end"], 2),
                    "probability": round(w.get("probability", 1.0), 2),
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
        duration_seconds = 0.0
        if result.get("segments"):
            duration_seconds = result["segments"][-1]["end"]

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

        # Emotion detection (optional)
        emotion = None
        if emotion_model is not None:
            try:
                signal, _ = sf.read(tmp_path)
                signal_tensor = torch.tensor(signal, dtype=torch.float32).unsqueeze(0)
                _, _, _, text_lab = emotion_model.classify_batch(signal_tensor)
                emotion = text_lab[0]
            except Exception:
                pass

        return TranscriptionResponse(
            transcript=result["text"].strip(),
            words=word_segments,
            pauses=pauses,
            filler_words=filler_word_list,
            speech_metrics=speech_metrics,
            emotion=emotion,
        )

    except Exception as e:
        raise HTTPException(500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/")
async def root():
    return {"status": "Articulation AI Service is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
