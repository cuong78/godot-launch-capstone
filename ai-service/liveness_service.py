import os

from face_service import FaceAnalysisResult, analyze_face, average_embeddings, cosine_similarity

ACTIONS = ("CENTER", "TURN_LEFT", "TURN_RIGHT", "LOOK_UP", "LOOK_DOWN")
MIN_YAW = float(os.getenv("LIVENESS_MIN_YAW_DEGREES", "15"))
MIN_PITCH = float(os.getenv("LIVENESS_MIN_PITCH_DEGREES", "10"))
MAX_CENTER_POSE = float(os.getenv("LIVENESS_MAX_CENTER_POSE_DEGREES", "12"))
MIN_SAME_PERSON_SIMILARITY = float(os.getenv("ARCFACE_SAME_PERSON_SIMILARITY", "0.35"))
MIN_DETECTION_SCORE = float(os.getenv("LIVENESS_MIN_DETECTION_SCORE", "0.65"))
MIN_BLUR_SCORE = float(os.getenv("LIVENESS_MIN_BLUR_SCORE", "25"))


class LivenessError(ValueError):
    pass


def verify_frames(frames: list[dict]) -> tuple[list[float], list[dict]]:
    """Validate the five server-ordered captures and return their averaged ArcFace vector."""
    actions = [frame.get("action") for frame in frames]
    if len(actions) != len(ACTIONS) or set(actions) != set(ACTIONS) or actions[0] != "CENTER":
        raise LivenessError("Chuỗi challenge không hợp lệ hoặc thiếu ảnh.")

    analyses: dict[str, FaceAnalysisResult] = {}
    results: list[dict] = []
    for frame in frames:
        action = frame["action"]
        try:
            analysis = analyze_face(frame["imageBase64"])
        except ValueError as exc:
            raise LivenessError(f"{action}: {exc}") from exc
        if analysis.detection_score < MIN_DETECTION_SCORE:
            raise LivenessError(f"{action}: khuôn mặt chưa đủ rõ.")
        if analysis.blur_score < MIN_BLUR_SCORE:
            raise LivenessError(f"{action}: ảnh bị mờ, vui lòng giữ camera ổn định.")
        if not 25 <= analysis.brightness <= 235:
            raise LivenessError(f"{action}: ánh sáng không phù hợp.")
        analyses[action] = analysis
        results.append({
            "action": action, "pitch": round(analysis.pitch, 2),
            "yaw": round(analysis.yaw, 2), "roll": round(analysis.roll, 2),
            "detectionScore": round(analysis.detection_score, 3),
        })

    center = analyses["CENTER"]
    if abs(center.pitch) > MAX_CENTER_POSE or abs(center.yaw) > MAX_CENTER_POSE:
        raise LivenessError("CENTER: vui lòng nhìn thẳng vào camera.")

    left, right = analyses["TURN_LEFT"], analyses["TURN_RIGHT"]
    if abs(left.yaw) < MIN_YAW or abs(right.yaw) < MIN_YAW or left.yaw * right.yaw >= 0:
        raise LivenessError("Chưa xác nhận được cả hai hướng quay trái và quay phải.")

    up, down = analyses["LOOK_UP"], analyses["LOOK_DOWN"]
    if abs(up.pitch) < MIN_PITCH or abs(down.pitch) < MIN_PITCH or up.pitch * down.pitch >= 0:
        raise LivenessError("Chưa xác nhận được cả hai hướng ngẩng lên và cúi xuống.")

    for action, analysis in analyses.items():
        if cosine_similarity(center.embedding, analysis.embedding) < MIN_SAME_PERSON_SIMILARITY:
            raise LivenessError(f"{action}: khuôn mặt không khớp với ảnh trung tâm.")

    return average_embeddings([analysis.embedding for analysis in analyses.values()]), results
