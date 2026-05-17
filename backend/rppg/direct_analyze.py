"""
Run rPPG-Toolbox unsupervised methods (POS, CHROM, GREEN) directly on a video file.
Returns per-method BVP arrays + estimated fps for downstream analysis.
"""

import sys
import os
import numpy as np
import cv2
from pathlib import Path
from typing import Optional

# Add rPPG-Toolbox to path so we can import its methods directly
_REPO_ROOT = Path(__file__).parent.parent.parent
_TOOLBOX_PATH = str(_REPO_ROOT / "rPPG-Toolbox")
if _TOOLBOX_PATH not in sys.path:
    sys.path.insert(0, _TOOLBOX_PATH)


def _load_frames(video_path: str, max_frames: int = 1800) -> tuple[np.ndarray, float]:
    """Load video frames as float32 (T, H, W, 3) and return (frames, fps)."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    stored_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames = []
    while len(frames) < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        # OpenCV gives BGR; rPPG methods expect RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frames.append(frame_rgb.astype(np.float32))
    cap.release()

    if not frames:
        raise RuntimeError(f"No frames read from {video_path}")

    arr = np.stack(frames, axis=0)  # (T, H, W, 3)

    # If OpenCV-reported FPS is unreliable (e.g. 0 or 1), estimate from frame count
    frame_count_cap = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duration_hint = frame_count_cap / stored_fps if stored_fps > 1 else len(frames) / 15.0
    estimated_fps = len(frames) / duration_hint if duration_hint > 0 else stored_fps

    # Use stored FPS when it looks plausible (5–120), else use estimate
    fps = stored_fps if 5.0 <= stored_fps <= 120.0 else max(estimated_fps, 15.0)
    return arr, fps


def analyze_video(video_path: str) -> dict:
    """
    Run POS, CHROM, and GREEN on the given video file.

    Returns:
        {
            "pos_bvp": np.ndarray | None,
            "chrom_bvp": np.ndarray | None,
            "green_bvp": np.ndarray | None,
            "fps": float,
            "frame_count": int,
            "duration_seconds": float,
            "errors": {method: str, ...},
        }
    """
    frames, fps = _load_frames(video_path)
    frame_count = len(frames)
    duration = frame_count / fps

    results: dict = {
        "pos_bvp": None,
        "chrom_bvp": None,
        "green_bvp": None,
        "fps": fps,
        "frame_count": frame_count,
        "duration_seconds": duration,
        "errors": {},
    }

    try:
        from unsupervised_methods.methods.POS_WANG import POS_WANG
        results["pos_bvp"] = POS_WANG(frames, fps)
    except Exception as exc:
        results["errors"]["pos"] = str(exc)

    try:
        from unsupervised_methods.methods.CHROME_DEHAAN import CHROME_DEHAAN
        results["chrom_bvp"] = CHROME_DEHAAN(frames, fps)
    except Exception as exc:
        results["errors"]["chrom"] = str(exc)

    try:
        from unsupervised_methods.methods.GREEN import GREEN
        results["green_bvp"] = GREEN(frames)
    except Exception as exc:
        results["errors"]["green"] = str(exc)

    return results
