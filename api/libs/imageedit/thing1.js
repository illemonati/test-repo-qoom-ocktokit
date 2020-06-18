import { redrawImage } from "./thing1utils.js";
import { createHistogram } from "./histogram.js";
import { drawHSVControls } from "./drawHSVControls.js";
import { initFloodFill } from "./floodFill.js";
const image = new Image();


const path = window.location.href;

const last = '/libs/'+path.substring(path.lastIndexOf('/') + 1)

console.log(last)

image.src = last;
const mainFunction = async () => {
    const [imageCanvasData, canvasElement] = await redrawImage(image);
    await createHistogram(imageCanvasData, canvasElement);
    await drawHSVControls(imageCanvasData, canvasElement);
    await initFloodFill(imageCanvasData, canvasElement);
};
image.onload = mainFunction;

window.onresize = mainFunction;