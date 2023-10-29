"use strict";



async function loadImage(canvas, src) {
  const ctx = canvas.getContext("2d");

  const img = new Image();
  return new Promise((resolve,reject)=>{
  img.onload = function () {
    const displaySize = { width: img.width, height: img.height };
    faceapi.matchDimensions(canvas, displaySize);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    resolve()
  };
  img.onerror=(error)=> reject(error);
  img.src = src; // Replace with your image URL
});
}
$("#startVideoBtn").on("click", function () {
  const video = $("#video")[0]; // Get the video element using jQuery
  if (current_images.length === 0) {
    $(this).prop("disabled", true);
    $("#video").removeClass("d-none");
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/static/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/static/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/static/models"),
    ]);
    faceapi.nets.ssdMobilenetv1.loadFromUri("/static/models").then(startVideo);

    function startVideo() {
      navigator.mediaDevices
        .getUserMedia({ video: {} })
        .then((stream) => {
          video.srcObject = stream;
        })
        .catch((err) => {
          console.error("Error accessing the webcam: ", err);
        });
      video.addEventListener("play", () => {
        const canvas = faceapi.createCanvasFromMedia(video);
        let continueScanning = true;

        $(canvas).addClass("start-0 position-absolute");
        $("#videoContainer").append(canvas);
        const displaySize = { width: 640, height: 480 };
        faceapi.matchDimensions(canvas, displaySize);
        let scanVideo = setInterval(async () => {
          const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();
          if (detections.length > 0 && continueScanning) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Set the canvas dimensions to match the video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw the current frame of the video onto the canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert the canvas to a data URL (base64 encoded)
            const dataURL = canvas.toDataURL("image/png");
            const randomString = Math.random().toString(36).substring(2, 10);
            const file = dataURLtoFile(dataURL, `${randomString}.png`);
            showFile($("#dragarea1"), file);
            let container = new DataTransfer();
            container.items.add(file);
            $("input[type='file'][name='image1']")[0].files = container.files;

            clearInterval(scanVideo);
            continueScanning = false;
            $("form").submit(function (eventObj) {
              $("<input />")
                .attr("type", "hidden")
                .attr("name", "action")
                .attr("value", "Upload")
                .appendTo(this);
              return true;
            });
            $("form").submit();
          }
        }, 100);
      });
    }
  }
});

function getImgParams($comboBox, areaNumber) {
  const faceNum = parseInt($comboBox.val());
  const fileName = current_images[areaNumber - 1];
  return { faceNum, fileName };
}
async function getFacePath($comboBox, areaNumber) {
  let $params = getImgParams($comboBox, areaNumber);
  let path = "";
  let face_num = $params.faceNum;
  if ($params.faceNum == -2) {
    path = SERVER_URL + `/pool/${$params.fileName}`;
  } else {
    path = SERVER_URL + `/static/aligned_${face_num}_${$params.fileName}`;
  }
  const exists = await checkFileExists(path);
  return { path, exists, face_num };
}
function setupDropArea($dropArea, areaNumber) {
  const $img = $dropArea.find("canvas");
  const $content = $dropArea.find(`#dragarea${areaNumber}-content`);
  const $dragText = $content.find("header");
  const $button = $content.find("button");
  const $input = $dropArea.find("input");
  const $comboBox = $(`#combo-box${areaNumber}`);
  const $findBtn = $(`#findBtn${areaNumber}`);
  $button.on("click", function () {
    $input.click();
  });
  $findBtn.on("click",async function(){
    let id = $(this).attr("id");
    let number = parseInt(id.slice(-1)); // Get the last character
    let path = SERVER_URL + `/pool/${current_images[number-1]}`;
    await loadImage($img[0],path)
    let face_num =  getImgParams($comboBox, number).faceNum;
    let faces=await findFace(current_images[number-1],face_num)
    for(let i=0;i<faces.length;i++){
      let face=faces[i];
      let box={x:face[0], y:face[1],width:face[2]-face[0],height:face[3]-face[1]}
      let num = (face_num === -2) ? i : face_num;
      let drawOptions = {
        label: `face ${num+1}`,
        lineWidth: 5
      }
      let drawBox = new faceapi.draw.DrawBox(box, drawOptions)
      drawBox.draw($img[0])
    }

  })
  $input.on("change", function () {
    const file = this.files[0];
    $dropArea.addClass("active");
    showFile($dropArea, file);
    $("form").submit(function (eventObj) {
      $("<input />")
        .attr("type", "hidden")
        .attr("name", "action")
        .attr("value", "Upload")
        .appendTo(this);
      return true;
    });
    $("form").submit();
    $("button").prop("disabled", true);
    $("input[type='button'], input[type='submit']").prop("disabled", true);
  });
  $dropArea.on("dragover", function (event) {
    event.preventDefault();
    $dropArea.addClass("active");
    $dragText.text("Release to Upload File");
  });
  $dropArea.on("dragleave", function () {
    $dropArea.removeClass("active");
    $dragText.text("Drag & Drop to Upload File");
  });

  $dropArea.on("drop", function (event) {
    event.preventDefault();
    const file = event.originalEvent.dataTransfer.files[0];
    $input[0].files = event.originalEvent.dataTransfer.files;
    showFile($dropArea, file);
    $("form").submit(function (eventObj) {
      $("<input />")
        .attr("type", "hidden")
        .attr("name", "action")
        .attr("value", "Upload")
        .appendTo(this);
      return true;
    });
    $("form").submit();
    $("button").prop("disabled", true);
    $("input[type='button'], input[type='submit']").prop("disabled", true);
  });
  $comboBox.on("change", async function () {
    let result = await getFacePath($(this), areaNumber);
    if (result.exists) {
      //display
      $(`#face_num_input${areaNumber}`).val(result.face_num);
      await loadImage($img[0], result.path);

      $img.removeClass("d-none");
      $dropArea.removeClass("p-5");
    } else {
      // align and then display
    }
  });
  return { $img, $content, $dragText, $button, $input, $comboBox };
}
const dropArea1Elements = setupDropArea($("#dragarea1"), 1);
const dropArea2Elements = setupDropArea($("#dragarea2"), 2);
let file;
$(document).keydown(function (event) {
  if (event.ctrlKey && event.key === "s") {
    event.preventDefault();
    $("input[type='submit'][value='Compare']").click();
  } else if (event.ctrlKey && event.key === "d") {
    event.preventDefault();
    $("input[type='submit'][value='Check']").click();
  } else if (event.ctrlKey && event.key === "c") {
    event.preventDefault();
    $("input[type='submit'][value='Clear']").click();
  } else if (event.ctrlKey && event.key === ",") {
    event.preventDefault();
    $(".browse-btn:eq(0)").click();
  } else if (event.ctrlKey && event.key === ".") {
    event.preventDefault();
    $(".browse-btn:eq(1)").click();
  }
});
$(document).ready(function () {

  let $imgs = [dropArea1Elements.$img, dropArea2Elements.$img];
  let $comboBoxes = [dropArea1Elements.$comboBox, dropArea2Elements.$comboBox];
  for (let index = 0; index < current_images.length; index++) {
    if (current_images[index] != undefined && current_images[index] !== "") {
      let path;
      if (selected_faces[index] == -2) {
        path = SERVER_URL + `/pool/${current_images[index]}`;
      } else {
        path =
          SERVER_URL +
          `/static/aligned_${selected_faces[index]}_${current_images[index]}`;
        $comboBoxes[index].val(selected_faces[index]);
        $(`#face_num_input${index + 1}`).val(selected_faces[index]);
      }
      loadImage($imgs[index][0], path);
      $imgs[index].removeClass("d-none");
      $imgs[index].removeClass("p-5");
    }
  }
});

// errors.forEach((error) => {
//   if (error !== "") {
//     addErrorMessage(error);
//   }
// });
// messages.forEach((message) => {
//   if (message !== "") {
//     addInfoMessage(message);
//   }
// });

function deleteImage(button) {
  var $dragArea = $(button).parent();
  const $input = $dragArea.find("input");
  $input.val("");

  unshowFile($dragArea);
  $(button).remove();
}
function unshowFile($dragArea) {
  let $img = $dragArea.find("canvas");
  const ctx = $img.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  $img.addClass("d-none");
  $dragArea.addClass("p-5");
  $dragArea.removeClass("active");
}
function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[arr.length - 1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function showFile(dragArea, file) {
  let fileType = file.type;
  let validExtensions = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (validExtensions.includes(fileType)) {
    let fileReader = new FileReader();
    fileReader.onload = () => {
      let fileURL = fileReader.result;
      let $imgElement = dragArea.find("canvas");
      loadImage($imgElement[0], fileURL);
      $imgElement.removeClass("d-none");
      dragArea.addClass("active");
      dragArea.removeClass("p-5");
    };
    fileReader.readAsDataURL(file);
  } else {
    alert("This is not an Image File!");
    dragArea.removeClass("active");
    dragArea.find("header").text("Drag & Drop to Upload File");
  }
}
async function checkFileExists(filePath) {
  try {
    await $.ajax({
      url: filePath,
      type: "HEAD",
    });
    return true;
  } catch (error) {
    return false;
  }
}
