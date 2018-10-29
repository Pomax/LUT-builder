import { dom } from "./dom-utils.js";
import { LUT } from "./lut.js";
import { ImageLoader } from "./image-loader.js";

// DOM elements we'll be using:
let canvas = dom.find(`#LUT`);
let controls = dom.find(`#controls`);
let reference = dom.find(`#reference`);
let download = dom.find(`#download`);
let imageInput = dom.find(`#load`);
let imagePreview = dom.find(`.loader`);

// Not much else to do but kick things off at this point...
let lut = new LUT(canvas, controls, reference, download, imagePreview);
new ImageLoader(imageInput, imagePreview, img => lut.bindImage(img));
