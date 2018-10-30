import { dom } from "./dom-utils.js";
import { Utils } from "./utils.js";


const Filters = {
    /**
     * Compress (and normalize) pixel intensity range.
     */
    compressor: (lut) => {
        let min = 0;
        let max = 255;
        let checked = true;
        let intmap = Utils.intmap;

        lut.addFilter(color => {
            color.r = intmap(color.r, min, max, 0, 255);
            color.g = intmap(color.g, min, max, 0, 255);
            color.b = intmap(color.b, min, max, 0, 255);

            if(!checked) {
                color.r = intmap(color.r, 0, 255, min, max);
                color.g = intmap(color.g, 0, 255, min, max);
                color.b = intmap(color.b, 0, 255, min, max);
            }
        });

        let lower = dom.create(`input`, ``, {
            type: `number`,
            min: 0,
            max: 255,
            step: 1,
            value: min,
            onchange: evt => {
                min = parseInt(evt.target.value);
                lut.update();
            }
        });

        let upper = dom.create(`input`, ``, {
            type: `number`,
            min: 0,
            max: 255,
            step: 1,
            value: max,
            onchange: evt => {
                max = parseInt(evt.target.value);
                lut.update();
            }
        });

        let correct = dom.create(`input`, ``, {
            type: `checkbox`,
            checked: checked,
            onchange: evt => {
                checked = evt.target.checked;
                lut.update();
            }
        });

        let control = dom.create(`fieldset`, [
            lower,
            dom.create(`label`, `compress`),
            upper,
            dom.create(`label`, `normalise?`),
            correct
        ]);

        return control;
    },

    /**
     * Increase saturation as brightness increases.
     */
    saturation_for_lightness: (lut) => {
        let run = false;
        let impact = 25;
        let impactMin = 1;
        let impactMax = 50;

        lut.addFilter(color => {
            if (!run) return;
            Utils.fromRGBtoHSV(color);
            color.s += color.v / (impactMax - (impact-1));
            Utils.fromHSVtoRGB(color);
        });

        let apply = dom.create(`input`, ``, {
            type: `checkbox`,
            checked: run,
            onchange: evt => {
                run = evt.target.checked;
                lut.update();
            }
        });

        let vsat = dom.create(`input`, ``, {
            type: `range`,
            min: impactMin,
            max: impactMax,
            step: 1,
            value: impact,
            onchange: evt => {
                impact = parseInt(evt.target.value);
                lut.update();
            }
        });

        let control = dom.create(`fieldset`, [
            apply,
            dom.create(`label`, `Boost saturation for brightness`),
            vsat
        ]);

        return control;
    },

    /**
     * Filter a particular colour out of the scene.
     */
    color_filter: (lut) => {
        let r=0x6c,
            g=0x54,
            b=0x68,
            strength=15,
            intensity=0.25;

        // preset to zero for distribution...
        r=g=b=strength=intensity=0;

        lut.addFilter(color => {
            let cr = color.r,
                cg = color.g,
                cb = color.b,
                dr = cr - r,
                dg = cg - g,
                db = cb - b,
                d = Math.sqrt(dr*dr + dg*dg + db*db) * 1/strength,
                vr = r/d,
                vg = g/d,
                vb = b/d,
                M = Math.max(vr,vg,vb),
                m = Math.min(vr,vg,vb),
                i = intensity,
                f = i*M + (1-i)*m;
            color.r -= r/d - f;
            color.g -= g/d - f;
            color.b -= b/d - f;
        });

        let rcomponent = dom.create(`input`, ``, {
            type: `number`,
            min: 0,
            max:255,
            step: 1,
            value: r,
            onchange: evt => {
                r = parseInt(evt.target.value);
                lut.update();
            }
        });

        let gcomponent = dom.create(`input`, ``, {
            type: `number`,
            min: 0,
            max:255,
            step: 1,
            value: g,
            onchange: evt => {
                g = parseInt(evt.target.value);
                lut.update();
            }
        });

        let bcomponent = dom.create(`input`, ``, {
            type: `number`,
            min: 0,
            max:255,
            step: 1,
            value: b,
            onchange: evt => {
                b = parseInt(evt.target.value);
                lut.update();
            }
        });

        let sval = dom.create(`input`, ``, {
            type: `range`,
            min: 1,
            max: 100,
            step: 1,
            value: strength,
            onchange: evt => {
                strength = parseInt(evt.target.value);
                lut.update();
            }
        });

        let ival = dom.create(`input`, ``, {
            type: `range`,
            min: 0,
            max: 100,
            step: 1,
            value: intensity * 100,
            onchange: evt => {
                intensity = parseInt(evt.target.value)/100;
                lut.update();
            }
        });

        let control = dom.create(`fieldset`, [
            dom.create(`div`,[
                dom.create(`label`, `Filter out colour:`),
                rcomponent,
                gcomponent,
                bcomponent,
            ]),
            dom.create(`div`,[
                dom.create(`label`, `Filter strength:`),
                sval,
            ]),
            dom.create(`div`,[
                dom.create(`label`, `Intensity backfill:`),
                ival
            ])
        ]);

        return control;
    },

    /**
     * Boost blacks
     */
    black_curve: (lut) => {
        // for blacks, we're running a curve from 0 to 1/2
        // (half-overlapping with shadows)
        let sy = 0.0;
        let cy = 0.0;
        let ey = 0.0;

        // lol quadratic curve for now~
        lut.addFilter(color => {
            Utils.fromRGBtoHSV(color);
            // Map from color.v to quadratic-boosted value,
            // exploiting that color.v is in [0,1]
            let t = color.v * 2;
            if (t>1) return;

            let y = sy * (1-t)**2 + cy * (1-t) * t + ey * t**2;
            color.r += y * 255;
            color.g += y * 255;
            color.b += y * 255;
        });


        let floor = dom.create(`input`, ``, {
            type: `range`,
            min: 0,
            max: 100,
            step: 1,
            value: sy * 100,
            onchange: evt => {
                sy = parseInt(evt.target.value)/100;
                lut.update();
            }
        });

        let ceiling = dom.create(`input`, ``, {
            type: `range`,
            min: 0,
            max: 100,
            step: 1,
            value: sy * 100,
            onchange: evt => {
                ey = parseInt(evt.target.value)/100;
                lut.update();
            }
        });

        let boost = dom.create(`input`, ``, {
            type: `range`,
            min: 0,
            max: 200,
            step: 1,
            value: 100 + (cy * 100),
            onchange: evt => {
                cy = parseInt(evt.target.value - 100)/100;
                lut.update();
            }
        });

        return dom.create(`fieldset`,[
            dom.create(`div`, [
                dom.create(`label`, `Lighten blacks:`),
                boost
            ]),
            dom.create(`div`, [
                dom.create(`label`, `Raise black floor:`),
                floor
            ]),
            dom.create(`div`, [
                dom.create(`label`, `Raise black ceiling:`),
                ceiling
            ])
        ]);
    },

    /**
     * Boost mid-tones
     */
    mid_curve: (lut) => {
        // for shadows, we're running a curve from 1/4 to 3/4
        let sy = 0.0;
        let cy = 0.0;
        let ey = 0.0;

        // lol quadratic curve for now~
        lut.addFilter(color => {
            Utils.fromRGBtoHSV(color);
            // Map from color.v to quadratic-boosted value,
            // exploiting that color.v is in [0,1]
            let t = (color.v - 0.25) * 2;
            if (t<0) return;
            if (t>1) return;

            let y = sy * (1-t)**2 + cy * (1-t) * t + ey * t**2;
            color.r += y * 255;
            color.g += y * 255;
            color.b += y * 255;
        });

        let floor = dom.create(`input`, ``, {
            type: `range`,
            min: 0,
            max: 100,
            step: 1,
            value: sy * 100,
            onchange: evt => {
                sy = parseInt(evt.target.value)/100;
                lut.update();
            }
        });

        let ceiling = dom.create(`input`, ``, {
            type: `range`,
            min: 0,
            max: 100,
            step: 1,
            value: sy * 100,
            onchange: evt => {
                ey = parseInt(evt.target.value)/100;
                lut.update();
            }
        });

        let boost = dom.create(`input`, ``, {
            type: `range`,
            min: 0,
            max: 200,
            step: 1,
            value: 100 + (cy * 100),
            onchange: evt => {
                cy = parseInt(evt.target.value - 100)/100;
                lut.update();
            }
        });

        return dom.create(`fieldset`,[
            dom.create(`div`, [
                dom.create(`label`, `Lighten mid-tones:`),
                boost
            ]),
            dom.create(`div`, [
                dom.create(`label`, `Raise mid-tone floor:`),
                floor
            ]),
            dom.create(`div`, [
                dom.create(`label`, `Raise mid-tone ceiling:`),
                ceiling
            ])
        ]);
    },

    /**
     * Boost highlights
     */
    highlight_curve: (lut) => {
        // for highlights, we're running a curve from 1/2 to 1
        let sy = 0.0;
        let cy = 0.0;
        let ey = 0.0;

        // lol quadratic curve for now~
        lut.addFilter(color => {
            Utils.fromRGBtoHSV(color);
            // Map from color.v to quadratic-boosted value,
            // exploiting that color.v is in [0,1]
            let t = (color.v - 0.5) * 2;
            if (t<0) return;
            if (t>1) return;

            let y = sy * (1-t)**2 + cy * (1-t) * t + ey * t**2;
            color.r += y * 255;
            color.g += y * 255;
            color.b += y * 255;
        });

        let floor = dom.create(`input`, ``, {
            type: `range`,
            min: 0,
            max: 100,
            step: 1,
            value: sy * 100,
            onchange: evt => {
                sy = parseInt(evt.target.value)/100;
                lut.update();
            }
        });

        let ceiling = dom.create(`input`, ``, {
            type: `range`,
            min: 0,
            max: 100,
            step: 1,
            value: sy * 100,
            onchange: evt => {
                ey = parseInt(evt.target.value)/100;
                lut.update();
            }
        });

        let boost = dom.create(`input`, ``, {
            type: `range`,
            min: 0,
            max: 200,
            step: 1,
            value: 100 + (cy * 100),
            onchange: evt => {
                cy = parseInt(evt.target.value - 100)/100;
                lut.update();
            }
        });

        return dom.create(`fieldset`,[
            dom.create(`div`, [
                dom.create(`label`, `Lighten highlights:`),
                boost
            ]),
            dom.create(`div`, [
                dom.create(`label`, `Raise highlight floor:`),
                floor
            ]),
            dom.create(`div`, [
                dom.create(`label`, `Raise highlight ceiling:`),
                ceiling
            ])
        ]);
    }

};

export { Filters };
