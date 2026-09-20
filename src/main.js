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
in vec2 aTexCoord; //

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
//desenharRetangulo(-0.12, -1.0, 0.12, 1.0, 0.68, 0.48, 0.25);

/* Área inicial do galinheiro */
desenharRetangulo(-0.25, -0.25, 0.25, 0.25, 0.75, 0.22, 0.16);

/* SEGMENTOS AINDA EM ALTERAÇÃO

function desenharSegmento (x1, y1, x2, y2, espessura, r, g, b){
  const dx = x2 - x1;
  const dy = y2 - y1;

  //normaliza

  const tamanho = Math.sqrt(dx * dx + dy*dy);
  const dxNorm = dx / tamanho;
  const dyNorm = dy / tamanho;

  const perpX = -dyNorm;
  const perpY = dxNorm;

  const ax1 = x1 + perpX * espessura;
  const ay1 = y1 + perpY * espessura;
  const ax2 = x1 - perpX * espessura;
  const ay2 = y1 - perpY * espessura;
  const bx1 = x2 + perpX * espessura;
  const by1 = y2 + perpY * espessura;
  const bx2 = x2 - perpX * espessura;
  const by2 = y2 - perpY * espessura;

}
 */

/* DESENHAR CAMINHO */

const waypointsEsquerda = [
  {x:-1.0, y:0.4},
  {x:-0.6, y:0.4},
  {x:-0.6, y:0.0},
  {x:-0.2, y:0.0},
  {x:0.0, y:0.0}
]

 const waypointsDireita = [
  {x:1.0, y:-0.4},
  {x:0.6, y:-0.4},
  {x:0.6, y:0.0},
  {x:0.2, y:0.0},
  {x:0.0, y:0.0}
 ]

function desenharCaminho (waypoints){
  for (let i = 0; i<waypoints.length - 1; i++){
    const atual = waypoints[i];
    const proximo =  waypoints[i+1];

    const ehHorizontal = atual.y === proximo.y; //se os dois y sao iguais continua no horizontal

    const espessura = 0.06;

    if (ehHorizontal) {
    const x1 = Math.min(atual.x, proximo.x);
    const x2 = Math.max(atual.x, proximo.x);
    const y1 = atual.y - espessura;
    const y2 = atual.y + espessura;
    desenharRetangulo(x1, y1, x2, y2, 0.68, 0.48, 0.25);
      } 
      else {
    const y1 = Math.min(atual.y, proximo.y);
    const y2 = Math.max(atual.y, proximo.y);
    const x1 = atual.x - espessura;
    const x2 = atual.x + espessura;
    desenharRetangulo(x1, y1, x2, y2, 0.68, 0.48, 0.25);
      } 
  }
}

desenharCaminho(waypointsEsquerda);
desenharCaminho(waypointsDireita);
