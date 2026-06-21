import base64
import io
import numpy as np
from PIL import Image
import face_recognition


def decode_image(image_base64: str) -> np.ndarray:
    """Decode base64 string (with or without data URI prefix) to numpy RGB array."""
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    img_bytes = base64.b64decode(image_base64)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(img)


def extract_embedding(image_base64: str) -> list[float] | None:
    """
    Extract 128-dim face embedding from base64 image.
    Returns None if no face detected or multiple faces detected.
    """
    img_array = decode_image(image_base64)

    face_locations = face_recognition.face_locations(img_array, model="hog")

    if len(face_locations) == 0:
        return None  # không tìm thấy mặt

    if len(face_locations) > 1:
        return None  # nhiều mặt → yêu cầu chụp lại

    encodings = face_recognition.face_encodings(img_array, face_locations)
    if not encodings:
        return None

    return encodings[0].tolist()
