// DOM helper functions because the regular DOM API is way too verbose
function find(qs, e) { e = e || document.body; return e.querySelector(qs); }
function add(e, t) { t = t || document.body; t.appendChild(e); }
function remove(e) { e.parentNode.removeChild(e); }
function listen(e, n, h) { e.addEventListener(n, h); }
function create(e, content, opts) {
    let r = document.createElement(e);
    if (content.forEach) {
        content.forEach(c => r.appendChild(c));
    } else {
        r.innerHTML = content;
    }
    if (opts) {
        Object.keys(opts).forEach(key => {
            r[key] = opts[key]
        });
    }
    return r;
}


// Convenience functions
let intmap = (v,s1,e1,s2,e2) => {
    v = (((v-s1)*(e2-s2)/(e1-s1)) + s2)|0;
    return v < 0 ? 0 : v > 255? 255 : v;
}

const π = Math.PI;
const τ = 2 * Math.PI;

/**
 * Generate HSL + Chroma values
 */
function fromRGBtoHSV(color) {
    let R=color.r/255,
        G=color.g/255,
        B=color.b/255,
        M = Math.max(R,G,B),
        m = Math.min(R,G,B),
        d = M - m,
        H = 0;

    if (M === R) { H = (0+(G-B)/d) * 60; }
    if (M === G) { H = (2+(B-R)/d) * 60; }
    if (M === B) { H = (4+(R-G)/d) * 60; }
    if (H < 360) { H += 360; }

    color.h = H % 360;
    color.s = (M===0) ? 0 : d/M;
    color.v = M;
};

/**
 * Generate RGB values (S/L not used atm)
 * H in range [0, 6.28]
 */
function fromHSVtoRGB(color) {
    let H = color.h / 60,
        S = color.s,
        V = color.v,
        C = V * S,
        X = C * (1 - Math.abs( (H%2) - 1 )),
        m = V - C,
        R=0, G=0, B=0;

    if (0<=H && H<1) { R=C; G=X; B=0; }
    if (1<=H && H<2) { R=X; G=C; B=0; }
    if (2<=H && H<3) { R=0; G=C; B=X; }
    if (3<=H && H<4) { R=0; G=X; B=C; }
    if (4<=H && H<5) { R=X; G=0; B=C; }
    if (5<=H && H<6) { R=C; G=0; B=X; }

    color.r = (255*(R+m))|0;
    color.g = (255*(G+m))|0;
    color.b = (255*(B+m))|0;
}


// DOM elements we'll be using:
let canvas = document.getElementById(`LUT`);
let controls = document.getElementById(`controls`);
let reference = document.getElementById(`reference`);
let loader = document.querySelector(`.loader`);
let download = document.getElementById(`download`);
let filechooser = document.getElementById(`load`);


/**
 * Class representation of the LUT file, responsible for manipulating
 * the LUT content and download.
 */
class LUT {
    constructor(canvas, controls, reference, download) {
        this.canvas = canvas;
        this.controls = controls;
        this.reference = reference;
        this.filters = [];
        listen(download, `click`, evt => this.download());
        this.setupControls();
        this.invalidate();
        this.update();
    }

    invalidate() {
        let cachedImage = localStorage.getItem('reference');
        if (cachedImage) {
            this._referenceData = JSON.parse(cachedImage).data;
            let imageData = new ImageData(Uint8ClampedArray.from(this._referenceData), 512, 512);
            reference.getContext('2d').putImageData(imageData,0,0);

            setImgAttributes({
                src: reference.toDataURL()
            });
        }
    }

    update() {
        this._cube = false;
        this.drawLUT();
        this.applyLUT();
    }

    drawLUT() {
        let ctx = this.canvas.getContext("2d");

        if (!this._cube) {
            this._cube = this.buildCube();
        }

        this._cube.forEach( (slice,i) => {
            let x = (i/8) << 6;
            let y = (i%8) << 6;
            ctx.putImageData(new ImageData(Uint8ClampedArray.from(slice), 64, 64), x, y);
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

            // play it dumb for now: don't bother correcting the quantization
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

    setupControls() {
        this.addCompressor();
        this.addSaturationForLightness();
    }

    addCompressor() {
        let min = 0;
        let max = 255;
        let checked = true;

        this.filters.push(color => {
            color.r = intmap(color.r, min, max, 0, 255);
            color.g = intmap(color.g, min, max, 0, 255);
            color.b = intmap(color.b, min, max, 0, 255);

            if(!checked) {
                color.r = intmap(color.r, 0, 255, min, max);
                color.g = intmap(color.g, 0, 255, min, max);
                color.b = intmap(color.b, 0, 255, min, max);
            }
        });

        let lower = create(`input`, ``, {
            type: `number`,
            min: 0,
            max: 255,
            step: 1,
            value: min,
            onchange: evt => {
                min = parseInt(evt.target.value);
                this.update();
            }
        });

        let upper = create(`input`, ``, {
            type: `number`,
            min: 0,
            max: 255,
            step: 1,
            value: max,
            onchange: evt => {
                max = parseInt(evt.target.value);
                this.update();
            }
        });

        let correct = create(`input`, ``, {
            type: `checkbox`,
            checked: checked,
            onchange: evt => {
                checked = evt.target.checked;
                this.update();
            }
        });

        let control = create(`fieldset`, [
            lower,
            create(`label`, `compress`),
            upper,
            create(`label`, `normalise?`),
            correct
        ]);

        add(control, this.controls);
    }

    addSaturationForLightness() {
        let impact = 25;

        this.filters.push(color => {
            fromRGBtoHSV(color);
            color.s += color.v / impact;
            fromHSVtoRGB(color);
        });

        let vsat = create(`input`, ``, {
            type: `range`,
            min: 1,
            max: 50,
            step: 1,
            value: impact,
            onchange: evt => {
                impact = parseInt(evt.target.value);
                this.update();
            }
        });

        let control = create(`fieldset`, [
            create(`label`, `Restore saturation in highlights`),
            vsat
        ]);

        add(control, this.controls);
    }

    download() {
        let dataURL = this.canvas.toDataURL(); // defaults to png
        let a = create(`a`, `download`, {
            download: `lut.png`,
            href: dataURL,
            style: `display: none`
        });
        add(a);
        a.click();
        remove(a);
    }
}

// Not much else to do but kick things off at this point...
let lut = new LUT(canvas, controls, reference, download);


// set up browse-for-image handling
listen(filechooser, `change`, evt => handleFileSelect(evt));


// helper function
function setImgAttributes(attributes) {
    Object.keys(attributes).forEach(attr => (loader[attr] = attributes[attr]));
}


// handler for loading a browsed image into the canvas, and caching it to localStorage
// so that on next pageload the user doesn't have to rebrowser for their image.
function handleFileSelect(evt) {
    let files = Array.from(evt.target.files);
    let file = files[0];

    var reader = new FileReader();
    listen(reader, `load`, e => {
        listen(loader, `load`, e => {
            let w = loader.width, h = loader.height, L = w>h ? w : h, f = 512/L;
            reference.width = reference.height = 512;
            let ctx = reference.getContext(`2d`)
            ctx.drawImage(loader,0,0, f*w, f*h);
            let data = ctx.getImageData(0,0,reference.width, reference.height);
            // we can't JSON.stringify image data directly
            let obj = { height: data.height, width: data.width, data: Array.from(data.data) };
            localStorage.setItem(`reference`, JSON.stringify(obj));
            lut.invalidate();
        });

        setImgAttributes({
            src: e.target.result,
            title: file.name
        });
    });

    reader.readAsDataURL(file);
}

