// based on https://github.com/unixpickle/camera-hijack

(function () {
    streamCanvas = document.createElement('canvas');
    streamCanvas.id = "streamCanvas"
    streamCanvas.width = 640
    streamCanvas.height = 480

    streamCanvasCon = streamCanvas.getContext('2d', {
        alpha: false
    });

    vignetteImage = document.createElement("img");
    vignetteImage.id = "vignetteImage"
    vignetteImage.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4gPHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHJhZGlhbEdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgY3g9IjUwJSIgY3k9IiIgcj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzAwMDAwMCIgc3RvcC1vcGFjaXR5PSIwLjUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwMDAwMDAiIHN0b3Atb3BhY2l0eT0iMC44Ii8+PC9yYWRpYWxHcmFkaWVudD48L2RlZnM+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmFkKSIgLz48L3N2Zz4g"
    vignetteImage.style.display = "none"

    localPreview = document.createElement("img");
    localPreview.id = "localPreview"
    localPreview.style.display = "none"

    // Select the node that will be observed for mutations
    const targetNode = document.getElementsByClassName("preview")[0];

    // Options for the observer (which mutations to observe)
    const config = {
        attributes: true,
        childList: true,
        subtree: true
    };

    // Callback function to execute when mutations are observed
    const callback = function (mutationsList, observer) {

        previewBase64 = targetNode.style.backgroundImage.replace("url(\"", "").replace("\")", "")

        if (previewBase64 == "none") {
            localPreview.removeAttribute("src")
        } else {
            localPreview.src = previewBase64
        }

        //console.log(previewBase64)
    };

    // Create an observer instance linked to the callback function
    const observer1 = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer1.observe(targetNode, config);

    localVideo = document.getElementById('remote-video')

    // function drawFn(con) {
    //     if (localStage.innerText === "3") {
    //         const imageWidth = localVideo.videoWidth;
    //         const imageHeight = localVideo.videoHeight;
    //         // Resize values
    //         const resizeRatio = Math["max"](640 / imageWidth, 480 / imageHeight);
    //         const resizeWidth = imageWidth * resizeRatio;
    //         const resizeHeight = imageHeight * resizeRatio;
    //         // Cropping values
    //         const sWidth = imageWidth / (resizeWidth / 640);
    //         const sHeight = imageHeight / (resizeHeight / 480);
    //         const sX = (imageWidth - sWidth) * 1 / 2;
    //         const sY = (imageHeight - sHeight) * 1 / 2;
    //         // Draw image
    //         con.drawImage(localVideo, Math.floor(sX), Math.floor(sY), Math.floor(sWidth), Math.floor(sHeight), 0, 0, 640, 480);
    //     } else if (localStage.innerText === "2") {
    //         if (localPreview.src == "") {
    //             con.drawImage(noise, 0, 0, 640, 480);
    //             con.drawImage(vignetteImage, 0, 0, 640, 480);
    //         } else {
    //             con.drawImage(noise, 0, 0, 640, 480);
    //             con.drawImage(vignetteImage, 0, 0, 640, 480);
    //             // con.filter = "blur(10px)"
    //
    //             // const imageWidth = localPreview.width;
    //             // const imageHeight = localPreview.height;
    //             // //Resize values
    //             // const resizeRatio = Math["max"](640 / imageWidth, 480 / imageHeight);
    //             // const resizeWidth = imageWidth * resizeRatio;
    //             // const resizeHeight = imageHeight * resizeRatio;
    //             // //Cropping valueszzz
    //             // const sWidth = imageWidth / (resizeWidth / 640);
    //             // const sHeight = imageHeight / (resizeHeight / 480);
    //             // const sX = (imageWidth - sWidth) * 1 / 2;
    //             // const sY = (imageHeight - sHeight) * 1 / 2;
    //             // //Draw image
    //             // con.drawImage(localPreview, Math.floor(sX), Math.floor(sY), Math.floor(sWidth), Math.floor(sHeight), 0, 0, 640, 480);
    //             // con.filter = "none"
    //         }
    //     } else {
    //         con.drawImage(noise, 0, 0, 640, 480);
    //         con.drawImage(vignetteImage, 0, 0, 640, 480);
    //     }
    // }

    // let timerId = setTimeout(function tick() {
    //     drawFn(streamCanvasCon);
    //     timerId = setTimeout(tick, 1000 / 15); // (*)
    // }, 1000 / 15);


})();

// based on https://github.com/unixpickle/camera-hijack
var video = document.createElement("video");
video.src = "https://file-examples-com.github.io/uploads/2017/04/file_example_MP4_480_1_5MG.mp4"
video.crossOrigin = "anonymous"
video.id = 'img'
video.controls = true;
video.muted = true;
video.loop = true;
video.play()

var canv = document.createElement("canvas")
canv.id = 'canvas'

canv.width = 640
canv.height = 480
document.body.insertBefore(canv, document.body.firstChild);
document.body.insertBefore(video, document.body.firstChild);


let s = document.createElement('script');
s.src = "https://webglfundamentals.org/webgl/resources/webgl-utils.js";
s.onload = () => s.remove();
(document.head || document.documentElement).appendChild(s);

let s1 = document.createElement('script');
s1.src = "https://webglfundamentals.org/webgl/resources/m4.js";
s1.onload = () => s1.remove();
(document.head || document.documentElement).appendChild(s1);

// WebGL - 2D - DrawImage basic
// from https://webglfundamentals.org/webgl/webgl-2d-drawimage-01.html

const vertex = `attribute vec4 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;
uniform mat4 u_textureMatrix;

varying vec2 v_texcoord;

void main() {
   gl_Position = u_matrix * a_position;
   v_texcoord = (u_textureMatrix * vec4(a_texcoord, 0, 1)).xy;
}`

const fragment = `precision mediump float;

varying vec2 v_texcoord;

uniform sampler2D u_texture;

void main() {
   gl_FragColor = texture2D(u_texture, v_texcoord);
}`;


function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    var canvas = document.querySelector("#canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    // setup GLSL program
    var program = webglUtils.createProgramFromSources(gl, [vertex, fragment]);

    // look up where the vertex data needs to go.
    var positionLocation = gl.getAttribLocation(program, "a_position");
    var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

    // lookup uniforms
    var matrixLocation = gl.getUniformLocation(program, "u_matrix");
    var textureMatrixLocation = gl.getUniformLocation(program, "u_textureMatrix");
    var textureLocation = gl.getUniformLocation(program, "u_texture");

    // Create a buffer.
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Put a unit quad in the buffer
    var positions = [
        0, 0,
        0, 1,
        1, 0,
        1, 0,
        0, 1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Create a buffer for texture coords
    var texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

    // Put texcoords in the buffer
    var texcoords = [
        0, 0,
        0, 1,
        1, 0,
        1, 0,
        0, 1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

    tex = gl.createTexture();

    textureInfo = {
        width: 1,   // we don't know the size until it loads
        height: 1,
        texture: tex,
    };

    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    function renderPreview() {
        drawImage(
            noise,
            noise.width,
            noise.height,
            0,
            0, 640, 480)
        drawImage(
            vignetteImage,
            vignetteImage.width,
            vignetteImage.height,
            0,
            0, 640, 480)
    }

    function render() {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.clear(gl.COLOR_BUFFER_BIT);

        if (localStage.innerText === "3") {
            const imageWidth = localVideo.videoWidth;
            const imageHeight = localVideo.videoHeight;
            // Resize values
            const resizeRatio = Math["max"](640 / imageWidth, 480 / imageHeight);
            const resizeWidth = imageWidth * resizeRatio;
            const resizeHeight = imageHeight * resizeRatio;
            // Cropping values
            const sWidth = imageWidth / (resizeWidth / 640);
            const sHeight = imageHeight / (resizeHeight / 480);
            const sX = (imageWidth - sWidth) * 1 / 2;
            const sY = (imageHeight - sHeight) * 1 / 2;
            // Draw image
            console.dir([localVideo.videoWidth, localVideo.videoHeight])
            let w = localVideo.videoWidth
            let h = localVideo.videoHeight
            if (w > h)
                h = [w, w = h][0];
            drawImage(localVideo, w, h, Math.floor(sX), Math.floor(sY), Math.floor(sWidth), Math.floor(sHeight), 0, 0, 640, 480);
        } else if (localStage.innerText === "2") {
            if (localPreview.src == "") {
                renderPreview()
            } else {
                renderPreview()
            }
        } else {
            renderPreview()
        }
    }

    let timerId = setTimeout(function tick() {
        render();
        timerId = setTimeout(tick, 1000 / 15); // (*)
    }, 1000 / 15);

    function drawImage(
        img, texWidth, texHeight,
        srcX, srcY, srcWidth, srcHeight,
        dstX, dstY, dstWidth, dstHeight) {

        if (dstX === undefined) {
            dstX = srcX;
            srcX = 0;
        }
        if (dstY === undefined) {
            dstY = srcY;
            srcY = 0;
        }
        if (srcWidth === undefined) {
            srcWidth = texWidth;
        }
        if (srcHeight === undefined) {
            srcHeight = texHeight;
        }
        if (dstWidth === undefined) {
            dstWidth = srcWidth;
            srcWidth = texWidth;
        }
        if (dstHeight === undefined) {
            dstHeight = srcHeight;
            srcHeight = texHeight;
        }

        gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);


        // Tell WebGL to use our shader program pair
        gl.useProgram(program);

        // Setup the attributes to pull data from our buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.enableVertexAttribArray(texcoordLocation);
        gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        // this matrix will convert from pixels to clip space
        var matrix = m4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);

        // this matrix will translate our quad to dstX, dstY
        matrix = m4.translate(matrix, dstX, dstY, 0);

        // this matrix will scale our 1 unit quad
        // from 1 unit to texWidth, texHeight units
        matrix = m4.scale(matrix, dstWidth, dstHeight, 1);

        // Set the matrix.
        gl.uniformMatrix4fv(matrixLocation, false, matrix);

        // Because texture coordinates go from 0 to 1
        // and because our texture coordinates are already a unit quad
        // we can select an area of the texture by scaling the unit quad
        // down
        var texMatrix = m4.translation(srcX / texWidth, srcY / texHeight, 0);
        texMatrix = m4.scale(texMatrix, srcWidth / texWidth, srcHeight / texHeight, 1);

        // Set the texture matrix.
        gl.uniformMatrix4fv(textureMatrixLocation, false, texMatrix);

        // Tell the shader to get the texture from texture unit 0
        gl.uniform1i(textureLocation, 0);

        // draw the quad (2 triangles, 6 vertices)
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

}

setTimeout(main, 1000)

function hijackStream(stream) {
    const track = stream.getVideoTracks()[0];

    if (!track) {
        return stream;
    }

    const newStream = new MediaStream();

    //add fake track here
    stream.getAudioTracks().forEach((track) => newStream.addTrack(track));

    stream.getAudioTracks().forEach((track) => stream.removeTrack(track));

    const newTrack = canv.captureStream(15).getVideoTracks()[0];

    newStream.addTrack(newTrack);

    activeStream = newStream

    return newStream;
}

if (navigator.getUserMedia) {
    const oldDeprecatedMethod = navigator.getUserMedia;
    navigator.getUserMedia = (constraints, successCb, errorCb) => {
        oldDeprecatedMethod.call(navigator, constraints, (stream) => {
            if (successCb) {
                successCb(hijackStream(stream));
            }
        }, errorCb);
    };
    navigator.webkitGetUserMedia = navigator.getUserMedia;
}

const oldMethod = navigator.mediaDevices.getUserMedia;
navigator.mediaDevices.getUserMedia = (options) => {
    return oldMethod.call(navigator.mediaDevices, options).then(hijackStream);
};
