from fastapi import FastAPI, UploadFile, File
import cv2
import numpy as np
from detector import detect_people

app = FastAPI()

THRESHOLD = 5

@app.get("/")
def home():
    return {"message": "Ezycrowd Backend Running 🚀"}

@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    count = detect_people(img)

    return {
        "people_count": count,
        "alert": count > THRESHOLD
    }
