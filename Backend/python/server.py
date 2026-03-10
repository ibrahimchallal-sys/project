from flask import Flask, request
from ultralytics import YOLO
import cv2
import numpy as np

app = Flask(__name__)

model = YOLO("best100.pt")

@app.route('/detect', methods=['POST'])
def detect():
    file = request.files['image']
    
    img = cv2.imdecode(
        np.frombuffer(file.read(), np.uint8),
        cv2.IMREAD_COLOR
    )

    results = model(img)

    return str(results)

app.run(host="0.0.0.0", port=5000)