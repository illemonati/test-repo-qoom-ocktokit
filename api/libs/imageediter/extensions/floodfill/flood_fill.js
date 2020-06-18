let wasm;
let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null ||
        cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}
let WASM_VECTOR_LEN = 0;
function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
 * @param {number} point_x
 * @param {number} point_y
 * @param {number} tolerence
 * @param {Uint8Array} image_data
 * @param {Uint8Array} out_data
 * @param {number} length
 * @param {number} image_width
 * @param {number} image_height
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function flood_fill(point_x, point_y, tolerence, image_data, out_data, length, image_width, image_height, r, g, b) {
    try {
        var ptr0 = passArray8ToWasm0(image_data, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArray8ToWasm0(out_data, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.flood_fill(point_x, point_y, tolerence, ptr0, len0, ptr1, len1, length, image_width, image_height, r, g, b);
    }
    finally {
        out_data.set(getUint8Memory0().subarray(ptr1 / 1, ptr1 / 1 + len1));
        wasm.__wbindgen_free(ptr1, len1 * 1);
    }
}
/**
 * @param {number} point_x
 * @param {number} point_y
 * @param {number} tolerence
 * @param {Uint8Array} image_data
 * @param {Uint8Array} out_data
 * @param {number} length
 * @param {number} image_width
 * @param {number} image_height
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function cool_fill(point_x, point_y, tolerence, image_data, out_data, length, image_width, image_height, r, g, b) {
    try {
        var ptr0 = passArray8ToWasm0(image_data, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArray8ToWasm0(out_data, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.cool_fill(point_x, point_y, tolerence, ptr0, len0, ptr1, len1, length, image_width, image_height, r, g, b);
    }
    finally {
        out_data.set(getUint8Memory0().subarray(ptr1 / 1, ptr1 / 1 + len1));
        wasm.__wbindgen_free(ptr1, len1 * 1);
    }
}
async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            }
            catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn('`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n', e);
                }
                else {
                    throw e;
                }
            }
        }
        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    }
    else {
        const instance = await WebAssembly.instantiate(module, imports);
        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        }
        else {
            return instance;
        }
    }
}
async function init(input) {
    if (typeof input === 'undefined') {
        input = import.meta.url.replace(/\.js$/, '_bg.wasm');
    }
    const imports = {};
    if (typeof input === 'string' ||
        (typeof Request === 'function' && input instanceof Request) ||
        (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }
    const { instance, module } = await load(await input, imports);
    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;
    return wasm;
}
export default init;
