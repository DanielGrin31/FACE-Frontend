from flask import Flask, render_template, request, session, url_for, redirect, jsonify
import os
import requests as req
from flask import send_from_directory
import tempfile
APP_DIR = os.path.dirname(__file__)
STATIC_FOLDER = os.path.join(APP_DIR, "static")
SERVER_URL="http://127.0.0.1:5057";
# Create the folders if they don't exist
os.makedirs(STATIC_FOLDER, exist_ok=True)

app = Flask(__name__, static_folder=STATIC_FOLDER)


@app.route("/pool/<path:filename>")
def custom_static(filename):
    return SERVER_URL+"/pool/"+filename;
    # return send_from_directory(UPLOAD_FOLDER, filename)


@app.route("/static_images/<path:filename>")
def processed_static(filename):
    return send_from_directory(STATIC_FOLDER, filename)


app.secret_key = "your_secret_key"


app.config["ROOT_FOLDER"] = APP_DIR
app.config["SERVER_URL"] = SERVER_URL

def saveTempFiles(temp_dir,files):
    saved_files={};
    for key, file in files.items():
        if file.filename!='':
            file_path = f"{temp_dir}/{file.filename}"
            file.save(file_path)
            saved_files[key] = open(file_path, 'rb')
    return saved_files;

@app.route("/", methods=["GET", "POST"])
def index():
    images = []
    messages = []
    errors = []

    uploaded_images = session.get("uploaded_images", [])
    faces_length = session.get("faces_length", [0, 0])
    current_images = session.get("current_images", [])
    combochanges = session.get("selected_faces", [-2,-2])

    if request.method == "POST":
        face_num_1 = int(request.form.get("face_num1"))
        face_num_2 = int(request.form.get("face_num2"))
        combochanges = [face_num_1, face_num_2]
        action = request.form.get("action")
        if action == "Upload":
            with tempfile.TemporaryDirectory() as temp_dir:
                saved_files=saveTempFiles(temp_dir,request.files);
                if(len(saved_files)>0):
                    response=req.post(SERVER_URL+"/api/upload",files=saved_files)
                    data=response.json();
                    errors=errors+data['errors'];
                    faces_length=data['faces_length'];
                    if(len(data['images'])>0):
                        current_images=[x.filename for x in request.files.values() if x.filename!=''];
                    uploaded_images=uploaded_images+data['images'];
                else:
                    errors.append("Saving Images failed,make sure you uploaded 2 valid images");
        

        elif action in ["Detect", "Align"]:
            if action == "Align":
                url=SERVER_URL+"/api/align";
                
            elif action == "Detect":
                url=SERVER_URL+"/api/detect";

            response=req.post(url,data={"images":current_images})
            data=response.json();
            uploaded_images=uploaded_images+data['images'];
            errors=errors+data['errors'];
            messages=messages+data['messages'];
            faces_length=data['faces_length'];
        
        elif action == "Clear":
            uploaded_images = []
            current_images = []
            faces_length = [0, 0]

        elif action == "Compare":
            url=SERVER_URL+"/api/compare";
            response=req.post(url,data={"images":current_images,"selected_faces":combochanges})
            data=response.json();
            errors=errors+data['errors'];
            messages=messages+data['messages'];

        elif action == "Check":
            url=SERVER_URL+"/api/check";
            response=req.post(url,data={"image":current_images[0],"selected_face":combochanges[0]})
            data=response.json();
            errors=errors+data['errors'];
            messages=messages+data['messages'];
            most_similar_image=data['image']
            if most_similar_image:
                if len(current_images) == 1:
                    current_images.append(most_similar_image)
                else:
                    current_images[1] = most_similar_image
                combochanges[1]=data["face"];
                faces_length[1] = data['face_length'];
        
        session["current_images"] = current_images
        session["selected_faces"] = combochanges
        session["uploaded_images"] = uploaded_images
        session["faces_length"] = faces_length

    images = uploaded_images

    return render_template(
        "image.html",
        images=images,
        current=current_images,
        faces_length=faces_length,
        selected_faces=combochanges,
        errors=errors,
        messages=messages,
    )


if __name__ == "__main__":
    try:
        app.run(debug=True, port=5057)
    except Exception as e:
        print(f"Error: {e}")
