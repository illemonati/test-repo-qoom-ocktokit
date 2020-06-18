import Extension from '../extension.js';
import 'https://cdn.jsdelivr.net/npm/vue@2.6.11';
import 'https://unpkg.com/vuetify@2.2.20/dist/vuetify.js';
import * as wasm from './wasm/image_hsv_change.js';
import wasm_init from './wasm/image_hsv_change.js';
const config = {
    author: 'Tong Miao',
    email: 'tonymiaotong@tioft.tech',
    domain: 'tongmiao.cloud',
    name: 'hsvChange',
    description: 'This extension will display a hsvChange of the image',
    version: '0.0.1',
    buttonIcon: 'hsvchange/buttonicon.svg',
    settings: 'hsvchange/settings.html',
};
class HsvChangeExtension extends Extension {
    constructor() {
        super(...arguments);
        this.hsvSettings = {
            h: 0,
            s: 0,
            v: 0,
        };
    }
    async onload($container) {
        await super.onload($container);
        await wasm_init();
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
    updateHSV() {
        const ctx = this.$canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, this.$canvas.width, this.$canvas.height);
        wasm.adjust_image_hsv_from_rgb_wasm(this.originialImageData.data, imageData.data, this.hsvSettings.h, 200, this.hsvSettings.s, 200, this.hsvSettings.v, 200, imageData.data.length);
        ctx.putImageData(imageData, 0, 0);
    }
    select(e) {
        super.select(e);
        this.hsvChangeDiv = document.querySelector('#hsvControlsDiv');
        const ctx = this.$canvas.getContext('2d');
        this.hsvSettings = {
            h: 0,
            s: 0,
            v: 0,
        };
        this.originialImageData = ctx.getImageData(0, 0, this.$canvas.width, this.$canvas.height);
        this.vueApp = new Vue({
            el: this.hsvChangeDiv,
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
                hsvSettings: this.hsvSettings,
            },
            watch: {
                hsvSettings: {
                    deep: true,
                    handler: () => {
                        this.updateHSV();
                    },
                },
            },
        });
    }
}
export default new HsvChangeExtension(config);
