"""Deterministic structural fingerprint for an immutable Godot source bundle.

This module intentionally does not use a mean-pooled CodeBERT project vector.
Vanilla CodeBERT hidden states are highly anisotropic: unrelated projects can
have cosine similarities close to 1.0, which makes a 0.70/0.90 plagiarism
threshold meaningless. Plagiarism needs evidence of shared code structure,
not merely that both projects contain source code.
"""

import hashlib
import math
import os
import re
from pathlib import Path

MODEL_NAME = os.getenv(
    "CODE_EMBEDDING_MODEL",
    "godotlaunch/structural-code-fingerprint",
)
MODEL_VERSION = os.getenv(
    "CODE_EMBEDDING_MODEL_REVISION",
    "v2-token7-struct80-lexical20-blake2b",
)

DIMENSIONS = 768
STRUCTURAL_DIMENSIONS = 512
LEXICAL_DIMENSIONS = DIMENSIONS - STRUCTURAL_DIMENSIONS
STRUCTURAL_WEIGHT = 0.80
LEXICAL_WEIGHT = 1.0 - STRUCTURAL_WEIGHT
SHINGLE_SIZE = 7

MAX_FILES = max(1, int(os.getenv("CODE_EMBEDDING_MAX_FILES", "48")))
MAX_FILE_CHARS = max(500, int(os.getenv("CODE_EMBEDDING_MAX_FILE_CHARS", "12000")))
MAX_SHINGLES = max(100, int(os.getenv("CODE_EMBEDDING_MAX_SHINGLES", "25000")))

PRIMARY_EXTENSIONS = {".gd", ".cs", ".shader", ".gdshader"}
FALLBACK_EXTENSIONS = {".tscn", ".tres"}
IGNORED_DIRS = {".git", ".godot", ".import", "node_modules", "__pycache__", "build", "dist"}

KEYWORDS = {
    "if", "else", "elif", "for", "while", "match", "return", "break", "continue", "pass",
    "func", "class", "class_name", "extends", "var", "const", "enum", "signal", "static",
    "async", "await", "in", "is", "as", "and", "or", "not", "true", "false", "null", "self",
    "void", "public", "private", "protected", "internal", "new", "using", "namespace",
    "switch", "case", "default", "try", "catch", "finally", "throw", "yield",
}

TOKEN_PATTERN = re.compile(
    r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\''
    r"|\b\d+(?:\.\d+)?\b|[A-Za-z_]\w*"
    r"|==|!=|<=|>=|->|=>|&&|\|\||\+=|-=|\*=|/="
    r"|[-+*/%<>=!&|^~?:.,;(){}\[\]]"
)
COMMENT_PATTERN = re.compile(r"(?m)(#|//).*?$|/\*.*?\*/", re.S)


def embed_directory(tmp_dir: str) -> dict:
    """Return a normalized 768-dimensional source fingerprint.

    The structural part normalizes identifiers and literals, so copied code is
    still detected after superficial renaming. The lexical part keeps original
    tokens to reduce false positives between projects with common control flow.
    """
    root = Path(tmp_dir)
    files = _source_files(root)
    if not files:
        raise ValueError("Source snapshot không có script/scene Godot phù hợp để đối chiếu")

    structural_shingles: set[str] = set()
    lexical_shingles: set[str] = set()
    sampled_files = 0

    for path in files[:MAX_FILES]:
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")[:MAX_FILE_CHARS]
        except OSError:
            continue

        lexical_tokens = _tokenize(content)
        if not lexical_tokens:
            continue

        sampled_files += 1
        structural_tokens = [_normalize_token(token) for token in lexical_tokens]
        _add_shingles(structural_tokens, structural_shingles, MAX_SHINGLES)
        _add_shingles(lexical_tokens, lexical_shingles, MAX_SHINGLES)
        if len(structural_shingles) >= MAX_SHINGLES and len(lexical_shingles) >= MAX_SHINGLES:
            break

    if not structural_shingles:
        raise ValueError("Source snapshot không có đủ token code để tạo fingerprint")

    structural = _hash_vector(
        structural_shingles,
        STRUCTURAL_DIMENSIONS,
        person=b"gl-struct-v2",
    )
    lexical = _hash_vector(
        lexical_shingles,
        LEXICAL_DIMENSIONS,
        person=b"gl-lex-v2",
    )

    # sqrt(weight) makes cosine of the concatenated unit vectors equal to the
    # requested weighted sum of their individual cosine similarities.
    vector = [math.sqrt(STRUCTURAL_WEIGHT) * value for value in structural]
    vector.extend(math.sqrt(LEXICAL_WEIGHT) * value for value in lexical)

    return {
        "embedding": vector,
        "modelName": MODEL_NAME,
        "modelVersion": MODEL_VERSION,
        "dimensions": len(vector),
        "sampledFiles": sampled_files,
        "sampledChunks": len(structural_shingles),
    }


def _source_files(root: Path) -> list[Path]:
    primary: list[Path] = []
    fallback: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if any(part in IGNORED_DIRS for part in relative.parts):
            continue
        extension = path.suffix.lower()
        if extension in PRIMARY_EXTENSIONS:
            primary.append(path)
        elif extension in FALLBACK_EXTENSIONS:
            fallback.append(path)

    stable_key = lambda path: str(path.relative_to(root)).replace("\\", "/").lower()
    primary.sort(key=stable_key)
    fallback.sort(key=stable_key)
    # Scenes are a fallback for visual/no-code projects. Mixing large .tscn
    # metadata into normal script projects would reintroduce Godot boilerplate.
    return primary if primary else fallback


def _tokenize(content: str) -> list[str]:
    without_comments = COMMENT_PATTERN.sub(" ", content)
    return [token.casefold() for token in TOKEN_PATTERN.findall(without_comments)]


def _normalize_token(token: str) -> str:
    if token in KEYWORDS:
        return token
    if token.startswith(('"', "'")):
        return "STR"
    if token[0].isdigit():
        return "NUM"
    if token[0].isalpha() or token[0] == "_":
        return "ID"
    return token


def _add_shingles(tokens: list[str], target: set[str], limit: int) -> None:
    if not tokens or len(target) >= limit:
        return
    window_size = min(SHINGLE_SIZE, len(tokens))
    for index in range(len(tokens) - window_size + 1):
        target.add(f"{window_size}:" + "\x1f".join(tokens[index:index + window_size]))
        if len(target) >= limit:
            return


def _hash_vector(shingles: set[str], dimensions: int, person: bytes) -> list[float]:
    values = [0.0] * dimensions
    for shingle in sorted(shingles):
        digest = hashlib.blake2b(
            shingle.encode("utf-8"),
            digest_size=8,
            person=person,
        ).digest()
        hashed = int.from_bytes(digest, byteorder="big", signed=False)
        bucket = hashed % dimensions
        values[bucket] += 1.0 if hashed & (1 << 63) else -1.0

    norm = math.sqrt(sum(value * value for value in values))
    if norm == 0:
        raise ValueError("Không thể tạo fingerprint từ source snapshot")
    return [value / norm for value in values]
