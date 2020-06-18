let wasm;
const heap = new Array(32);
heap.fill(undefined);
heap.push(undefined, null, true, false);
function getObject(idx) { return heap[idx]; }
let heap_next = heap.length;
function dropObject(idx) {
    if (idx < 36)
        return;
    heap[idx] = heap_next;
    heap_next = idx;
}
function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}
let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}
function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
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
let cachegetUint16Memory0 = null;
function getUint16Memory0() {
    if (cachegetUint16Memory0 === null || cachegetUint16Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint16Memory0 = new Uint16Array(wasm.memory.buffer);
    }
    return cachegetUint16Memory0;
}
function passArray16ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 2);
    getUint16Memory0().set(arg, ptr / 2);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
* @param {Uint16Array} in_hsv_array
* @param {Uint16Array} out_hsv_array
* @param {number} multiplier
* @param {number} range
* @param {number} array_len
*/
export function adjust_image_brightness_in_hsv_wasm(in_hsv_array, out_hsv_array, multiplier, range, array_len) {
    try {
        var ptr0 = passArray16ToWasm0(in_hsv_array, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArray16ToWasm0(out_hsv_array, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.adjust_image_brightness_in_hsv_wasm(ptr0, len0, ptr1, len1, multiplier, range, array_len);
    }
    finally {
        out_hsv_array.set(getUint16Memory0().subarray(ptr1 / 2, ptr1 / 2 + len1));
        wasm.__wbindgen_free(ptr1, len1 * 2);
    }
}
/**
* @param {Uint16Array} in_hsv_array
* @param {Uint16Array} out_hsv_array
* @param {number} hue_multiplier
* @param {number} hue_range
* @param {number} saturation_multiplier
* @param {number} saturation_range
* @param {number} value_multipler
* @param {number} value_range
* @param {number} array_len
*/
export function adjust_image_hsv_wasm(in_hsv_array, out_hsv_array, hue_multiplier, hue_range, saturation_multiplier, saturation_range, value_multipler, value_range, array_len) {
    try {
        var ptr0 = passArray16ToWasm0(in_hsv_array, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArray16ToWasm0(out_hsv_array, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.adjust_image_hsv_wasm(ptr0, len0, ptr1, len1, hue_multiplier, hue_range, saturation_multiplier, saturation_range, value_multipler, value_range, array_len);
    }
    finally {
        out_hsv_array.set(getUint16Memory0().subarray(ptr1 / 2, ptr1 / 2 + len1));
        wasm.__wbindgen_free(ptr1, len1 * 2);
    }
}
/**
* @param {Uint16Array} in_hsv_array
* @param {Uint16Array} out_hsv_array
* @param {number} multiplier
* @param {number} range
* @param {number} array_len
*/
export function adjust_image_saturation_in_hsv_wasm(in_hsv_array, out_hsv_array, multiplier, range, array_len) {
    try {
        var ptr0 = passArray16ToWasm0(in_hsv_array, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArray16ToWasm0(out_hsv_array, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.adjust_image_saturation_in_hsv_wasm(ptr0, len0, ptr1, len1, multiplier, range, array_len);
    }
    finally {
        out_hsv_array.set(getUint16Memory0().subarray(ptr1 / 2, ptr1 / 2 + len1));
        wasm.__wbindgen_free(ptr1, len1 * 2);
    }
}
/**
* @param {Uint16Array} in_hsv_array
* @param {Uint8Array} out_rgb_array
* @param {number} len
*/
export function convert_hsv_to_rgb_wasm(in_hsv_array, out_rgb_array, len) {
    try {
        var ptr0 = passArray16ToWasm0(in_hsv_array, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArray8ToWasm0(out_rgb_array, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.convert_hsv_to_rgb_wasm(ptr0, len0, ptr1, len1, len);
    }
    finally {
        out_rgb_array.set(getUint8Memory0().subarray(ptr1 / 1, ptr1 / 1 + len1));
        wasm.__wbindgen_free(ptr1, len1 * 1);
    }
}
/**
* @param {Uint8Array} in_rgb_array
* @param {Uint16Array} out_hsv_array
* @param {number} len
*/
export function convert_rgb_to_hsv_wasm(in_rgb_array, out_hsv_array, len) {
    try {
        var ptr0 = passArray8ToWasm0(in_rgb_array, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArray16ToWasm0(out_hsv_array, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.convert_rgb_to_hsv_wasm(ptr0, len0, ptr1, len1, len);
    }
    finally {
        out_hsv_array.set(getUint16Memory0().subarray(ptr1 / 2, ptr1 / 2 + len1));
        wasm.__wbindgen_free(ptr1, len1 * 2);
    }
}
let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}
let cachegetUint32Memory0 = null;
function getUint32Memory0() {
    if (cachegetUint32Memory0 === null || cachegetUint32Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachegetUint32Memory0;
}
function getArrayU32FromWasm0(ptr, len) {
    return getUint32Memory0().subarray(ptr / 4, ptr / 4 + len);
}
/**
* @param {number} color
* @param {Uint8Array} data
* @param {number} len
* @returns {Uint32Array}
*/
export function get_pixel_count_for_color(color, data, len) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.get_pixel_count_for_color(8, color, ptr0, len0, len);
    var r0 = getInt32Memory0()[8 / 4 + 0];
    var r1 = getInt32Memory0()[8 / 4 + 1];
    var v1 = getArrayU32FromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 4);
    return v1;
}
function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
/**
* @param {Uint8Array} data
* @param {number} len
* @returns {MostUsedColor}
*/
export function get_most_used_color(data, len) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    var ret = wasm.get_most_used_color(ptr0, len0, len);
    return MostUsedColor.__wrap(ret);
}
/**
* @param {Uint8Array} in_rgb_array
* @param {Uint8Array} out_rgb_array
* @param {number} len
* @param {number} ev_change
*/
export function change_image_exposure(in_rgb_array, out_rgb_array, len, ev_change) {
    try {
        var ptr0 = passArray8ToWasm0(in_rgb_array, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArray8ToWasm0(out_rgb_array, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.change_image_exposure(ptr0, len0, ptr1, len1, len, ev_change);
    }
    finally {
        out_rgb_array.set(getUint8Memory0().subarray(ptr1 / 1, ptr1 / 1 + len1));
        wasm.__wbindgen_free(ptr1, len1 * 1);
    }
}
function addHeapObject(obj) {
    if (heap_next === heap.length)
        heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];
    heap[idx] = obj;
    return idx;
}
let cachedTextEncoder = new TextEncoder('utf-8');
const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
    }
    : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    });
function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }
    let len = arg.length;
    let ptr = malloc(len);
    const mem = getUint8Memory0();
    let offset = 0;
    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F)
            break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        offset += ret.written;
    }
    WASM_VECTOR_LEN = offset;
    return ptr;
}
/**
*/
export class MostUsedColor {
    static __wrap(ptr) {
        const obj = Object.create(MostUsedColor.prototype);
        obj.ptr = ptr;
        return obj;
    }
    free() {
        const ptr = this.ptr;
        this.ptr = 0;
        wasm.__wbg_mostusedcolor_free(ptr);
    }
    /**
    * @returns {number}
    */
    get times() {
        var ret = wasm.__wbg_get_mostusedcolor_times(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set times(arg0) {
        wasm.__wbg_set_mostusedcolor_times(this.ptr, arg0);
    }
    /**
    * @returns {Uint8Array}
    */
    get get_color() {
        wasm.mostusedcolor_get_color(8, this.ptr);
        var r0 = getInt32Memory0()[8 / 4 + 0];
        var r1 = getInt32Memory0()[8 / 4 + 1];
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
    }
}
function init(module) {
    if (typeof module === 'undefined') {
        module = import.meta.url.replace(/\.js$/, '_bg.wasm');
    }
    let result;
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_new_59cb74e423758ede = function () {
        var ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_558ba5917b466edd = function (arg0, arg1) {
        var ret = getObject(arg1).stack;
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_error_4bb6c2a97407129a = function (arg0, arg1) {
        try {
            console.error(getStringFromWasm0(arg0, arg1));
        }
        finally {
            wasm.__wbindgen_free(arg0, arg1);
        }
    };
    imports.wbg.__wbindgen_object_drop_ref = function (arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_throw = function (arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    if ((typeof URL === 'function' && module instanceof URL) || typeof module === 'string' || (typeof Request === 'function' && module instanceof Request)) {
        const response = fetch(module);
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            result = WebAssembly.instantiateStreaming(response, imports)
                .catch(e => {
                return response
                    .then(r => {
                    if (r.headers.get('Content-Type') != 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                        return r.arrayBuffer();
                    }
                    else {
                        throw e;
                    }
                })
                    .then(bytes => WebAssembly.instantiate(bytes, imports));
            });
        }
        else {
            result = response
                .then(r => r.arrayBuffer())
                .then(bytes => WebAssembly.instantiate(bytes, imports));
        }
    }
    else {
        result = WebAssembly.instantiate(module, imports)
            .then(result => {
            if (result instanceof WebAssembly.Instance) {
                return { instance: result, module };
            }
            else {
                return result;
            }
        });
    }
    return result.then(({ instance, module }) => {
        wasm = instance.exports;
        init.__wbindgen_wasm_module = module;
        return wasm;
    });
}
export default init;