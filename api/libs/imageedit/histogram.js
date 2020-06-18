export const createHistogram = async (imageCanvasData, canvas) => {
    const divs = document.getElementsByClassName('hist');
    for (let i = 0; i < divs.length; i++) {
        divs.item(i).innerHTML = '';
    }
    // Extract Pixels
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(imageCanvasData.x, imageCanvasData.y, imageCanvasData.w, imageCanvasData.h);
    const mostUsedColorDiv = document.getElementById('mostUsedColor');
    mostUsedColorDiv.innerHTML = '';
    //console.log(imageData.data.length);
    //console.log(imageData.data);
    // Create Histogram
    imageCanvasData.getPixelCountForColor(0).then((redhist) => drawHistogram(redhist, 'red'));
    imageCanvasData.getPixelCountForColor(1).then((greenhist) => drawHistogram(greenhist, 'green'));
    imageCanvasData.getPixelCountForColor(2).then((bluehist) => drawHistogram(bluehist, 'blue'));
    // getPixelCountForColor(0, imageData.data).then((redHist) => drawHistogram(redHist, 'red'));
    // getPixelCountForColor(1, imageData.data).then((greenHist) => drawHistogram(greenHist, 'green'));
    // getPixelCountForColor(2, imageData.data).then((blueHist) => drawHistogram(blueHist, 'blue'));
    updateMostUsedColorDiv(mostUsedColorDiv, imageCanvasData);
};
const updateMostUsedColorDiv = async (mostUsedColorDiv, imageCanvasData) => {
    let mostUsed = await imageCanvasData.getMostUsedColor();
    mostUsedColorDiv.innerHTML = `
        <p>Most used color : ${mostUsed.get_color}</p>
        <p>Used : ${mostUsed.times} times </p>
    `;
};
// const getMostUsedColor = async (data: Uint8ClampedArray) : Promise<string> => {
//     let colors = new Map<string, number>();
//     for (let i = 0; i < data.length; i +=4) {
//         const r = data[i];
//         const g = data[i+1];
//         const b = data[i+2];
//         const color = JSON.stringify([r, g, b]);
//         if (colors.has(color)) {
//             colors.set(color, colors.get(color)! + 1);
//         } else {
//             colors.set(color, 1);
//         }
//     }
//     //console.log(colors);
//     const max = [...colors.entries()].reduce((a, e ) => e[1] > a[1] ? e : a);
//     return `
//         <p>Most used color : ${max[0]}</p>
//         <p>Used : ${max[1]} times</p>
//     `
// };
const drawHistogram = async (hist, color) => {
    // debugger;
    const histContainer = document.querySelector(`.hist.${color}`);
    const histContainerSize = histContainer.getBoundingClientRect();
    //console.log(histContainer);
    // @ts-ignore
    const max = Math.max(...hist);
    const ht = histContainerSize.height / 255;
    hist.forEach((hist_val, i) => {
        const div = document.createElement('div');
        div.classList.add(`${color}-hist`);
        div.style.backgroundColor = color;
        div.style.height = ht + 'px';
        div.style.width = `${hist_val / max * 100}%`;
        histContainer.appendChild(div);
    });
};
// const getPixelCountForColor = greenlet (async (index: number, data: Uint8ClampedArray) : Promise<Array<number>> => {
//     // debugger;
//     let result = new Array<number>(256);
//     result.fill(0);
//     for (let i = index; i < data.length; i += 4) {
//         result[data[i]] ++;
//     }
//     return result;
// });
