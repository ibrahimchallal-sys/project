from ultralytics import YOLO

# 1. Charger le modèle
model = YOLO('../models/yolo26n.pt')

file = '../test/test1.jpg'
print("Début de la détection filtrée")



results = model.predict(
    source=file,         
    project=r'C:\Users\user\Documents\MARSA MAROC\Projet\Backend\python', 
    name='containercode',         
    exist_ok=True,             
    conf=0.30,   
    show=True,
    save=True  

                      
)
print("done ")

