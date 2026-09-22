// CONFIGURAÇÕES INICIAIS CANVAS E WEBGL2
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
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// -------------------------------------------------------------------
// SHADERS: VERTEX E FRAGMENT

const vertexShaderSource = `#version 300 es
in vec2 a_coord;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_coord, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform sampler2D u_textura;
uniform vec4 u_cor;
uniform bool u_usaTextura;
uniform bool u_removeFundo;
in vec2 v_texCoord;
out vec4 o_cor;

void main() {
  if (u_usaTextura) {
    vec4 corTextura = texture(u_textura, v_texCoord);
    vec3 corFundoPedras = vec3(228.0 / 255.0, 166.0 / 255.0, 114.0 / 255.0);

    if (u_removeFundo && distance(corTextura.rgb, corFundoPedras) < 0.01) {
      discard;
    }

    o_cor = corTextura;
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

// -------------------------------------------------------------
// COMPILAÇÃO DOS SHADERS

const vertexShader = criarShader(gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = criarShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
const programa = criarPrograma(vertexShader, fragmentShader);

const posicao = gl.getAttribLocation(programa, "a_coord");
const texCoord = gl.getAttribLocation(programa, "a_texCoord");
const cor = gl.getUniformLocation(programa, "u_cor");
const usaTextura = gl.getUniformLocation(programa, "u_usaTextura"); 
const textura = gl.getUniformLocation(programa, "u_textura");  
const removeFundo = gl.getUniformLocation(programa, "u_removeFundo");

const buffer = gl.createBuffer();

if (!buffer) {
  throw new Error("Não foi possível criar o buffer de vértices");
}

gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

// -----------------------------------------------------------------------------------------------------------
//CARREGA UMA TEXTURA
function carregarTextura(caminho, repetir = false) {
  const texturaWebGL = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texturaWebGL); 

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([255, 255, 255, 0])
  );

  const imagem = new Image();

  imagem.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texturaWebGL);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imagem);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const modo = repetir ? gl.REPEAT : gl.CLAMP_TO_EDGE;

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, modo);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, modo);

    renderizar();
  };

  imagem.src = caminho;
  return texturaWebGL;
}

// function carregarTextura(caminho) {
//   const texturaWebGL = gl.createTexture();
//   gl.bindTexture(gl.TEXTURE_2D, texturaWebGL);

//   const imagem = new Image();
//   imagem.onload = function () {
//   gl.bindTexture(gl.TEXTURE_2D, texturaWebGL);
//   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imagem);
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
//   gl.generateMipmap(gl.TEXTURE_2D);
//   renderizar();
// };
//   imagem.src = caminho;

//   return texturaWebGL;
// }


// ------------------------------------------------------------------------
// TEXTURAS DA CENA

const texturaGramaClara = carregarTextura("assets/img/grassPixel.jpg");

const texturaFazenda = carregarTextura(
  "assets/img/FarmLand_Tile.png"
);

const texturaGalinheiro = carregarTextura(
  "assets/img/Galinheiro.png"
);

const texturaCaminho = carregarTextura(
  "assets/img/Path_Middle.png",
  true
);

const texturaEnfeites = carregarTextura(
  "assets/img/Path_Tile.png"
);

//RAPOSA SPRING SHEET
const texturaRaposa = carregarTextura("assets/img/fox.png");

// -----------------------------------------------------
//FUNÇÕES DO DESENHO BÁSICO

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
  gl.uniform1i(removeFundo, 0);
  gl.disableVertexAttribArray(texCoord);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function desenharRetanguloTexturizado(
  x1,
  y1,
  x2,
  y2,
  texturaWebGL,
  u1 = 0,
  v1 = 0,
  u2 = 1,
  v2 = 1,
  removerFundo = false
) {
  const vertices = new Float32Array([
    x1, y1, u1, v1,
    x2, y1, u2, v1,
    x1, y2, u1, v2,

    x1, y2, u1, v2,
    x2, y1, u2, v1,
    x2, y2, u2, v2,
  ]);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.useProgram(programa);

  gl.enableVertexAttribArray(posicao);
  gl.vertexAttribPointer(
    posicao,
    2,
    gl.FLOAT,
    false,
    16,
    0
  );

  gl.enableVertexAttribArray(texCoord);
  gl.vertexAttribPointer(
    texCoord,
    2,
    gl.FLOAT,
    false,
    16,
    8
  );

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texturaWebGL);

  gl.uniform1i(textura, 0);
  gl.uniform1i(usaTextura, 1);
  gl.uniform1i(removeFundo, removerFundo ? 1 : 0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

//------------------------------------------------------------------------------
// DESENHAR CAMINHO 

const waypointsEsquerda = [
  { x: -1.0, y: 0.4 },
  { x: -0.7, y: 0.4 },
  { x: -0.5, y: 0.0 },
  { x: 0.0, y: 0.0 },
];

const waypointsDireita = [
  { x: 1.0, y: -0.4 },
  { x: 0.7, y: -0.4 },
  { x: 0.5, y: 0.0 },
  { x: 0.0, y: 0.0 },
];

function suavizarCaminho(waypoints, raioPixels = 55, subdivisoes = 10) {
  const paraPixels = (ponto) => ({
    x: ponto.x * canvas.width / 2,
    y: ponto.y * canvas.height / 2,
  });

  const paraWebGL = (ponto) => ({
    x: ponto.x * 2 / canvas.width,
    y: ponto.y * 2 / canvas.height,
  });

  const pontosPixels = waypoints.map(paraPixels);
  const pontosSuavizados = [waypoints[0]];

  for (let i = 1; i < pontosPixels.length - 1; i++) {
    const anterior = pontosPixels[i - 1];
    const curva = pontosPixels[i];
    const proximo = pontosPixels[i + 1];

    const entradaX = curva.x - anterior.x;
    const entradaY = curva.y - anterior.y;
    const saidaX = proximo.x - curva.x;
    const saidaY = proximo.y - curva.y;
    const tamanhoEntrada = Math.hypot(entradaX, entradaY);
    const tamanhoSaida = Math.hypot(saidaX, saidaY);

    const raio = Math.min(
      raioPixels,
      tamanhoEntrada * 0.35,
      tamanhoSaida * 0.35
    );

    const antes = {
      x: curva.x - entradaX / tamanhoEntrada * raio,
      y: curva.y - entradaY / tamanhoEntrada * raio,
    };

    const depois = {
      x: curva.x + saidaX / tamanhoSaida * raio,
      y: curva.y + saidaY / tamanhoSaida * raio,
    };

    pontosSuavizados.push(paraWebGL(antes));

    // Curva quadrática: antes -> ponto da curva -> depois.
    for (let passo = 1; passo <= subdivisoes; passo++) {
      const t = passo / subdivisoes;
      const inverso = 1 - t;

      pontosSuavizados.push(paraWebGL({
        x: inverso * inverso * antes.x +
          2 * inverso * t * curva.x +
          t * t * depois.x,
        y: inverso * inverso * antes.y +
          2 * inverso * t * curva.y +
          t * t * depois.y,
      }));
    }
  }

  pontosSuavizados.push(waypoints[waypoints.length - 1]);
  return pontosSuavizados;
}

function desenharCaminho(waypoints) {
  const pontos = suavizarCaminho(waypoints);
  const espessura = 0.06;
  const meiaLarguraPixels = espessura * canvas.height / 2;
  const tamanhoTilePixels = espessura * canvas.height;
  const normais = [];
  const comprimentos = [];

  // Calcula a direção e a normal de cada trecho em coordenadas de tela.
  for (let i = 0; i < pontos.length - 1; i++) {
    const dx = (pontos[i + 1].x - pontos[i].x) * canvas.width / 2;
    const dy = (pontos[i + 1].y - pontos[i].y) * canvas.height / 2;
    const comprimento = Math.hypot(dx, dy);

    normais.push({ x: -dy / comprimento, y: dx / comprimento });
    comprimentos.push(comprimento);
  }

  // Calcula uma única borda para cada ponto, criando junções diagonais
  // limpas em vez de sobrepor retângulos com pontas sobrando.
  const offsets = pontos.map((_, i) => {
    if (i === 0) {
      return {
        x: normais[0].x * meiaLarguraPixels,
        y: normais[0].y * meiaLarguraPixels,
      };
    }

    if (i === pontos.length - 1) {
      const normal = normais[normais.length - 1];
      return {
        x: normal.x * meiaLarguraPixels,
        y: normal.y * meiaLarguraPixels,
      };
    }

    const normalAnterior = normais[i - 1];
    const proximaNormal = normais[i];
    const somaX = normalAnterior.x + proximaNormal.x;
    const somaY = normalAnterior.y + proximaNormal.y;
    const tamanhoSoma = Math.hypot(somaX, somaY);
    const miterX = somaX / tamanhoSoma;
    const miterY = somaY / tamanhoSoma;
    const escala = meiaLarguraPixels /
      (miterX * proximaNormal.x + miterY * proximaNormal.y);

    return { x: miterX * escala, y: miterY * escala };
  });

  const dadosVertices = [];
  let distanciaAcumulada = 0;

  for (let i = 0; i < pontos.length - 1; i++) {
    const inicio = pontos[i];
    const fim = pontos[i + 1];
    const offsetInicio = offsets[i];
    const offsetFim = offsets[i + 1];
    const uInicio = distanciaAcumulada / tamanhoTilePixels;
    const uFim = (distanciaAcumulada + comprimentos[i]) / tamanhoTilePixels;

    const inicioMenosX = inicio.x - offsetInicio.x * 2 / canvas.width;
    const inicioMenosY = inicio.y - offsetInicio.y * 2 / canvas.height;
    const inicioMaisX = inicio.x + offsetInicio.x * 2 / canvas.width;
    const inicioMaisY = inicio.y + offsetInicio.y * 2 / canvas.height;
    const fimMenosX = fim.x - offsetFim.x * 2 / canvas.width;
    const fimMenosY = fim.y - offsetFim.y * 2 / canvas.height;
    const fimMaisX = fim.x + offsetFim.x * 2 / canvas.width;
    const fimMaisY = fim.y + offsetFim.y * 2 / canvas.height;

    dadosVertices.push(
      inicioMenosX, inicioMenosY, uInicio, 0,
      fimMenosX, fimMenosY, uFim, 0,
      inicioMaisX, inicioMaisY, uInicio, 1,

      inicioMaisX, inicioMaisY, uInicio, 1,
      fimMenosX, fimMenosY, uFim, 0,
      fimMaisX, fimMaisY, uFim, 1
    );

    distanciaAcumulada += comprimentos[i];
  }

  const vertices = new Float32Array(dadosVertices);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.useProgram(programa);

  gl.enableVertexAttribArray(posicao);
  gl.vertexAttribPointer(posicao, 2, gl.FLOAT, false, 16, 0);

  gl.enableVertexAttribArray(texCoord);
  gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 16, 8);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texturaCaminho);
  gl.uniform1i(textura, 0);
  gl.uniform1i(usaTextura, 1);
  gl.uniform1i(removeFundo, 0);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
}
function desenharRecorteAtlas(
  x1,
  y1,
  x2,
  y2,
  pixelX,
  pixelY,
  largura,
  altura
) {
  const atlasLargura = 48;
  const atlasAltura = 96;

  const u1 = (pixelX + 0.5) / atlasLargura;
  const u2 = (pixelX + largura - 0.5) / atlasLargura;

  const v1 =
    (atlasAltura - (pixelY + altura) + 0.5) /
    atlasAltura;

  const v2 =
    (atlasAltura - pixelY - 0.5) /
    atlasAltura;

  desenharRetanguloTexturizado(
    x1,
    y1,
    x2,
    y2,
    texturaEnfeites,
    u1,
    v1,
    u2,
    v2,
    true
  );
}
//   // Preenche o chão com tijolos até o final do canvas
// percorrer todo o desenhar caminho com tijolos
//   for (let y = FLOOR_Y + 57; y < canvas.height + 32; y += 64) {
//     for (let x = 32; x < canvas.width + 32; x += 64) {
//       gl.uniform2f(playerPosLocation, x, y);

//       gl.drawArrays(gl.TRIANGLES, 0, 6);
//     }
//   }

const rotaEsquerda = suavizarCaminho(waypointsEsquerda);

const configSpriteRaposa = { larguraSheet: 448,  alturaSheet: 270,  larguraFrame: 32, alturaFrame: 32, linhaAnimacao: 3, totalFrames: 8, fpsAnimacao: 10};

const raposa = {indicePonto: 0, progresso: 0, velocidade: 0.10,
  x: waypointsEsquerda[0].x,
  y: waypointsEsquerda[0].y,
  tamanhoY: 0.20, //define o tamanho da raposa em relação ao canvas
  tempoAnimacao: 0,
  frameAtual: 0
};

//move para cada frame
function atualizarRaposa(deltaTempo) {
  raposa.tempoAnimacao += deltaTempo;
  const frameCalculado = Math.floor(raposa.tempoAnimacao * configSpriteRaposa.fpsAnimacao);
  raposa.frameAtual = frameCalculado % configSpriteRaposa.totalFrames;

  if (raposa.indicePonto >= rotaEsquerda.length - 1) {
    raposa.indicePonto = 0;
    raposa.progresso = 0;
  }

  const pAtual = rotaEsquerda[raposa.indicePonto];
  const pProx = rotaEsquerda[raposa.indicePonto + 1];

  const dx = pProx.x - pAtual.x;
  const dy = pProx.y - pAtual.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    raposa.progresso += (raposa.velocidade * deltaTempo) / dist;
  } else {
    raposa.progresso = 1.0;
  }

  while (raposa.progresso >= 1.0 && raposa.indicePonto < rotaEsquerda.length - 1) {
    raposa.progresso -= 1.0;
    raposa.indicePonto++;
  }

  if (raposa.indicePonto < rotaEsquerda.length - 1) {
    const p1 = rotaEsquerda[raposa.indicePonto];
    const p2 = rotaEsquerda[raposa.indicePonto + 1];

    raposa.x = p1.x + (p2.x - p1.x) * raposa.progresso;
    raposa.y = p1.y + (p2.y - p1.y) * raposa.progresso;

    if (p2.x > p1.x + 0.001) raposa.olhandoParaDireita = true;
    else if (p2.x < p1.x - 0.001) raposa.olhandoParaDireita = false;
  }
}

function desenharRaposaAnimada() {
  const cfg = configSpriteRaposa;

  const pixelX = raposa.frameAtual * cfg.larguraFrame;
  const pixelY = cfg.linhaAnimacao * cfg.alturaFrame;

  let u1 = pixelX / cfg.larguraSheet;
  let u2 = (pixelX + cfg.larguraFrame) / cfg.larguraSheet;

  const v1 = (cfg.alturaSheet - (pixelY + cfg.alturaFrame)) / cfg.alturaSheet;
  const v2 = (cfg.alturaSheet - pixelY) / cfg.alturaSheet;

  const aspectCanvas = canvas.width / canvas.height;
  const meiaH = raposa.tamanhoY / 2;
  const meiaW = meiaH / aspectCanvas;

  desenharRetanguloTexturizado(raposa.x - meiaW, raposa.y - meiaH, raposa.x + meiaW, raposa.y + meiaH, texturaRaposa,
    u1,
    v1,
    u2,
    v2,
    false
  );
}


// --------------------------------------------------------------------------
// RENDERIZAÇÃO DA CENA

function renderizar() {
  gl.clearColor(0.08, 0.14, 0.08, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

    // Fundo de grama
  desenharRetanguloTexturizado(
    -1.0,
    -1.0,
    1.0,
    1.0,
    texturaGramaClara
  );

  // Caminhos com Path_Middle.png
  desenharCaminho(waypointsEsquerda);
  desenharCaminho(waypointsDireita);

  // Área central com FarmLand_Tile.png
  desenharRetanguloTexturizado(
    -0.25,
    -0.25,
    0.25,
    0.25,
    texturaFazenda
  );

  // Galinheiro sobre a área central. As proporções compensam o canvas
  // retangular para que o sprite quadrado não fique achatado.
  desenharRetanguloTexturizado(
    -0.18,
    -0.22,
    0.18,
    0.42,
    texturaGalinheiro
  );

  // Pedras no caminho esquerdo
  desenharRecorteAtlas(
    -0.90,
    0.36,
    -0.66,
    0.44,
    0,
    80,
    48,
    16
  );

  // Pedras no caminho direito
  desenharRecorteAtlas(
    0.66,
    -0.44,
    0.90,
    -0.36,
    0,
    80,
    48,
    16
  );

  desenharRaposaAnimada();

}

// ----------------------------------------------------------
// LOOP DA ANIMAÇÃO

let tempoAnterior = 0;

function loop(tempoAtual) {
  const deltaTempo = (tempoAtual - tempoAnterior) / 1000 || 0;
  tempoAnterior = tempoAtual;

  atualizarRaposa(deltaTempo);
  renderizar();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
