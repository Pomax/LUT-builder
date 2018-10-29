// Convenience functions

const π = Math.PI;
const τ = 2 * Math.PI;

const Utils = {
    π:π,
    τ:τ,

    intmap: (v,s1,e1,s2,e2) => {
        v = (((v-s1)*(e2-s2)/(e1-s1)) + s2)|0;
        return v < 0 ? 0 : v > 255? 255 : v;
    },

    /**
     * Generate HSL + Chroma values
     */
    fromRGBtoHSV: (color) => {
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
    },

    /**
     * Generate RGB values (S/L not used atm)
     * H in range [0, 6.28]
     */
    fromHSVtoRGB: (color) => {
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
};

export { Utils };
