import { Slider } from "./slider.js";
import { createHistogram } from "./histogram.js";
export const drawHSVControls = async (imageCanvasData, canvas) => {
    const adjustBrightness = async (slider) => {
        await imageCanvasData.adjustImageHSV(undefined, undefined, undefined, undefined, slider.value, slider.max - slider.min);
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageCanvasData.imageData, imageCanvasData.x, imageCanvasData.y);
        await createHistogram(imageCanvasData, canvas);
    };
    const adjustSaturation = async (slider) => {
        await imageCanvasData.adjustImageHSV(undefined, undefined, slider.value, slider.max - slider.min);
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageCanvasData.imageData, imageCanvasData.x, imageCanvasData.y);
        await createHistogram(imageCanvasData, canvas);
    };
    const adjustHue = async (slider) => {
        await imageCanvasData.adjustImageHSV(slider.value, slider.max - slider.min);
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageCanvasData.imageData, imageCanvasData.x, imageCanvasData.y);
        await createHistogram(imageCanvasData, canvas);
    };
    const adjustExposure = async (slider) => {
        await imageCanvasData.adjustImageExposure(slider.value);
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageCanvasData.imageData, imageCanvasData.x, imageCanvasData.y);
        await createHistogram(imageCanvasData, canvas);
    };
    const exposureSlider = new Slider(0, 10, 0.1, 0, "exposure adjustment", adjustExposure);
    const hueDial = new Slider(-360, 360, 1, 0, "h adjustment", adjustHue);
    const satSlider = new Slider(-100, 100, 1, 0, "s adjustment", adjustSaturation);
    const brightSlider = new Slider(-100, 100, 1, 0, "v adjustment", adjustBrightness);
    const hsvControls = document.querySelector('#hsvControls');
    hsvControls.innerHTML = '';
    exposureSlider.draw(hsvControls).then();
    hueDial.draw(hsvControls).then();
    satSlider.draw(hsvControls).then();
    brightSlider.draw(hsvControls).then();
};
