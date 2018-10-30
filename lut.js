import { dom } from "./dom-utils.js";
import { Filters } from "./filters.js";

/**
 * Class representation of the LUT file, responsible for manipulating
 * the LUT content and download.
 */
class LUT {
    constructor(canvas, controls, reference, download, imagePreview) {
        this.canvas = canvas;
        this.controls = controls;
        this.reference = reference;
        this.imagePreview = imagePreview;
        this.filters = [];
        this._referenceData = false;
        dom.listen(download, `click`, evt => this.download());
        this.setupControls();
        this.loadCache();
        this.redraw();
    }

    addFilter(f) {
        this.filters.push(f);
    }

    setupControls() {
        [   `compressor`,
            `saturation_for_lightness`,
            `color_filter`,
            `black_curve`,
            `mid_curve`,
            `highlight_curve`,
        ].forEach(f => dom.add(dom.create(`div`,[ Filters[f](this) ]),this.controls));
    }

    download() {
        let dataURL = this.canvas.toDataURL(); // defaults to png
        let a = dom.create(`a`, `download`, {
            download: `lut.png`,
            href: dataURL,
            style: `display: none`
        });
        dom.add(a);
        a.click();
        dom.remove(a);
    }

    bindImage(img) {
        let w = img.width,
            h = img.height,
            L = w>h ? w : h,
            f = 512/L;

        reference.width = reference.height = 512;

        let ctx = reference.getContext(`2d`)
        ctx.drawImage(img, 0,0, f*w, f*h);
        let data = ctx.getImageData(0,0,reference.width, reference.height);

        // we can't JSON.stringify an ImageData object, for... reasons?
        let obj = { height: data.height, width: data.width, data: Array.from(data.data) };
        localStorage.setItem(`reference`, JSON.stringify(obj));
        this.loadCache();
    }

    loadCache() {
        let cachedImage = localStorage.getItem('reference');
        if (cachedImage) {
            this._referenceData = JSON.parse(cachedImage).data;
            let imageData = new ImageData(Uint8ClampedArray.from(this._referenceData), 512, 512);
            reference.getContext('2d').putImageData(imageData,0,0);
            this.imagePreview.src = reference.toDataURL();
        }
    }

    update() {
        this.redraw();
    }

    redraw() {
        this._cube = false;
        this.drawLUT();
        this.applyLUT();
    }

    drawLUT() {
        let ctx = this.canvas.getContext("2d");

        if (!this._cube) {
            this._cube = this.buildCube();
        }

        this._cube.forEach((slice,idx) => {
            let imageData = new ImageData(Uint8ClampedArray.from(slice), 64, 64);
            let x = (idx / 8) << 6;
            let y = (idx % 8) << 6;
            ctx.putImageData(imageData, x, y);
        });
    }

    buildCube() {
        let cube = [];

        let dim = 64;
        let tiles = 8;
        let xt, yt, x, y, idx;
        let r, g, b, color;
        let slice;

        // build 64 tiles
        for (xt=0; xt<tiles; xt++) {
            for (yt=0; yt<tiles; yt++) {
                slice = [];
                // that are 64x64 each
                b = (xt + yt*tiles) << 2;
                for (x=0; x<dim; x++) {
                    r = x << 2;
                    for (y=0; y<dim; y++) {
                        g = y << 2;
                        idx = (x + dim*y) << 2;
                        color = this.getColor(r,g,b);
                        slice[idx + 0] = color.r;
                        slice[idx + 1] = color.g;
                        slice[idx + 2] = color.b;
                        slice[idx + 3] = 255;
                    }
                }
                cube.push(slice);
            }
        }

        // yielding a 262,144 color cube LUT
        return cube;
    }

    getColor(r,g,b) {
        let color = {r, g, b};
        this.filters.forEach(filter => filter(color));
        return color;
    }

    applyLUT() {
        if (!this._referenceData) return;

        let pixels = this._referenceData.slice();
        let LUT = this.canvas.getContext("2d").getImageData(0, 0, 512, 512).data;
        let r, g, b,
            R, G, B,
            x, y, idx;

        for (let i = 0, e = pixels.length; i < e; i += 4) {
            // get the pixel value
            r = pixels[i];
            g = pixels[i + 1];
            b = pixels[i + 2];

            // get the associated LUT indices
            R = r >> 2;
            G = g >> 2;
            B = b >> 2;
            x = ((B % 8) << 6) + R;
            y = ((B >> 3) << 6) + G;

            // Play it dumb for now: we don't try to compensate
            // for the quantization introduced by the LUT
            idx = (y * 512 + x) * 4;

            // apply LUT and move on to the next pixel.
            pixels[i] = LUT[idx];
            pixels[i + 1] = LUT[idx + 1];
            pixels[i + 2] = LUT[idx + 2];
        }
        this.reference.width = this.reference.height;
        let ctx = this.reference.getContext(`2d`)
        ctx.putImageData(new ImageData(Uint8ClampedArray.from(pixels),512,512), 0, 0);
    }
}

export { LUT };
