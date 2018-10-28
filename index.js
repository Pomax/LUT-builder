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
            console.log(key);
            r[key] = opts[key]
        });
    }
    return r;
}

// DOM elements we'll be using:
let canvas = document.getElementById(`LUT`);
let controls = document.getElementById(`controls`);
let reference = document.getElementById(`reference`);
let loader = reference.querySelector(`.loader`);
let download = document.getElementById(`download`);
let filechooser = document.getElementById(`load`);

// set up browse-for-image handling
listen(filechooser, `change`, evt => handleFileSelect(evt));

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
        });
        loader.src = e.target.result;
        loader.title = file.name;
    });

    reader.readAsDataURL(file);
}

/**
 * Class representation of the LUT file, responsible for manipulating
 * the LUT content and download.
 */
class LUT {
    constructor(canvas, controls, reference, download) {
        this.canvas = canvas;
        this.controls = controls;
        this.reference = reference;

        let cachedImage = localStorage.getItem('reference');
        if (cachedImage) {
            this._referenceData = JSON.parse(cachedImage).data;
            let imageData = new ImageData(Uint8ClampedArray.from(this._referenceData), 512, 512);
            reference.getContext('2d').putImageData(imageData,0,0);
        }
        listen(download, `click`, evt => this.download());

        this.lift = 0;

        this.setupControls();
        this.drawLUT();
    }

    drawLUT() {
        let ctx = this.canvas.getContext("2d");
        let dim = 64;
        let tiles = 8;
        let xt, yt, x, y;
        let r, g, b;

        // create 8x8 tiles
        for (xt=0; xt<tiles; xt++) {
            for (yt=0; yt<tiles; yt++) {
                // that are 64x64 each
                b = 4 * (xt + yt*tiles);
                for (x=0; x<dim; x++) {
                    r = 4 * x;
                    for (y=0; y<dim; y++) {
                        g = 4 * y;
                        ctx.fillStyle = this.getColor(r,g,b);
                        ctx.fillRect(xt*dim + x, yt*dim + y, 1, 1);
                    }
                }
            }
        }
    }

    getColor(r,g,b) {
        r += this.lift;
        g += this.lift;
        b += this.lift;
        if (r>255) { r = 255; }
        if (g>255) { g = 255; }
        if (b>255) { b = 255; }
        return `rgb(${r}, ${g}, ${b})`;
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
        // let's start dumb: lift
        let lift = create(`input`, ``, {
            type: `number`,
            min: 0,
            max: 255,
            step: 1,
            value: 0
        });
        let control = create(`div`, [
            create(`label`, `Lift`),
            lift
        ]);
        listen(lift, `change`, evt => {
            this.lift = parseInt(evt.target.value);
            this.drawLUT();
            this.applyLUT();
        });
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
new LUT(canvas, controls, reference, download);
