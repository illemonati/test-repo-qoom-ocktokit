import { rgbToHsv, hsvToRgb, adjustPixelHSV } from "./colorUtils.js";
import * as wasm from "./wasm_image_utils.js";
import wasm_init from "./wasm_image_utils.js";
export default class ImageCanvasData {
    constructor(x, y, w, h, imageData, useWasm) {
        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
        this.saturationControls = {
            multiplier: 0,
            range: 2
        };
        this.valueControls = {
            multiplier: 0,
            range: 2
        };
        this.hueControls = {
            multiplier: 0,
            range: 2
        };
        this.hsvData = new Uint16Array(0);
        this.originalHsvData = new Uint16Array(0);
        this.originalRgbData = new Uint8Array(0);
        this.useWasm = true;
        this.x = Math.floor(x);
        this.y = Math.floor(y);
        this.w = Math.ceil(w) + 1;
        this.h = Math.ceil(h) + 1;
        this.imageData = imageData;
        this.originalRgbData = imageData.data.slice();
        this.useWasm = useWasm || true;
    }
    async init() {
        await wasm_init();
        this.hsvData = new Uint16Array(this.imageData.data.length);
        this.originalHsvData = new Uint16Array(this.imageData.data.length);
        await this.convertRbgToHsv();
        this.originalHsvData = this.hsvData.slice();
    }
    async getMostUsedColor() {
        return wasm.get_most_used_color(this.imageData.data, this.imageData.data.length);
    }
    async convertRbgToHsv() {
        if (!this.useWasm) {
            for (let i = 0; i < this.imageData.data.length; i += 4) {
                const r = this.imageData.data[i];
                const g = this.imageData.data[i + 1];
                const b = this.imageData.data[i + 2];
                const [h, s, v] = await rgbToHsv(r / 255, g / 255, b / 255);
                this.hsvData[i] = h;
                this.hsvData[i + 1] = s * 100;
                this.hsvData[i + 2] = v * 100;
            }
        }
        else {
            wasm.convert_rgb_to_hsv_wasm(this.imageData.data, this.hsvData, this.imageData.data.length);
        }
    }
    async getPixelCountForColor(color) {
        return wasm.get_pixel_count_for_color(color, this.imageData.data, this.imageData.data.length);
    }
    async floodFill(pointX, pointY, tolerence, r, g, b) {
        let n = wasm.flood_fill(pointX, pointY, tolerence, this.imageData.data, this.imageData.data, this.imageData.data.length, this.imageData.width, this.imageData.height, r, g, b);
    }
    async coolFill(pointX, pointY, tolerence, r, g, b) {
        let n = wasm.cool_fill(pointX, pointY, tolerence, this.imageData.data, this.imageData.data, this.imageData.data.length, this.imageData.width, this.imageData.height, r, g, b);
    }
    async convertHsvToRgb() {
        if (!this.useWasm) {
            for (let i = 0; i < this.hsvData.length; i += 4) {
                const h = this.hsvData[i];
                const s = this.hsvData[i + 1];
                const v = this.hsvData[i + 2];
                const [r, g, b] = await hsvToRgb(h, s / 100, v / 100);
                this.imageData.data[i] = r * 255;
                this.imageData.data[i + 1] = g * 255;
                this.imageData.data[i + 2] = b * 255;
            }
        }
        else {
            wasm.convert_hsv_to_rgb_wasm(this.hsvData, this.imageData.data, this.hsvData.length);
        }
    }
    async adjustImageExposure(evchange) {
        wasm.change_image_exposure(this.originalRgbData, this.imageData.data, this.imageData.data.length, evchange);
    }
    async adjustImageHSV(hMultiplier, hRange, sMultiplier, sRange, vMultiplier, vRange) {
        this.saturationControls.multiplier = sMultiplier || this.saturationControls.multiplier;
        this.saturationControls.range = sRange || this.saturationControls.range;
        this.valueControls.multiplier = vMultiplier || this.valueControls.multiplier;
        this.valueControls.range = vRange || this.valueControls.range;
        this.hueControls.multiplier = hMultiplier || this.hueControls.multiplier;
        this.hueControls.range = hRange || this.hueControls.range;
        if (!this.useWasm) {
            for (let i = 0; i < this.originalHsvData.length; i += 4) {
                const h = this.originalHsvData[i];
                const s = this.originalHsvData[i + 1];
                const v = this.originalHsvData[i + 2];
                const [newH, newS, newV] = await adjustPixelHSV(h, s / 100, v / 100, this.hueControls.multiplier, this.hueControls.range, this.saturationControls.multiplier, this.saturationControls.range, this.valueControls.multiplier, this.valueControls.range);
                this.hsvData[i] = newH;
                this.hsvData[i + 1] = newS * 100;
                this.hsvData[i + 2] = newV * 100;
            }
        }
        else {
            wasm.adjust_image_hsv_wasm(this.originalHsvData, this.hsvData, this.hueControls.multiplier, this.hueControls.range, this.saturationControls.multiplier, this.saturationControls.range, this.valueControls.multiplier, this.valueControls.range, this.originalHsvData.length);
        }
        await this.convertHsvToRgb();
    }
    ;
}
