import unittest
from unittest.mock import patch

from face_service import FaceAnalysisResult
from liveness_service import LivenessError, verify_frames


def result(pitch=0.0, yaw=0.0):
    embedding = [0.0] * 512
    embedding[0] = 1.0
    return FaceAnalysisResult(
        embedding=embedding, pitch=pitch, yaw=yaw, roll=0.0,
        bbox=(1.0, 1.0, 100.0, 100.0), detection_score=0.99,
        blur_score=100.0, brightness=120.0,
    )


class LivenessServiceTest(unittest.TestCase):
    frames = [
        {"action": "CENTER", "imageBase64": "center"},
        {"action": "TURN_LEFT", "imageBase64": "left"},
        {"action": "LOOK_UP", "imageBase64": "up"},
        {"action": "TURN_RIGHT", "imageBase64": "right"},
        {"action": "LOOK_DOWN", "imageBase64": "down"},
    ]

    @patch("liveness_service.analyze_face")
    def test_accepts_complete_opposite_pose_sequence(self, analyze):
        values = {
            "center": result(), "left": result(yaw=20), "right": result(yaw=-20),
            "up": result(pitch=15), "down": result(pitch=-15),
        }
        analyze.side_effect = lambda image: values[image]
        embedding, captures = verify_frames(self.frames)
        self.assertEqual(512, len(embedding))
        self.assertEqual(5, len(captures))

    @patch("liveness_service.analyze_face")
    def test_rejects_two_turns_in_same_direction(self, analyze):
        values = {
            "center": result(), "left": result(yaw=20), "right": result(yaw=18),
            "up": result(pitch=15), "down": result(pitch=-15),
        }
        analyze.side_effect = lambda image: values[image]
        with self.assertRaises(LivenessError):
            verify_frames(self.frames)

    @patch("liveness_service.analyze_face")
    def test_calibrates_movement_against_non_zero_center_pose(self, analyze):
        values = {
            "center": result(pitch=5, yaw=8),
            "left": result(pitch=5, yaw=20),
            "right": result(pitch=5, yaw=-4),
            "up": result(pitch=13, yaw=8),
            "down": result(pitch=-3, yaw=8),
        }
        analyze.side_effect = lambda image: values[image]

        embedding, captures = verify_frames(self.frames)

        self.assertEqual(512, len(embedding))
        self.assertEqual(5, len(captures))

    @patch("liveness_service.analyze_face")
    def test_rejection_reports_measured_pose_deltas(self, analyze):
        values = {
            "center": result(), "left": result(yaw=5), "right": result(yaw=-5),
            "up": result(pitch=15), "down": result(pitch=-15),
        }
        analyze.side_effect = lambda image: values[image]

        with self.assertRaisesRegex(LivenessError, "độ lệch ghi nhận: 5.0° và 5.0°"):
            verify_frames(self.frames)


if __name__ == "__main__":
    unittest.main()
