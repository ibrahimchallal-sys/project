from ultralytics import YOLO
import cv2
import easyocr
import requests
import re
import time

model = YOLO('../models/yolo26n.pt')

reader = easyocr.Reader(['en'])

node_url = "http://localhost:82/extract-code"

cap = cv2.VideoCapture('http://192.168.1.8:8080/video')
if not cap.isOpened():
    print("❌ Cannot open camera")
    exit()

print("✅ Camera started... Press Q to quit")

detected_containers = {}

def fix_iso(text):
    """Fix common OCR misreads for ISO codes"""
    if len(text) == 4 and text[:2].isdigit():
        chars = list(text)
        if chars[2] == '6':
            chars[2] = 'G'
        if chars[2] == '0':
            chars[2] = 'O'
        if chars[3] == '8':
            chars[3] = 'B'
        return "".join(chars)
    return text

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame")
        break

    # Run YOLO detection
    results = model(frame, conf=0.4)

    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])

            # Crop detected container area
            crop = frame[y1:y2, x1:x2]

            # OCR
            ocr_results = reader.readtext(crop)
            detected_texts = []
            for res in ocr_results:
                text = res[1].upper().strip()
                text = re.sub(r'[^A-Z0-9]', '', text)
                if len(text) > 2:
                    detected_texts.append(text)

            # Fix common ISO OCR mistakes
            corrected_texts = [fix_iso(t) for t in detected_texts]

            # Parse container code
            prefix = number = check_digit = container_code = iso_size_type = None
            container_pattern = r'[A-Z]{3}U\d{6}\d'
            iso_size_pattern = r'\d{2}[A-Z0-9]{2}'

            for text in corrected_texts:
                if re.fullmatch(r'[A-Z]{3}U', text):
                    prefix = text
                elif re.fullmatch(r'\d{6}', text):
                    number = text
                elif re.fullmatch(r'\d', text):
                    check_digit = text
                elif re.fullmatch(container_pattern, text):
                    container_code = text
                elif re.fullmatch(iso_size_pattern, text):
                    iso_size_type = text

            if not container_code and prefix and number:
                container_code = prefix + number + (check_digit if check_digit else "")

            # Only send new detections
            if container_code and container_code not in detected_containers:
                detected_containers[container_code] = time.time()
                payload = {
                    "container_code": container_code,
                    "iso_size_type": iso_size_type,
                    "confidence": round(conf * 100, 2)
                }
                try:
                    r = requests.post(node_url, json=payload)
                    if r.status_code == 200:
                        print(f"✅ Sent {container_code} to server")
                except Exception as e:
                    print("❌ Connection failed:", e)

            # Draw box and label on frame
            label = container_code if container_code else f"Container {conf:.2f}"
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, label, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    # Show frame
    cv2.imshow("MarsaScan Camera", frame)

    # Press Q to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()