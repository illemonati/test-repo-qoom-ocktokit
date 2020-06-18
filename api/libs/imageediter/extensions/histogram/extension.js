import Extension from '../extension.js';
import 'https://cdn.jsdelivr.net/npm/vue@2.6.11';
import 'https://unpkg.com/vuetify@2.2.20/dist/vuetify.js';
const config = {
    author: 'Tong Miao',
    email: 'tonymiaotong@tioft.tech',
    domain: 'tongmiao.cloud',
    name: 'histogram',
    description: 'This extension will display a histogram of the image',
    version: '0.0.1',
    buttonIcon: 'histogram/buttonicon.svg',
    settings: 'histogram/settings.html',
};
class HistogramExtension extends Extension {
    constructor() {
        super(...arguments);
        this.histogramImageWrapper = {
            imageUrl: '',
        };
    }
    async onload($container) {
        await super.onload($container);
        const css = document.createElement('link');
        css.href = '/libs/imageediter/vuetify.css';
        css.rel = 'stylesheet';
        document.body.appendChild(css);
        const iconStyles = document.createElement('link');
        iconStyles.rel = 'stylesheet';
        iconStyles.href =
            'https://cdn.jsdelivr.net/npm/@mdi/font@4.x/css/materialdesignicons.min.css';
        document.body.appendChild(iconStyles);
    }
    regenerateHistogram() {
        const ctx = this.$canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, this.$canvas.width, this.$canvas.height);
        const colorCount = {
            r: new Uint32Array(256).fill(0),
            g: new Uint32Array(256).fill(0),
            b: new Uint32Array(256).fill(0),
        };
        for (let i = 0; i < imageData.data.length; i += 4) {
            colorCount.r[imageData.data[i]]++;
            colorCount.g[imageData.data[i + 1]]++;
            colorCount.b[imageData.data[i + 2]]++;
        }
        const histogramCanvas = document.createElement('canvas');
        const hctx = histogramCanvas.getContext('2d');
        hctx.fillStyle = 'rgb(255, 255, 255)';
        hctx.fillRect(0, 0, histogramCanvas.width, histogramCanvas.height);
        const fillStyles = [
            'rgba(255, 0, 0, 0.5)',
            'rgba(0, 255, 0, 0.5)',
            'rgba(0, 0, 255, 0.5)',
        ];
        Object.keys(colorCount).forEach((color, i) => {
            hctx.fillStyle = fillStyles[i];
            colorCount[color].forEach((val, i) => {
                hctx.fillRect(0, i, val, 1);
            });
        });
        const histogramImageData = hctx.getImageData(0, 0, histogramCanvas.width, histogramCanvas.height);
        const data = histogramImageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
                data[i + 3] = 0;
            }
        }
        hctx.putImageData(histogramImageData, 0, 0);
        this.histogramImageWrapper.imageUrl = histogramCanvas.toDataURL();
    }
    select(e) {
        super.select(e);
        this.histogramDiv = document.querySelector('#histogramDiv');
        this.regenerateHistogram();
        this.vueApp = new Vue({
            el: this.histogramDiv,
            vuetify: new Vuetify({
                theme: {
                    dark: true,
                },
            }),
            mounted: function () {
                this.$nextTick(() => {
                    const self = this;
                    self.display = 'flex';
                });
            },
            data: {
                display: 'none',
                histogramImageWrapper: this.histogramImageWrapper,
            },
        });
    }
    imageclick(e) {
        if (!super.imageclick(e)) {
            return false;
        }
        this.regenerateHistogram();
        return true;
    }
}
export default new HistogramExtension(config);
