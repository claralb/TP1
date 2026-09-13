const canvas = document.getElementById("world");
if (!canvas) {
  throw new Error("Canvas não encontrado");
}
const gl = canvas.getContext("webgl2"); // "API" web gl

if (!gl) {
  console.error("WebGL2 não está disponível");
  throw new Error("WebGL2 não suportado");
}

gl.viewport(0, 0, canvas.width, canvas.height);

const vertexShaderSource = `#version 300 es
in vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec4 uColor;
out vec4 outColor;

void main() {
  outColor = uColor;
}
`;

function criarShader(tipo, codigoFonte) {
  const shader = gl.createShader(tipo);

  gl.shaderSource(shader, codigoFonte);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const erro = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Erro ao compilar shader: ${erro}`);
  }

  return shader;
}

function criarPrograma(vertexShader, fragmentShader) {
  const programa = gl.createProgram();

  gl.attachShader(programa, vertexShader);
  gl.attachShader(programa, fragmentShader);
  gl.linkProgram(programa);

  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
    const erro = gl.getProgramInfoLog(programa);
    gl.deleteProgram(programa);
    throw new Error(`Erro ao criar programa WebGL: ${erro}`);
  }

  return programa;
}

const vertexShader = criarShader(gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = criarShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
const programa = criarPrograma(vertexShader, fragmentShader);

const posicao = gl.getAttribLocation(programa, "aPosition");
const cor = gl.getUniformLocation(programa, "uColor");

const buffer = gl.createBuffer();

if (!buffer) {
  throw new Error("Não foi possível criar o buffer de vértices");
}

gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

function desenharRetangulo(x1, y1, x2, y2, r, g, b, a = 1.0) {
  const vertices = new Float32Array([
    x1, y1,
    x2, y1,
    x1, y2,

    x1, y2,
    x2, y1,
    x2, y2
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.useProgram(programa);
  gl.enableVertexAttribArray(posicao);

  gl.vertexAttribPointer(
    posicao,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.uniform4f(cor, r, g, b, a);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}


gl.clearColor(0.08, 0.14, 0.08, 1.0); //o 1.0 é opca
gl.clear(gl.COLOR_BUFFER_BIT);

/* Gramado */
desenharRetangulo(-1.0, -1.0, 1.0, 1.0, 0.25, 0.45, 0.18);

/* Caminho de terra */
desenharRetangulo(-0.12, -1.0, 0.12, 1.0, 0.68, 0.48, 0.25);

/* Área inicial do galinheiro */
desenharRetangulo(-0.25, -0.25, 0.25, 0.25, 0.75, 0.22, 0.16);

