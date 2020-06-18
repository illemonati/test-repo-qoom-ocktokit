export const rgbToHsv = async (r, g, b) => {
    const v = Math.max(r, g, b);
    const c = v - Math.min(r, g, b);
    let vars = [0, 0, 0];
    switch (v) {
        case r:
            vars = [0, g, b];
            break;
        case g:
            vars = [2, b, r];
            break;
        case b:
            vars = [4, r, g];
            break;
    }
    const h = (c === 0) ? 0 : (60 * (vars[0] + ((vars[1] - vars[2]) / c)));
    const s = (v === 0) ? 0 : (c / v);
    return [h, s, v];
};
export const applyHTransform = (h, multiplier, range) => {
    const hnew = ((multiplier + range / 2) / (range / 2)) * h;
    // const hnew = h + multiplier;
    // console.log(h);
    // console.log(hnew);
    return hnew % 360;
};
export const applyVTransform = (v, multiplier, range) => {
    const vnew = ((multiplier + range / 2) / (range / 2)) * v;
    // const vnew = v + multiplier;
    return (vnew <= 1) ? vnew : 1;
};
export const applySTransform = (s, multiplier, range) => {
    const snew = ((multiplier + range / 2) / (range / 2)) * s;
    // const snew = s + multiplier;
    return (snew <= 1) ? snew : 1;
};
export const hsvToRgb = async (h, s, v) => {
    const c = v * s;
    const hPrime = h / 60;
    const x = c * (1 - Math.abs((hPrime % 2) - 1));
    const [r1, g1, b1] = ((hPrime > 5) && (hPrime <= 6)) ? [c, 0, x] :
        (hPrime > 4) ? [x, 0, c] :
            (hPrime > 3) ? [0, x, c] :
                (hPrime > 2) ? [0, c, x] :
                    (hPrime > 1) ? [x, c, 0] :
                        (hPrime >= 0) ? [c, x, 0] :
                            [0, 0, 0];
    const m = v - c;
    const [r, g, b] = [r1 + m, g1 + m, b1 + m];
    return [r, g, b];
};
export const adjustPixelHSV = async (h, s, v, hMultiplier, hRange, sMultiplier, sRange, vMultiplier, vRange) => {
    const hnew = applyHTransform(h, hMultiplier, hRange);
    const vnew = applyVTransform(v, vMultiplier, vRange);
    const snew = applySTransform(s, sMultiplier, sRange);
    return [hnew, snew, vnew];
};
