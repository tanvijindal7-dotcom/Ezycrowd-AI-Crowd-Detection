import cv2

def detect_people(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    body_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_fullbody.xml"
    )

    bodies = body_cascade.detectMultiScale(gray, 1.1, 3)

    return len(bodies)
