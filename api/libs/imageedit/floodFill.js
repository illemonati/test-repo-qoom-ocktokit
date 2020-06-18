import { createHistogram } from "./histogram.js";
export class Point {
    constructor(x, y, imageData, col, tolerance) {
        this.x = x;
        this.y = y;
        this.imageData = imageData;
        this.color = this.getRgb();
        this.fill_color = col || this.color;
        this.tolerance = tolerance || 100;
        this.fill = this.withinTolerance(this.fill_color);
    }
    getNeightbors() {
        const neighbors = [
            [this.getOffsetPoint(-1, -1), this.getOffsetPoint(0, -1), this.getOffsetPoint(1, -1)],
            [this.getOffsetPoint(-1, 0), this.getOffsetPoint(1, 1)],
            [this.getOffsetPoint(-1, 1), this.getOffsetPoint(0, 1), this.getOffsetPoint(1, 1)]
        ];
        return neighbors;
    }
    withinTolerance(color) {
        const dist = (color[0] - this.color[0]) ** 2 + (color[1] - this.color[1]) ** 2 + (color[2] - this.color[2]) ** 2;
        const fill = dist < this.tolerance;
        return fill;
    }
    getOffsetPoint(dx, dy) {
        return new Point(this.x + dx, this.y + dy, this.imageData, this.fill_color);
    }
    getRgb() {
        const index = ((this.y * this.imageData.width) + this.x) * 4;
        return [this.imageData.data[index], this.imageData.data[index + 1], this.imageData.data[index + 2]];
    }
    setRgb(rgb) {
        const index = ((this.y * this.imageData.width) + this.x) * 4;
        this.imageData.data[index] = rgb[0];
        this.imageData.data[index + 1] = rgb[1];
        this.imageData.data[index + 2] = rgb[2];
    }
    toString() {
        return `(${this.x}, ${this.y})`;
    }
}
export const initFloodFill = async (imageCanvasData, canvasElement) => {
    const pixelSelectedDiv = document.getElementById("pixelSelected");
    console.log(2);
    canvasElement.onmousedown = (e) => {
        // const points_to_fill = Array<Point>();
        const ctx = canvasElement.getContext('2d');
        let imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
        let tolerance = parseInt(pixelSelectedDiv.querySelector("#tolerenceInput").value);
        if (tolerance < 0)
            tolerance = 0;
        const coolFill = pixelSelectedDiv.querySelector("#coolFillInput").checked;
        console.log((pixelSelectedDiv.querySelector("#coolFillInput")));
        console.log(coolFill);
        console.log(1);
        let newR = parseInt(pixelSelectedDiv.querySelector("#newRInput").value);
        if (newR > 255)
            newR = 255;
        if (newR < 0)
            newR = 0;
        let newG = parseInt(pixelSelectedDiv.querySelector("#newGInput").value);
        if (newG > 255)
            newG = 255;
        if (newG < 0)
            newG = 0;
        let newB = parseInt(pixelSelectedDiv.querySelector("#newBInput").value);
        if (newB > 255)
            newB = 255;
        if (newB < 0)
            newB = 0;
        if (coolFill) {
            imageCanvasData.coolFill(e.x - imageCanvasData.x, e.y - imageCanvasData.y, tolerance, newR, newG, newB).then(async () => {
                ctx.putImageData(imageCanvasData.imageData, imageCanvasData.x, imageCanvasData.y);
                await new Promise(r => setTimeout(r, 1));
                await createHistogram(imageCanvasData, canvasElement);
            });
        }
        else {
            imageCanvasData.floodFill(e.x - imageCanvasData.x, e.y - imageCanvasData.y, tolerance, newR, newG, newB).then(async () => {
                ctx.putImageData(imageCanvasData.imageData, imageCanvasData.x, imageCanvasData.y);
                await new Promise(r => setTimeout(r, 1));
                await createHistogram(imageCanvasData, canvasElement);
            });
        }
        const p = new Point(e.x, e.y, imageData);
        // ctx.putImageData(imageData, 0, 0);
        updatePixelSelectedDiv(p, imageData, pixelSelectedDiv);
    };
};
const floodFill = async (point, color) => {
    let neighbors = [point];
    point.setRgb(color);
    while (neighbors.length > 0) {
        let new_neightbors = Array();
        neighbors.forEach(n => {
            let nn = n.getNeightbors();
            nn.forEach(nl => {
                nl.forEach(n => {
                    if (n.fill && (n.getRgb() !== color)) {
                        n.setRgb(color);
                        new_neightbors.push(n);
                    }
                });
            });
        });
        neighbors = new_neightbors;
    }
};
const updatePixelSelectedDiv = (point, imageData, pixelSelectedDiv) => {
    const position = pixelSelectedDiv.querySelector("#position");
    const color = pixelSelectedDiv.querySelector("#color");
    position.innerHTML = `${point}`;
    color.innerHTML = `${point.getRgb()}`;
};
