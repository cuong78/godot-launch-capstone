"""Deterministic CodeBERT embedding for an immutable Godot source bundle."""

import os
import threading
from pathlib import Path

MODEL_NAME = os.getenv("CODE_EMBEDDING_MODEL", "microsoft/codebert-base")
MODEL_REVISION = os.getenv(
    "CODE_EMBEDDING_MODEL_REVISION",
    "3b0952feddeffad0063f274080e3c23d75e7eb39",
)
MAX_FILES = max(1, int(os.getenv("CODE_EMBEDDING_MAX_FILES", "48")))
MAX_FILE_CHARS = max(500, int(os.getenv("CODE_EMBEDDING_MAX_FILE_CHARS", "12000")))
MAX_CHUNKS = max(1, int(os.getenv("CODE_EMBEDDING_MAX_CHUNKS", "64")))
CHUNK_CHARS = max(500, int(os.getenv("CODE_EMBEDDING_CHUNK_CHARS", "3000")))

INCLUDED_NAMES = {"project.godot"}
INCLUDED_EXTENSIONS = {
    ".gd", ".cs", ".tscn", ".tres", ".cfg", ".json", ".shader", ".gdshader"
}
IGNORED_DIRS = {".git", ".godot", ".import", "node_modules", "__pycache__", "build", "dist"}

_model = None
_tokenizer = None
_resolved_revision = None
_lock = threading.Lock()


def _load_model():
    global _model, _tokenizer, _resolved_revision
    if _model is not None:
        return
    with _lock:
        if _model is not None:
            return
        from transformers import AutoModel, AutoTokenizer

        _tokenizer = AutoTokenizer.from_pretrained(
            MODEL_NAME,
            revision=MODEL_REVISION,
            clean_up_tokenization_spaces=False,
        )
        _model = AutoModel.from_pretrained(MODEL_NAME, revision=MODEL_REVISION)
        _model.eval()
        _resolved_revision = getattr(_model.config, "_commit_hash", None) or MODEL_REVISION


def embed_directory(tmp_dir: str) -> dict:
    """Return one normalized 768-dim vector plus reproducibility metadata."""
    root = Path(tmp_dir)
    samples, sampled_files = _read_samples(root)
    if not samples:
        raise ValueError("Source snapshot không có file Godot/code phù hợp để tạo embedding")

    _load_model()
    import torch

    chunk_vectors = []
    with torch.no_grad():
        for relative_path, content in samples:
            text = f"// FILE: {relative_path}\n{content}"
            inputs = _tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
            )
            output = _model(**inputs).last_hidden_state
            mask = inputs["attention_mask"].unsqueeze(-1).expand(output.size()).float()
            pooled = (output * mask).sum(1) / mask.sum(1).clamp(min=1e-9)
            chunk_vectors.append(pooled.squeeze(0))

        combined = torch.stack(chunk_vectors).mean(dim=0)
        combined = combined / combined.norm(p=2).clamp(min=1e-12)

    vector = combined.cpu().tolist()
    return {
        "embedding": [float(value) for value in vector],
        "modelName": MODEL_NAME,
        "modelVersion": str(_resolved_revision),
        "dimensions": len(vector),
        "sampledFiles": sampled_files,
        "sampledChunks": len(chunk_vectors),
    }


def _read_samples(root: Path) -> tuple[list[tuple[str, str]], int]:
    candidates = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if any(part in IGNORED_DIRS for part in relative.parts):
            continue
        if path.name not in INCLUDED_NAMES and path.suffix.lower() not in INCLUDED_EXTENSIONS:
            continue
        candidates.append(path)

    # Source scripts carry more semantic signal than scene/config metadata.
    # Stable order keeps the same snapshot/model reproducible.
    priority = {
        ".gd": 1, ".cs": 1,
        ".shader": 2, ".gdshader": 2,
        ".tscn": 3, ".tres": 3,
        ".cfg": 4, ".json": 4,
    }
    candidates.sort(key=lambda path: (
        0 if path.name == "project.godot" else priority.get(path.suffix.lower(), 9),
        str(path.relative_to(root)).replace("\\", "/").lower(),
    ))
    samples = []
    sampled_files = 0
    for path in candidates[:MAX_FILES]:
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")[:MAX_FILE_CHARS].strip()
        except OSError:
            continue
        if content:
            relative = str(path.relative_to(root)).replace("\\", "/")
            sampled_files += 1
            chunks = [content[index:index + CHUNK_CHARS]
                      for index in range(0, len(content), CHUNK_CHARS)]
            for part, chunk in enumerate(chunks, start=1):
                samples.append((f"{relative}#part-{part}", chunk))
                if len(samples) >= MAX_CHUNKS:
                    return samples, sampled_files
    return samples, sampled_files
