import base64
import io
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from PIL import Image
import torch

import clip_service


def jpeg_base64(size=(64, 48)) -> str:
    image = Image.new("RGB", size, "white")
    output = io.BytesIO()
    image.save(output, format="JPEG")
    return base64.b64encode(output.getvalue()).decode("ascii")


class ClipServiceImageDecodeTest(unittest.TestCase):
    def test_decodes_plain_base64(self):
        image = clip_service._decode_image(jpeg_base64())

        self.assertIsNotNone(image)
        self.assertEqual((64, 48), image.size)
        self.assertEqual("RGB", image.mode)

    def test_decodes_browser_data_url_used_by_kyc_frontend(self):
        payload = "data:image/jpeg;base64," + jpeg_base64()

        image = clip_service._decode_image(payload)

        self.assertIsNotNone(image)
        self.assertEqual((64, 48), image.size)

    def test_rejects_invalid_base64(self):
        self.assertIsNone(clip_service._decode_image("data:image/jpeg;base64,not-valid!!!"))

    @patch("clip_service._load")
    @patch("clip_service._decode_image", return_value=Image.new("RGB", (8, 8)))
    def test_model_failure_is_not_reported_as_invalid_image(self, _decode, _load):
        _load.side_effect = RuntimeError("model unavailable")

        with self.assertLogs("clip_service", level="ERROR"):
            with self.assertRaises(clip_service.ClipEmbeddingError):
                clip_service.encode_image("valid-image")

    def test_accepts_transformers_4_tensor_image_features(self):
        tensor = torch.tensor([[3.0, 4.0]])

        self.assertIs(tensor, clip_service._image_feature_tensor(tensor))

    def test_accepts_transformers_5_model_output_image_features(self):
        tensor = torch.tensor([[3.0, 4.0]])
        output = SimpleNamespace(pooler_output=tensor)

        self.assertIs(tensor, clip_service._image_feature_tensor(output))


if __name__ == "__main__":
    unittest.main()
