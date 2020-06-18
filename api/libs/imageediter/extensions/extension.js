const stack = [];
let currentExtension = null;
class Extension {
    constructor(config) {
        if (!config.buttonIcon)
            throw new Error('Please provide a button icon');
        this.buttonIcon = new URL(`${location.origin}/libs/imageediter/extensions/${config.buttonIcon}`);
        this.$canvas = document.querySelector('canvas');
        this.name = config.name;
        this.$section = document.querySelector('section');
        this.$settings = this.$section;
        this.settings = config.settings;
    }
    async onload($container) {
        const $button = document.createElement('button');
        $button.innerHTML = `<img src='${this.buttonIcon}'>`;
        $container.appendChild($button);
        $button.addEventListener('click', this.select.bind(this));
        const self = this;
        this.$canvas.addEventListener('click', function (e) {
            self.imageclick(e);
        });
        if (this.settings) {
            fetch(`/imageediter/extensions/${this.settings}`)
                .then((res) => {
                return res.text();
            })
                .then((data) => {
                self.settingsHtml = data;
            });
        }
    }
    select(e) {
        currentExtension = this.name;
        this.settingsHtml && (this.$settings.innerHTML = this.settingsHtml);
    }
    imageclick(e) {
        if (this.name !== currentExtension)
            return false;
        return true;
    }
    get scale() {
        return parseInt(document.getElementById('zoomlabel').innerText);
    }
}
export default Extension;
