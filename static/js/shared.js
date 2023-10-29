async function postData(endpoint, data) {
  try {
    const response = await fetch(`http://127.0.0.1:5057/api/${endpoint}`, {
      method: "POST", // or 'PUT'
      body: data,
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error:", error);
  }
}
async function getData(endpoint) {
  try {
    const response = await fetch(`http://127.0.0.1:5057/api/${endpoint}`, {
      method: "GET", // or 'PUT'
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error:", error);
  }
}
function getOriginalImagePath(facePath) {
  let pattern = /aligned_(\d+)_/;  //  regex pattern to capture digits
  let match = pattern.exec(facePath);  // Executing the regex pattern on the string

  if (match) {
    let face_num = match[1]
    let imagePath = facePath.replace(pattern, '');
    imagePath = imagePath.replace("/static/", "/pool/")
    return [imagePath, face_num];
  }
  return ["", 0];
}
async function findFace(image, face_num) {
  let data = new FormData();
  data.append("image", image)
  let result = await postData("find", data);
  if (face_num == -2) {
    return result.boxes;

  }
  return [result.boxes[face_num]];
}
function makeCanvas(src) {
  // Create a canvas element
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');

  // Create an Image object
  let img = new Image();
  img.crossOrigin = "anonymous";  // This enables CORS
  return new Promise((resolve, reject) => {
    img.onload = function () {
      const displaySize = { width: img.width, height: img.height };
      faceapi.matchDimensions(canvas, displaySize);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.onerror = (error) => reject(error);
    // Set the source of the image
    img.src = src;
    resolve(canvas);
  });
}
function sendJsonFormPost(endpoint,data){
  const form = document.createElement('form');
    form.action = `/${endpoint}`;
    form.method = 'POST';

    const jsonData = document.createElement('input');
    jsonData.type = 'hidden';
    jsonData.name = 'jsonData'; // This will be the key on the server side
    jsonData.value = JSON.stringify(data);

    form.appendChild(jsonData);
    document.body.appendChild(form);
    form.submit();
}