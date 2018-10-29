import { dom } from "./dom-utils.js";
import { Utils } from "./utils.js";


const Filters = {
    setupCompressor: (lut) => {
        let min = 0;
        let max = 255;
        let checked = true;
        let intmap = Utils.intmap;

        lut.filters.push(color => {
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

    setupSaturationForLightness: (lut) => {
        let run = false;
        let impact = 25;
        let impactMin = 1;
        let impactMax = 50;

        lut.filters.push(color => {
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
    }
};

export { Filters };
