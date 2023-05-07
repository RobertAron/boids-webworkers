"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-expect-error
const three_module_js_1 = require("https://unpkg.com/three@v0.149.0/build/three.module.js");
const THREE = three_module_js_1.default;
const test = new THREE.Vector3();
onmessage = (e) => {
    console.log(test);
};
