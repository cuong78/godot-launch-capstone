import os

from face_service import FaceAnalysisResult, analyze_face, average_embeddings, cosine_similarity

ACTIONS = ("CENTER", "TURN_LEFT", "TURN_RIGHT", "LOOK_UP", "LOOK_DOWN")
# The browser captures at MediaPipe yaw/pitch thresholds of 15/10 degrees.
# InsightFace estimates pose independently and commonly differs by a few degrees,
# so server thresholds need a small tolerance. Movement is validated relative to
# the CENTER capture below instead of assuming every camera has a zero baseline.
MIN_YAW = float(os.getenv("LIVENESS_MIN_YAW_DEGREES", "10"))
MIN_PITCH = float(os.getenv("LIVENESS_MIN_PITCH_DEGREES", "7"))
MAX_CENTER_POSE = float(os.getenv("LIVENESS_MAX_CENTER_POSE_DEGREES", "15"))
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
    left_yaw_delta = left.yaw - center.yaw
    right_yaw_delta = right.yaw - center.yaw
    if (abs(left_yaw_delta) < MIN_YAW
            or abs(right_yaw_delta) < MIN_YAW
            or left_yaw_delta * right_yaw_delta >= 0):
        raise LivenessError(
            "Chưa xác nhận được cả hai hướng quay trái và quay phải "
            f"(độ lệch ghi nhận: {abs(left_yaw_delta):.1f}° và "
            f"{abs(right_yaw_delta):.1f}°; cần tối thiểu {MIN_YAW:.0f}° mỗi hướng)."
        )

    up, down = analyses["LOOK_UP"], analyses["LOOK_DOWN"]
    up_pitch_delta = up.pitch - center.pitch
    down_pitch_delta = down.pitch - center.pitch
    if (abs(up_pitch_delta) < MIN_PITCH
            or abs(down_pitch_delta) < MIN_PITCH
            or up_pitch_delta * down_pitch_delta >= 0):
        raise LivenessError(
            "Chưa xác nhận được cả hai hướng ngẩng lên và cúi xuống "
            f"(độ lệch ghi nhận: {abs(up_pitch_delta):.1f}° và "
            f"{abs(down_pitch_delta):.1f}°; cần tối thiểu {MIN_PITCH:.0f}° mỗi hướng)."
        )

    for action, analysis in analyses.items():
        if cosine_similarity(center.embedding, analysis.embedding) < MIN_SAME_PERSON_SIMILARITY:
            raise LivenessError(f"{action}: khuôn mặt không khớp với ảnh trung tâm.")

    return average_embeddings([analysis.embedding for analysis in analyses.values()]), results
