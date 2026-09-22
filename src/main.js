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


// vertex Shader
const vertexShaderSource = `#version 300 es
in vec2 a_coord;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_coord, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

// Fragment Shader
const fragmentShaderSource = `#version 300 es
precision highp float;

uniform sampler2D u_textura;
uniform vec4 u_cor;
uniform bool u_usaTextura;
in vec2 v_texCoord;
out vec4 o_cor;

void main() {
  if (u_usaTextura) {
    o_cor = texture(u_textura, v_texCoord);
  } else {
    o_cor = u_cor;
  }
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

const posicao = gl.getAttribLocation(programa, "a_coord");
const texCoord = gl.getAttribLocation(programa, "a_texCoord");
const cor = gl.getUniformLocation(programa, "u_cor");
const usaTextura = gl.getUniformLocation(programa, "u_usaTextura"); 
const textura = gl.getUniformLocation(programa, "u_textura");  

const buffer = gl.createBuffer();

if (!buffer) {
  throw new Error("Não foi possível criar o buffer de vértices");
}

gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

//CARREGA UMA TEXTURA
function carregarTextura(caminho) {
  const texturaWebGL = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texturaWebGL);

  const imagem = new Image();
  imagem.onload = function () {
  gl.bindTexture(gl.TEXTURE_2D, texturaWebGL);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imagem);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.generateMipmap(gl.TEXTURE_2D);
  renderizar();
};
  imagem.src = caminho;

  return texturaWebGL;
}

//adiciona grama
const texturaGramaClara = carregarTextura("assets/img/grassPix.jpg");
const texturaGramaEscura = carregarTextura("assets/img/Grass_Middle.png");


function desenharRetangulo(x1, y1, x2, y2, r, g, b, a = 1.0) {
  const vertices = new Float32Array([
    x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2,
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.useProgram(programa);
  gl.enableVertexAttribArray(posicao);

  gl.vertexAttribPointer(posicao, 2, gl.FLOAT, false, 0, 0);

  gl.uniform4f(cor, r, g, b, a);
  gl.uniform1i(usaTextura, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function desenharRetanguloTexturizado(x1, y1, x2, y2, texturaWebGL) {
  const vertices = new Float32Array([
    x1, y1, 0, 0,
    x2, y1, 1, 0,
    x1, y2, 0, 1,

    x1, y2, 0, 1,
    x2, y1, 1, 0,
    x2, y2, 1, 1,
  ]);

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.useProgram(programa);

  gl.enableVertexAttribArray(posicao);
  gl.vertexAttribPointer(posicao, 2, gl.FLOAT, false, 16, 0);

  gl.enableVertexAttribArray(texCoord);
  gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 16, 8);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texturaWebGL);
  gl.uniform1i(textura, 0);
  gl.uniform1i(usaTextura, 1);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/* DESENHAR CAMINHO */

const waypointsEsquerda = [
  { x: -1.0, y: 0.4 },
  { x: -0.6, y: 0.4 },
  { x: -0.6, y: 0.0 },
  { x: -0.2, y: 0.0 },
  { x: 0.0, y: 0.0 },
];

const waypointsDireita = [
  { x: 1.0, y: -0.4 },
  { x: 0.6, y: -0.4 },
  { x: 0.6, y: 0.0 },
  { x: 0.2, y: 0.0 },
  { x: 0.0, y: 0.0 },
];

function desenharCaminho(waypoints) {
  for (let i = 0; i < waypoints.length - 1; i++) {
    const atual = waypoints[i];
    const proximo = waypoints[i + 1];

    const ehHorizontal = atual.y === proximo.y; //se os dois y sao iguais continua no horizontal

    const espessura = 0.06;

    if (ehHorizontal) {
      const x1 = Math.min(atual.x, proximo.x);
      const x2 = Math.max(atual.x, proximo.x);
      const y1 = atual.y - espessura;
      const y2 = atual.y + espessura;
      desenharRetangulo(x1, y1, x2, y2, 0.68, 0.48, 0.25);
    } else {
      const y1 = Math.min(atual.y, proximo.y);
      const y2 = Math.max(atual.y, proximo.y);
      const x1 = atual.x - espessura;
      const x2 = atual.x + espessura;
      desenharRetangulo(x1, y1, x2, y2, 0.68, 0.48, 0.25);
    }
  }
}

//   // Preenche o chão com tijolos até o final do canvas
// percorrer todo o desenhar caminho com tijolos
//   for (let y = FLOOR_Y + 57; y < canvas.height + 32; y += 64) {
//     for (let x = 32; x < canvas.width + 32; x += 64) {
//       gl.uniform2f(playerPosLocation, x, y);

//       gl.drawArrays(gl.TRIANGLES, 0, 6);
//     }
//   }

/* Área inicial do galinheiro */
//desenharRetangulo(-0.25, -0.25, 0.25, 0.25, 0.75, 0.22, 0.16);

function renderizar() {
  gl.clearColor(0.08, 0.14, 0.08, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Preenche a tela inteira com a textura:
  // x1 = -1.0 (esquerda), y1 = -1.0 (baixo), x2 = 1.0 (direita), y2 = 1.0 (cima)
  desenharRetanguloTexturizado(-1.0, -1.0, 1.0, 1.0, texturaGramaClara);

  desenharCaminho(waypointsEsquerda);
  desenharCaminho(waypointsDireita);

  desenharRetangulo(-0.25, -0.25, 0.25, 0.25, 0.75, 0.22, 0.16);
}

renderizar();
