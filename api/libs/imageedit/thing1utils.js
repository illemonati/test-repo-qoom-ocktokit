import ImageCanvasData from "./ImageCanvasData.js";
export const redrawImage = async (image) => {
    let canvas = document.querySelector('#mainCanvas');
    let ctx = canvas.getContext('2d');
    let screenRect = document.body.getBoundingClientRect();
    let panel = document.querySelector('#panel').getBoundingClientRect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = screenRect.width;
    canvas.height = screenRect.height;
    ctx.imageSmoothingEnabled = false;
    let imageRatio = image.width / image.height;
    let canvasRatio = (canvas.width - panel.width) / canvas.height;
    let x, y, w, h;
    if (imageRatio > canvasRatio) {
        x = panel.width;
        w = canvas.width - panel.width;
        h = w / imageRatio;
        y = (canvas.height - h) / 2;
    }
    else {
        y = 0;
        h = canvas.height;
        w = h * imageRatio;
        x = (canvas.width - w - panel.width) / 2 + panel.width;
    }
    ctx.drawImage(image, x, y, w, h);
    const wasmUseCheckbox = document.getElementById('wasmUseCheckbox');
    const imageData = new ImageCanvasData(x, y, w, h, ctx.getImageData(x, y, w, h), wasmUseCheckbox.checked);
    wasmUseCheckbox.onchange = (e) => {
        imageData.useWasm = wasmUseCheckbox.checked;
    };
    await imageData.init();
    return [imageData, canvas];
};
