from pathlib import Path

import cv2
import numpy as np

from backend.interpolation import interpolate_sequence, save_interpolated_video


def test_interpolate_sequence_adds_between_frames():
    first = np.zeros((32, 32, 3), dtype=np.uint8)
    second = np.full((32, 32, 3), 255, dtype=np.uint8)

    frames = interpolate_sequence([first, second], inbetweens=3, method="blend")

    assert len(frames) == 5
    assert frames[1].mean() > 0
    assert frames[-2].mean() < 255


def test_save_interpolated_video(tmp_path: Path):
    first = tmp_path / "first.png"
    second = tmp_path / "second.png"
    cv2.imwrite(str(first), np.zeros((32, 32, 3), dtype=np.uint8))
    cv2.imwrite(str(second), np.full((32, 32, 3), 255, dtype=np.uint8))

    result = save_interpolated_video([first, second], tmp_path, "job", inbetweens=1, fps=6, method="blend")

    assert result.video_path.exists()
    assert result.frame_count == 3
    assert len(result.frame_paths) == 3
