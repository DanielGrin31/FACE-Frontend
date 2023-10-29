$('.editButton').click(function () {
    var button = $(this);
    var textElement = button.prev('.editableText');
    var currentText = textElement.text();
    var inputElement = $('<input>').attr('type', 'text').val(currentText);
    textElement.replaceWith(inputElement);
    var confirmButton = $('<button>').text('Confirm');
    inputElement.after(confirmButton);

    confirmButton.click(async function(){
        var updatedText = inputElement.val();
        var newTextElement = $('<div>').addClass('editableText').text(updatedText);
        inputElement.replaceWith(newTextElement);
        jsonData = JSON.stringify({ old: currentText, new: updatedText });
        let response = await postData("change_group_name", jsonData);
        console.log(response);
        confirmButton.remove();
    });

});


$("#clusterBtn").on("click", async function () {
    data=JSON.stringify({max_distance:0.5,min_samples:4,retrain:true});
    let response = await postData("cluster",data);
    const filteredData = {};
    for (const key in response) {
        if (Array.isArray(response[key]) && response[key].length <= 20) {
            filteredData[key] = response[key];
        }
    }
    sendJsonFormPost("clustering", filteredData);
});
$("#groupsBtn").on("click", async function () {
    data=JSON.stringify({max_distance:0.5,min_samples:4});
    let response = await postData("cluster",data);
    const filteredData = {};
    for (const key in response) {
        if (Array.isArray(response[key]) && response[key].length <= 20) {
            filteredData[key] = response[key];
        }
    }
    sendJsonFormPost("clustering", filteredData);
});
async function test() {
    jsonData = JSON.stringify({ old: "0", new: "Daniel Grinberg" });
    let response = await postData("change_group_name", jsonData);
    console.log(response);
}

async function handleFaceClick(src) {
    let result = getOriginalImagePath(src)
    let originalImagePath = decodeURI(result[0])
    let face_num = result[1];
    let startIndex = originalImagePath.indexOf("/pool/") + "/pool/".length;
    let imageName = ""
    if (startIndex !== -1) {
        imageName = originalImagePath.substring(startIndex);

    } else {

        console.log("'/pool/' not found in the string.");
        return;
    }
    let canvas = await makeCanvas(originalImagePath);
    let faces = await findFace(imageName, face_num);
    for (let i = 0; i < faces.length; i++) {
        let face = faces[i];
        let box = { x: face[0], y: face[1], width: face[2] - face[0], height: face[3] - face[1] }
        let num = (face_num === -2) ? i : parseInt(face_num);
        let drawOptions = {
            label: `face ${num + 1}`,
            lineWidth: 5
        }
        let drawBox = new faceapi.draw.DrawBox(box, drawOptions)
        drawBox.draw(canvas)
    }
    let newWindow = window.open('', '_blank');
    $(newWindow.document.body).append(canvas);
}