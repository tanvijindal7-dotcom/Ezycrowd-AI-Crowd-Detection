"""
Crowd detection service using YOLOv8 and OpenCV.
Handles model loading, inference, and result post-processing.
"""

import io
import logging
import time
import uuid
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Lazy-loaded model — loaded on first use to avoid startup delay
_model = None

# Supported image file extensions
SUPPORTED_IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}

# Supported video file extensions
SUPPORTED_VIDEO_TYPES = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

# YOLO class ID for "person" in COCO dataset
PERSON_CLASS_ID = 0


def _load_model():
    """Load the YOLOv8 nano model (first call only). Returns the model object."""
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            logger.info("Loading YOLOv8n model...")
            # yolov8n.pt is the nano (fastest) pretrained COCO model
            _model = YOLO("yolov8n.pt")
            logger.info("YOLOv8n model loaded successfully")
        except Exception as exc:
            logger.error(f"Failed to load YOLO model: {exc}")
            raise RuntimeError(f"Model loading failed: {exc}") from exc
    return _model


def detect_people_in_image(
    image_bytes: bytes,
    confidence_threshold: float = 0.4,
) -> Tuple[int, float, List[dict]]:
    """
    Run person detection on a raw image byte buffer.

    Args:
        image_bytes: Raw image bytes (JPEG, PNG, etc.)
        confidence_threshold: Minimum confidence to count a detection

    Returns:
        Tuple of (people_count, avg_confidence, detections_list)
        Each detection is a dict with normalized x, y, width, height, confidence.
    """
    model = _load_model()

    # Decode image from bytes using OpenCV
    np_arr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if frame is None:
        raise ValueError("Could not decode image. Ensure the file is a valid image.")

    img_h, img_w = frame.shape[:2]

    # Run YOLO inference (only detect the "person" class = 0)
    results = model(frame, classes=[PERSON_CLASS_ID], conf=confidence_threshold, verbose=False)

    detections = []
    confidences = []

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue

        for box in boxes:
            conf = float(box.conf[0])
            # xyxy gives pixel coordinates: [x1, y1, x2, y2]
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            # Normalize to [0, 1] range relative to image dimensions
            detections.append({
                "x": x1 / img_w,
                "y": y1 / img_h,
                "width": (x2 - x1) / img_w,
                "height": (y2 - y1) / img_h,
                "confidence": conf,
            })
            confidences.append(conf)

    people_count = len(detections)
    avg_confidence = float(np.mean(confidences)) if confidences else 0.0

    return people_count, avg_confidence, detections


def detect_people_in_video(
    video_bytes: bytes,
    sample_every_n_frames: int = 30,
    confidence_threshold: float = 0.4,
) -> Tuple[int, float, List[dict]]:
    """
    Run person detection on a video file, sampling every N frames.
    Returns the peak detection result (frame with most people).

    Args:
        video_bytes: Raw video file bytes
        sample_every_n_frames: Only process every Nth frame to save time
        confidence_threshold: Minimum confidence to count a detection

    Returns:
        Tuple of (peak_people_count, avg_confidence, peak_frame_detections)
    """
    model = _load_model()

    # Write bytes to a temp numpy buffer so OpenCV can open it as a file
    np_arr = np.frombuffer(video_bytes, np.uint8)

    # OpenCV cannot open video from a memory buffer directly — save to temp path
    import tempfile
    import os

    suffix = ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise ValueError("Could not open video file. Ensure it is a valid video format.")

        best_count = 0
        best_detections: List[dict] = []
        all_confidences: List[float] = []
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_every_n_frames == 0:
                img_h, img_w = frame.shape[:2]
                results = model(frame, classes=[PERSON_CLASS_ID], conf=confidence_threshold, verbose=False)

                frame_detections = []
                for result in results:
                    boxes = result.boxes
                    if boxes is None:
                        continue
                    for box in boxes:
                        conf = float(box.conf[0])
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        frame_detections.append({
                            "x": x1 / img_w,
                            "y": y1 / img_h,
                            "width": (x2 - x1) / img_w,
                            "height": (y2 - y1) / img_h,
                            "confidence": conf,
                        })
                        all_confidences.append(conf)

                if len(frame_detections) > best_count:
                    best_count = len(frame_detections)
                    best_detections = frame_detections

            frame_idx += 1

        cap.release()
    finally:
        os.unlink(tmp_path)

    avg_confidence = float(np.mean(all_confidences)) if all_confidences else 0.0
    return best_count, avg_confidence, best_detections


def process_uploaded_file(
    file_bytes: bytes,
    filename: str,
    confidence_threshold: float = 0.4,
) -> Tuple[int, float, List[dict], float]:
    """
    Dispatch to image or video detection based on file extension.

    Args:
        file_bytes: Raw file content
        filename: Original filename (used to determine type)
        confidence_threshold: Minimum YOLO confidence

    Returns:
        Tuple of (people_count, avg_confidence, detections, processing_time_ms)

    Raises:
        ValueError: If the file type is unsupported
    """
    ext = Path(filename).suffix.lower()

    if ext not in SUPPORTED_IMAGE_TYPES and ext not in SUPPORTED_VIDEO_TYPES:
        raise ValueError(
            f"Unsupported file type '{ext}'. "
            f"Supported: {sorted(SUPPORTED_IMAGE_TYPES | SUPPORTED_VIDEO_TYPES)}"
        )

    start = time.perf_counter()

    if ext in SUPPORTED_IMAGE_TYPES:
        count, confidence, detections = detect_people_in_image(file_bytes, confidence_threshold)
    else:
        count, confidence, detections = detect_people_in_video(file_bytes)

    elapsed_ms = (time.perf_counter() - start) * 1000
    return count, confidence, detections, elapsed_ms
