const canvas = document.getElementById("game-canvas");
const gl = canvas.getContext("webgl2"); // "API" web gl

if (!gl) {
  console.error("WebGL2 não está disponível");
  throw new Error("WebGL2 não suportado");
}

gl.clearColor(0.0, 0.0, 0.0, 1.0); //o 1.0 é opca
gl.clear(gl.COLOR_BUFFER_BIT);