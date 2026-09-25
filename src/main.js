// CONFIGURAÇÕES INICIAIS CANVAS E WEBGL2
const canvas = document.getElementById("world");
if (!canvas) {
  throw new Error("Canvas não encontrado");
}


// MENU E BOTÕES
const menuPrincipal = document.getElementById("main-menu");
const menuCreditos = document.getElementById("credits-menu");
const menuConfiguracoes = document.getElementById("settings-menu");
const menuPausa = document.getElementById("pause-menu");
const botaoIniciar = document.getElementById("start-game");
const botaoContinuar = document.getElementById("continue-game");
const botaoReiniciar = document.getElementById("restart-game");
const botaoSair = document.getElementById("exit-game");
const botaoGalinha = document.getElementById("chicken-button");
const cronometro = document.getElementById("game-timer");
const textoCronometro = document.getElementById("game-time");
const controleMusica = document.getElementById("music-enabled");
const controleVolume = document.getElementById("music-volume");
const statusMusica = document.getElementById("music-status");
const valorVolume = document.getElementById("volume-value");
let jogoIniciado = false;
let tempoDeJogo = 0;
let colocandoTorre = false;
const torresGalinha = [];
const ovosDisparados = [];
let previewTorre = null;
let ponteiroTorre = null;
let inicioArrasteTorre = null;

const botaoTentarNovamente = document.getElementById("bt-reiniciar");


const TORRE_MEIA_ALTURA = 0.25;
const TORRE_MEIA_LARGURA = TORRE_MEIA_ALTURA / (canvas.width / canvas.height);
const CAMINHO_ESPESSURA = 0.06;
const FATOR_ESPACAMENTO_TORRES = 0.5;
const INTERVALO_TIRO_TORRE = 1.15;
const VELOCIDADE_OVO_PIXELS = 390;
const RAIO_IMPACTO_OVO_PIXELS = 25;
const DURACAO_ANIMACAO_TIRO = 0.48;
const VIDA_RAPOSA = 6;
const DANO_OVO = 1;
const INTERVALO_INICIAL_RAPOSAS = 2.5;
const INTERVALO_MINIMO_RAPOSAS = 0.5;

const menuGameOver = document.getElementById("game-over");

let musicaLigada = true;
let volumeMusica = 0.25;
const musicaMenu = new Audio("assets/audio/musica-menu.mp3");
const musicaInicioPartida = new Audio("assets/audio/inicio-partida.mp3");
const musicaTemaPartida = new Audio("assets/audio/tema-partida.m4a");
const somGameOver = new Audio("assets/audio/morteGalinha.mp3");
const todasAsMusicas = [musicaMenu, musicaInicioPartida, musicaTemaPartida];
let musicaAtivaDaPartida = null;

musicaMenu.loop = true;
musicaTemaPartida.loop = true;
for (const musica of todasAsMusicas) musica.preload = "auto";

try {
  const preferencias = JSON.parse(localStorage.getItem("galinhas-config") || "{}");
  musicaLigada = preferencias.musicaLigada ?? true;
  volumeMusica = preferencias.volume ?? 0.45;
} catch {}

controleMusica.checked = musicaLigada;
controleVolume.value = String(Math.round(volumeMusica * 100));

function salvarConfiguracoes() {
  try {
    localStorage.setItem("galinhas-config", JSON.stringify({ musicaLigada, volume: volumeMusica }));
  } catch {}
}

function atualizarControlesMusica() {
  statusMusica.textContent = musicaLigada ? "Ligada" : "Muda";
  valorVolume.textContent = `${Math.round(volumeMusica * 100)}%`;
  controleVolume.disabled = !musicaLigada;
  for (const musica of todasAsMusicas) {
    musica.volume = volumeMusica;
    musica.muted = !musicaLigada;
  }
}

function reproduzirMusica(musica) {
  musica.play().catch(() => {
    // Navegadores podem bloquear áudio antes da primeira interação do jogador.
  });
}

function reiniciarFaixa(musica) {
  musica.pause();
  try {
    musica.currentTime = 0;
  } catch {}
}

function tocarMusicaDoMenu() {
  musicaInicioPartida.pause();
  musicaTemaPartida.pause();
  reproduzirMusica(musicaMenu);
}

function iniciarAudioDaPartida() {
  musicaMenu.pause();
  reiniciarFaixa(musicaInicioPartida);
  reiniciarFaixa(musicaTemaPartida);
  musicaAtivaDaPartida = musicaInicioPartida;
  reproduzirMusica(musicaInicioPartida);
}

function pausarAudioDaPartida() {
  musicaInicioPartida.pause();
  musicaTemaPartida.pause();
  reproduzirMusica(musicaMenu);
}

function retomarAudioDaPartida() {
  musicaMenu.pause();
  if (musicaAtivaDaPartida === musicaInicioPartida && musicaInicioPartida.ended) {
    musicaAtivaDaPartida = musicaTemaPartida;
  }
  if (!musicaAtivaDaPartida) musicaAtivaDaPartida = musicaTemaPartida;
  reproduzirMusica(musicaAtivaDaPartida);
}

function reiniciarAudioParaMenu() {
  reiniciarFaixa(musicaInicioPartida);
  reiniciarFaixa(musicaTemaPartida);
  musicaAtivaDaPartida = null;
  tocarMusicaDoMenu();
}

musicaInicioPartida.addEventListener("ended", () => {
  if (musicaAtivaDaPartida !== musicaInicioPartida) return;
  musicaAtivaDaPartida = musicaTemaPartida;
  musicaTemaPartida.currentTime = 0;
  if (jogoIniciado) reproduzirMusica(musicaTemaPartida);
});

function abrirMenu(menu) {
  jogoIniciado = false;
  cancelarPosicionamentoTorre();
  tocarMusicaDoMenu();
  menuPrincipal.classList.add("is-hidden");
  menuPausa.classList.add("is-hidden");
  menuCreditos.classList.toggle("is-hidden", menu !== "credits");
  menuConfiguracoes.classList.toggle("is-hidden", menu !== "settings");
}

function voltarAoMenuPrincipal() {
  jogoIniciado = false;
  cancelarPosicionamentoTorre();
  tocarMusicaDoMenu();
  menuCreditos.classList.add("is-hidden");
  menuConfiguracoes.classList.add("is-hidden");
  menuPausa.classList.add("is-hidden");
  menuPrincipal.classList.remove("is-hidden");
  botaoIniciar.focus();
}

function mostrarJogo() {
  jogoIniciado = true;
  canvas.classList.remove("is-blurred");
  menuPrincipal.classList.add("is-hidden");
  menuCreditos.classList.add("is-hidden");
  menuConfiguracoes.classList.add("is-hidden");
  menuPausa.classList.add("is-hidden");
  cronometro.hidden = false;
  botaoGalinha.hidden = false;
  botaoSair.hidden = false;
}

function pausarJogo() {
  jogoIniciado = false;
  pausarAudioDaPartida();
  canvas.classList.add("is-blurred");
  cancelarPosicionamentoTorre();
  menuPrincipal.classList.add("is-hidden");
  menuCreditos.classList.add("is-hidden");
  menuConfiguracoes.classList.add("is-hidden");
  menuPausa.classList.remove("is-hidden");
  cronometro.hidden = true;
  botaoGalinha.hidden = true;
  botaoSair.hidden = true;
}

function reiniciarParaMenuPrincipal() {
  reiniciarAudioParaMenu();
  tempoDeJogo = 0;
  textoCronometro.textContent = "00:00";
  torresGalinha.length = 0;
  ovosDisparados.length = 0;
  raposasEmOnda.length = 0;
  tempoProximaOnda = configOndas.atrasoInicial;
  proximoLadoEsquerdo = true;

  //resstaura a barra de vida
  vida.vidaAtual = vida.vidaMax;
  vida.frameAtual = 0;

  // esconde o menu de Game Over
  menuGameOver.classList.add("is-hidden");
  menuGameOver.hidden = true;

  Object.assign(raposa, {
    indicePonto: 0,
    progresso: 0,
    x: rotaEsquerda[0].x,
    y: rotaEsquerda[0].y,
    tempoAnimacao: 0,
    frameAtual: 0,
    olhandoParaDireita: true,
    vida: VIDA_RAPOSA,
    ativa: true,
  });
  Object.assign(raposaDireita, {
    indicePonto: 0,
    progresso: 0,
    x: rotaDireita[0].x,
    y: rotaDireita[0].y,
    tempoAnimacao: 0,
    frameAtual: 0,
    olhandoParaDireita: false,
    vida: VIDA_RAPOSA,
    ativa: true,
  });

  jogoIniciado = false;
  canvas.classList.add("is-blurred");
  voltarAoMenuPrincipal();
  cronometro.hidden = true;
  botaoGalinha.hidden = true;
  botaoSair.hidden = true;
}


document.getElementById("bt-reiniciar")?.addEventListener("click", reiniciarParaMenuPrincipal);

botaoIniciar.addEventListener("click", () => {
  iniciarAudioDaPartida();
  mostrarJogo();
});
botaoSair.addEventListener("click", pausarJogo);
botaoContinuar.addEventListener("click", () => {
  mostrarJogo();
  retomarAudioDaPartida();
});
botaoReiniciar.addEventListener("click", menuPrincipal);

// FUNCIONALIDADES PARA BOTÃO GALINHA -----------------------------------------------
function posicaoCanvasDoPonteiro(evento) {
  //area do canvas
  const area = canvas.getBoundingClientRect();
  //verifica se o ponteiro está no canvas
  const dentro = evento.clientX >= area.left && evento.clientX <= area.right && evento.clientY >= area.top && evento.clientY <= area.bottom;
  const x = ((evento.clientX - area.left) / area.width) * 2 - 1;
  const y = 1 - ((evento.clientY - area.top) / area.height) * 2;
  return { //limita os valores 
    x: Math.max(-1 + TORRE_MEIA_LARGURA, Math.min(1 - TORRE_MEIA_LARGURA, x)),
    y: Math.max(-1 + TORRE_MEIA_ALTURA, Math.min(1 - TORRE_MEIA_ALTURA, y)),
    dentro,
  };
}


function segmentoInterceptaRetangulo(a, b, esquerda, direita, topo, baixo) {
  let tMin = 0;
  let tMax = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const limites = [
    [-dx, a.x - esquerda],
    [dx, direita - a.x],
    [-dy, a.y - topo],
    [dy, baixo - a.y],
  ];

  for (const [p, q] of limites) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) tMin = Math.max(tMin, t);
    else tMax = Math.min(tMax, t);
    if (tMin > tMax) return false;
  }
  return true;
}

function distanciaQuadradaPontoSegmento(ponto, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const comprimentoQuadrado = dx * dx + dy * dy;
  if (comprimentoQuadrado === 0) {
    return (ponto.x - a.x) ** 2 + (ponto.y - a.y) ** 2;
  }
  const t = Math.max(0, Math.min(1,
    ((ponto.x - a.x) * dx + (ponto.y - a.y) * dy) / comprimentoQuadrado
  ));
  const xMaisProximo = a.x + t * dx;
  const yMaisProximo = a.y + t * dy;
  return (ponto.x - xMaisProximo) ** 2 + (ponto.y - yMaisProximo) ** 2;
}

function distanciaQuadradaPontoRetangulo(ponto, esquerda, direita, topo, baixo) {
  const dx = Math.max(esquerda - ponto.x, 0, ponto.x - direita);
  const dy = Math.max(topo - ponto.y, 0, ponto.y - baixo);
  return dx * dx + dy * dy;
}

function distanciaQuadradaSegmentoRetangulo(a, b, esquerda, direita, topo, baixo) {
  if (segmentoInterceptaRetangulo(a, b, esquerda, direita, topo, baixo)) return 0;
  const cantos = [
    { x: esquerda, y: topo },
    { x: direita, y: topo },
    { x: esquerda, y: baixo },
    { x: direita, y: baixo },
  ];
  return Math.min(
    distanciaQuadradaPontoRetangulo(a, esquerda, direita, topo, baixo),
    distanciaQuadradaPontoRetangulo(b, esquerda, direita, topo, baixo),
    ...cantos.map((canto) => distanciaQuadradaPontoSegmento(canto, a, b)),
  );
}

function torreSobrepoeCaminho(torre) {
  const centroX = (torre.x + 1) * canvas.width / 2;
  const centroY = (1 - torre.y) * canvas.height / 2;
  const meiaLarguraPixels = TORRE_MEIA_LARGURA * canvas.width / 2;
  const meiaAlturaPixels = TORRE_MEIA_ALTURA * canvas.height / 2;
  const esquerda = centroX - meiaLarguraPixels;
  const direita = centroX + meiaLarguraPixels;
  const topo = centroY - meiaAlturaPixels;
  const baixo = centroY + meiaAlturaPixels;

  const distanciaMinima = CAMINHO_ESPESSURA * canvas.height / 2 + 0.5;
  const distanciaMinimaQuadrada = distanciaMinima * distanciaMinima;

  for (const rota of [rotaEsquerda, rotaDireita]) {
    for (let i = 0; i < rota.length - 1; i++) {
      const a = {
        x: (rota[i].x + 1) * canvas.width / 2,
        y: (1 - rota[i].y) * canvas.height / 2,
      };
      const b = {
        x: (rota[i + 1].x + 1) * canvas.width / 2,
        y: (1 - rota[i + 1].y) * canvas.height / 2,
      };
      if (distanciaQuadradaSegmentoRetangulo(
        a,
        b,
        esquerda,
        direita,
        topo,
        baixo,
      ) <= distanciaMinimaQuadrada) return true;
    }
  }
  return false;
}

function posicaoTorreValida(torre) {
  const sobrepoeOutraTorre = torresGalinha.some((existente) =>
    Math.abs(existente.x - torre.x) < TORRE_MEIA_LARGURA * 2 * FATOR_ESPACAMENTO_TORRES &&
    Math.abs(existente.y - torre.y) < TORRE_MEIA_ALTURA * 2 * FATOR_ESPACAMENTO_TORRES
  );
  return !sobrepoeOutraTorre && !torreSobrepoeCaminho(torre);
}

function atualizarPreviewTorre(evento) {
  if (!colocandoTorre || evento.pointerId !== ponteiroTorre) return;
  const posicao = posicaoCanvasDoPonteiro(evento);
  previewTorre = { x: posicao.x, y: posicao.y, dentro: posicao.dentro };
}

function cancelarPosicionamentoTorre() {
  colocandoTorre = false;
  previewTorre = null;
  ponteiroTorre = null;
  inicioArrasteTorre = null;
  botaoGalinha.removeAttribute("aria-pressed");
}

botaoGalinha.addEventListener("pointerdown", (evento) => {
  if (!jogoIniciado || evento.button !== 0) return;
  evento.preventDefault();
  colocandoTorre = true;
  ponteiroTorre = evento.pointerId;
  inicioArrasteTorre = { x: evento.clientX, y: evento.clientY };
  botaoGalinha.setPointerCapture(evento.pointerId);
  botaoGalinha.setAttribute("aria-pressed", "true");
  atualizarPreviewTorre(evento);
});

botaoGalinha.addEventListener("pointermove", atualizarPreviewTorre);

botaoGalinha.addEventListener("pointerup", (evento) => {
  if (!colocandoTorre || evento.pointerId !== ponteiroTorre) return;
  atualizarPreviewTorre(evento);
  const distancia = Math.hypot(
    evento.clientX - inicioArrasteTorre.x,
    evento.clientY - inicioArrasteTorre.y,
  );
  if (distancia > 8 && previewTorre?.dentro && posicaoTorreValida(previewTorre)) {
    torresGalinha.push({
      x: previewTorre.x,
      y: previewTorre.y,
      tempoAteTiro: 0.15,
      animacaoTiro: 0,
    });
  }
  cancelarPosicionamentoTorre();
});

botaoGalinha.addEventListener("pointercancel", cancelarPosicionamentoTorre);

document.querySelectorAll("[data-open-menu]").forEach((botao) => {
  botao.addEventListener("click", () => {
    abrirMenu(botao.dataset.openMenu);
  });
});
document.querySelectorAll("[data-back-menu]").forEach((botao) => {
  botao.addEventListener("click", voltarAoMenuPrincipal);
});

controleMusica.addEventListener("change", () => {
  musicaLigada = controleMusica.checked;
  atualizarControlesMusica();
  if (musicaLigada) {
    if (jogoIniciado) retomarAudioDaPartida();
    else tocarMusicaDoMenu();
  }
  salvarConfiguracoes();
});

controleVolume.addEventListener("input", () => {
  volumeMusica = Number(controleVolume.value) / 100;
  atualizarControlesMusica();
  salvarConfiguracoes();
});

atualizarControlesMusica();
tocarMusicaDoMenu();

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

//tudo padrão de vertex e fragment
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

    o_cor = vec4(corTextura.rgb * u_cor.rgb, corTextura.a * u_cor.a);
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

const vbo = gl.createBuffer();

if (!vbo) {
  throw new Error("Não foi possível criar o buffer de vértices");
}

gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

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

const texturaTorreGalinha = carregarTextura(
  "assets/img/torreGalinha.png"
);

const texturaGalinhaAtiradora = carregarTextura(
  "assets/img/galinha-atiradora.png"
);

const texturaOvos = carregarTextura(
  "assets/img/ovos.png"
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

// VIDA SPRING SHEET
const texturaVida = carregarTextura("assets/img/vidaFox.png");

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
  removerFundo = false,
  opacidade = 1,
  multiplicadorCor = [1, 1, 1]
) {
  const vertices = new Float32Array([
    x1, y1, u1, v1,
    x2, y1, u2, v1,
    x1, y2, u1, v2,

    x1, y2, u1, v2,
    x2, y1, u2, v1,
    x2, y2, u2, v2,
  ]);

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
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
  gl.uniform4f(
    cor,
    multiplicadorCor[0],
    multiplicadorCor[1],
    multiplicadorCor[2],
    opacidade,
  );

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function desenharTorresGalinha() {
  for (const torre of torresGalinha) {
    desenharRetanguloTexturizado(
      torre.x - TORRE_MEIA_LARGURA,
      torre.y - TORRE_MEIA_ALTURA,
      torre.x + TORRE_MEIA_LARGURA,
      torre.y + TORRE_MEIA_ALTURA,
      texturaTorreGalinha
    );

    const totalFrames = 4;
    const progressoAnimacao = torre.animacaoTiro > 0
      ? 1 - torre.animacaoTiro / DURACAO_ANIMACAO_TIRO
      : 0;
    const frame = torre.animacaoTiro > 0
      ? Math.min(totalFrames - 1, Math.floor(progressoAnimacao * totalFrames))
      : 0;
    const u1 = frame / totalFrames;
    const u2 = (frame + 1) / totalFrames;
    const mostrandoCostas = torre.animacaoTiro > 0 &&
      torre.animacaoTiro <= DURACAO_ANIMACAO_TIRO / 2;
    const pixelY = mostrandoCostas ? 16 : 0;
    const v1 = (32 - (pixelY + 16)) / 32;
    const v2 = (32 - pixelY) / 32;
    const meiaAlturaGalinha = 0.056;
    const meiaLarguraGalinha = meiaAlturaGalinha / (canvas.width / canvas.height);
    const centroYGalinha = torre.y + 0.16;
    desenharRetanguloTexturizado(
      torre.x - meiaLarguraGalinha,
      centroYGalinha - meiaAlturaGalinha,
      torre.x + meiaLarguraGalinha,
      centroYGalinha + meiaAlturaGalinha,
      texturaGalinhaAtiradora,
      u1,
      v1,
      u2,
      v2,
      false,
    );
  }

  if (previewTorre && jogoIniciado) {
    const previewValida = previewTorre.dentro && posicaoTorreValida(previewTorre);
    desenharRetanguloTexturizado(
      previewTorre.x - TORRE_MEIA_LARGURA,
      previewTorre.y - TORRE_MEIA_ALTURA,
      previewTorre.x + TORRE_MEIA_LARGURA,
      previewTorre.y + TORRE_MEIA_ALTURA,
      texturaTorreGalinha,
      0,
      0,
      1,
      1,
      false,
      0.48,
      previewValida ? [1, 1, 1] : [1, 0.22, 0.18],
    );
  }
}

//--------------------------------------------------------------------------------------------------
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
  const espessura = CAMINHO_ESPESSURA;
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

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
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
const rotaDireita = suavizarCaminho(waypointsDireita);

//configuração do sprite da raposa

const configSpriteRaposa = {
  larguraSheet: 448,
  alturaSheet: 270,
  larguraFrame: 32,
  alturaFrame: 32,
  linhaAnimacao: 3,
  totalFrames: 8,
  fpsAnimacao: 10,
};

// configuração do sprite da vida
const configSpriteVida = {
  larguraSheet: 784,
  alturaSheet: 500,
  larguraFrame: 64,
  alturaFrame: 16,
  linhaAnimacao: 11,
  totalFrames: 4,
  fpsAnimacao: 10,
};


// A frequência aumenta com o tempo, mas a resistência das raposas não muda.
const configOndas = { atrasoInicial: 0.2 };

function intervaloEntreRaposas(tempoDecorrido) {
  return Math.max(
    INTERVALO_MINIMO_RAPOSAS,
    INTERVALO_INICIAL_RAPOSAS * Math.pow(0.88, tempoDecorrido / 30),
  );
}

const raposa = {
  indicePonto: 0,
  progresso: 0,
  velocidade: 0.10,
  x: waypointsEsquerda[0].x,
  y: waypointsEsquerda[0].y,
  tamanhoY: 0.20,
  tempoAnimacao: 0,
  frameAtual: 0,
  olhandoParaDireita: true,
  vida: VIDA_RAPOSA,
  ativa: true,
};

const raposaDireita = {
  indicePonto: 0,
  progresso: 0,
  velocidade: 0.10,
  x: waypointsDireita[0].x,
  y: waypointsDireita[0].y,
  tamanhoY: 0.20,
  tempoAnimacao: 0,
  frameAtual: 0,
  olhandoParaDireita: false,
  vida: VIDA_RAPOSA,
  ativa: true,
};

//vetor que guarda raposas 
const raposasEmOnda = []; 
let tempoProximaOnda = configOndas.atrasoInicial;
let proximoLadoEsquerdo = true;
//cria as ondas de raposas
function criarRaposaEmOnda(rota, lado) {
  return {rota, //rota que a raposa vai seguir
    indicePonto: 0, //qual ponto da rota a raposa está
    progresso: 0, //quanto ja foi percorrido
    velocidade: 0.10,
    x: rota[0].x,
    y: rota[0].y,
    tamanhoY: 0.20,
    tempoAnimacao: Math.random() * 2, //evita que elas fiquem sincronizadas
    frameAtual: 0,
    ativa: true, //pode criar novas raposas
    vida: VIDA_RAPOSA,
    lado,
  };
}

// Cria uma raposa por vez, alternando os dois caminhos.
function gerarOndaRaposa() {
  const rota = proximoLadoEsquerdo ? rotaEsquerda : rotaDireita;
  const lado = proximoLadoEsquerdo ? "esquerda" : "direita";
  raposasEmOnda.push(criarRaposaEmOnda(rota, lado));
  proximoLadoEsquerdo = !proximoLadoEsquerdo;
}

function raposasDisponiveisComoAlvo() {
  return [
    ...(raposa.ativa ? [raposa] : []),
    ...(raposaDireita.ativa ? [raposaDireita] : []),
    ...raposasEmOnda.filter((raposaAtual) => raposaAtual.ativa),
  ];
}

function causarDanoRaposa(raposaAtual, dano = DANO_OVO) {
  if (!raposaAtual?.ativa) return;
  raposaAtual.vida -= dano;
  if (raposaAtual.vida <= 0) {
    raposaAtual.ativa = false;
  }
}

function removerRaposasDerrotadas() {
  for (let i = raposasEmOnda.length - 1; i >= 0; i--) {
    if (!raposasEmOnda[i].ativa) {
      raposasEmOnda.splice(i, 1);
    }
  }
}

canvas.addEventListener("click", (evento) => {
  if (!jogoIniciado || colocandoTorre) return;

  const area = canvas.getBoundingClientRect();
  const xClique = ((evento.clientX - area.left) / area.width) * 2 - 1;
  const yClique = 1 - ((evento.clientY - area.top) / area.height) * 2;
  const alvos = raposasDisponiveisComoAlvo().reverse();

  for (const raposaAtual of alvos) {
    const meiaAlturaPixels = raposaAtual.tamanhoY * area.height / 4;
    const meiaLarguraPixels = meiaAlturaPixels;
    const distanciaX = Math.abs(raposaAtual.x - xClique) * area.width / 2;
    const distanciaY = Math.abs(raposaAtual.y - yClique) * area.height / 2;

    if (distanciaX <= meiaLarguraPixels && distanciaY <= meiaAlturaPixels) {
      causarDanoRaposa(raposaAtual);
      removerRaposasDerrotadas();
      break;
    }
  }
});

function raposaMaisProxima(torre) {
  const origemY = torre.y + 0.19;
  let alvoMaisProximo = null;
  let menorDistanciaQuadrada = Infinity;

  for (const raposaAtual of raposasDisponiveisComoAlvo()) {
    const dxPixels = (raposaAtual.x - torre.x) * canvas.width / 2;
    const dyPixels = (raposaAtual.y - origemY) * canvas.height / 2;
    const distanciaQuadrada = dxPixels * dxPixels + dyPixels * dyPixels;
    if (distanciaQuadrada < menorDistanciaQuadrada) {
      menorDistanciaQuadrada = distanciaQuadrada;
      alvoMaisProximo = raposaAtual;
    }
  }
  return alvoMaisProximo;
}

function atualizarAtaquesDasTorres(deltaTempo) {
  for (const torre of torresGalinha) {
    torre.tempoAteTiro = (torre.tempoAteTiro ?? 0) - deltaTempo;
    torre.animacaoTiro = Math.max(0, (torre.animacaoTiro ?? 0) - deltaTempo);

    if (torre.tempoAteTiro <= 0) {
      const alvo = raposaMaisProxima(torre);
      if (alvo) {
        torre.alvoDoTiro = alvo;
        torre.ovoDisparadoNesteCiclo = false;
        torre.animacaoTiro = DURACAO_ANIMACAO_TIRO;
        torre.tempoAteTiro = INTERVALO_TIRO_TORRE;
      }
    }

    // O ovo nasce somente quando a galinha já virou de costas.
    if (
      torre.animacaoTiro > 0 &&
      torre.animacaoTiro <= DURACAO_ANIMACAO_TIRO / 2 &&
      !torre.ovoDisparadoNesteCiclo &&
      torre.alvoDoTiro
    ) {
      ovosDisparados.push({
        x: torre.x - 0.025,
        y: torre.y + 0.145,
        alvo: torre.alvoDoTiro,
        frame: 0,
        tempoAnimacao: 0,
      });
      torre.ovoDisparadoNesteCiclo = true;
    }
  }

  for (let i = ovosDisparados.length - 1; i >= 0; i--) {
    const ovo = ovosDisparados[i];
    if (!ovo.alvo || ovo.alvo.ativa === false) {
      ovosDisparados.splice(i, 1);
      continue;
    }

    const dx = ovo.alvo.x - ovo.x;
    const dy = ovo.alvo.y - ovo.y;
    const dxPixels = dx * canvas.width / 2;
    const dyPixels = dy * canvas.height / 2;
    const distanciaPixels = Math.hypot(dxPixels, dyPixels);
    const deslocamentoPixels = VELOCIDADE_OVO_PIXELS * deltaTempo;

    if (distanciaPixels <= RAIO_IMPACTO_OVO_PIXELS + deslocamentoPixels) {
      causarDanoRaposa(ovo.alvo);
      ovosDisparados.splice(i, 1);
      continue;
    }

    const fracaoMovimento = deslocamentoPixels / distanciaPixels;
    ovo.x += dx * fracaoMovimento;
    ovo.y += dy * fracaoMovimento;
    ovo.tempoAnimacao += deltaTempo;
    ovo.frame = Math.floor(ovo.tempoAnimacao * 12) % 4;
  }

  removerRaposasDerrotadas();
}

function atualizarRaposaEmOnda(raposaAtual, deltaTempo) {
  if (!raposaAtual.ativa) return;
  raposaAtual.tempoAnimacao += deltaTempo; //soma o tempo no cont da animação
  const frameCalculado = Math.floor(raposaAtual.tempoAnimacao * configSpriteRaposa.fpsAnimacao);
  raposaAtual.frameAtual = frameCalculado % configSpriteRaposa.totalFrames;

  if (raposaAtual.indicePonto >= raposaAtual.rota.length - 1) {
    raposaAtual.indicePonto = raposaAtual.rota.length - 1;
  }

  //garante que segue a rota 
  const pAtual = raposaAtual.rota[raposaAtual.indicePonto]; 
  const pProx = raposaAtual.rota[Math.min(raposaAtual.indicePonto + 1, raposaAtual.rota.length - 1)];

  const dx = pProx.x - pAtual.x;
  const dy = pProx.y - pAtual.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    raposaAtual.progresso += (raposaAtual.velocidade * deltaTempo) / dist;
  } else {
    raposaAtual.progresso = 1.0;
  }

  while (raposaAtual.progresso >= 1.0 && raposaAtual.indicePonto < raposaAtual.rota.length - 1) {
    raposaAtual.progresso -= 1.0;
    raposaAtual.indicePonto++;
  }

  if (raposaAtual.indicePonto < raposaAtual.rota.length - 1) {
    const p1 = raposaAtual.rota[raposaAtual.indicePonto];
    const p2 = raposaAtual.rota[raposaAtual.indicePonto + 1];

    raposaAtual.x = p1.x + (p2.x - p1.x) * raposaAtual.progresso;
    raposaAtual.y = p1.y + (p2.y - p1.y) * raposaAtual.progresso;

    if (p2.x > p1.x + 0.001) {
      raposaAtual.olhandoParaDireita = true;
    } else if (p2.x < p1.x - 0.001) {
      raposaAtual.olhandoParaDireita = false;
    }
  }
}

//desenha a raposa em onda 
function desenharRaposaEmOnda(raposaAtual) {
  if (!raposaAtual.ativa) return;

  const cfg = configSpriteRaposa;
  const pixelX = raposaAtual.frameAtual * cfg.larguraFrame;
  const pixelY = cfg.linhaAnimacao * cfg.alturaFrame;

  let u1 = pixelX / cfg.larguraSheet;
  let u2 = (pixelX + cfg.larguraFrame) / cfg.larguraSheet;

  if (!raposaAtual.olhandoParaDireita) {
    [u1, u2] = [u2, u1];
  }

  const v1 = (cfg.alturaSheet - (pixelY + cfg.alturaFrame)) / cfg.alturaSheet;
  const v2 = (cfg.alturaSheet - pixelY) / cfg.alturaSheet;

  const aspectCanvas = canvas.width / canvas.height;
  const meiaH = raposaAtual.tamanhoY / 2;
  const meiaW = meiaH / aspectCanvas;

  desenharRetanguloTexturizado(
    raposaAtual.x - meiaW,
    raposaAtual.y - meiaH,
    raposaAtual.x + meiaW,
    raposaAtual.y + meiaH,
    texturaRaposa,
    u1,
    v1,
    u2,
    v2,
    false
  );
}

const vida = {
  x: 0.5,
  y: 0.5,

  frameAtual: 0,
  vidaMax: 100,
  vidaAtual: 100, //verifica quando ainda tem para saber que tem que mudar 

};

function gameOver(){
  jogoIniciado = false;
  canvas.classList.add("is-blurred");

  musicaTemaPartida.pause();
  reproduzirMusica(somGameOver);

  cronometro.hidden = true;
  botaoGalinha.hidden = true;
  botaoSair.hidden = true;

  menuPrincipal.classList.add("is-hidden");
  menuPausa.classList.add("is-hidden");
  menuCreditos.classList.add("is-hidden");
  menuConfiguracoes.classList.add("is-hidden");

  menuGameOver.classList.remove("is-hidden");
  menuGameOver.hidden = false;
}

function danoChickenCoop (dano = 1){
  vida.vidaAtual = Math.max(0, vida.vidaAtual - dano);

  const porcentagem = vida.vidaAtual/vida.vidaMax;
 // vida.frameAtual = Math.floor((1 - porcentagem) * configSpriteVida.totalFrames); //impede que um sprit que nao existe seja lido 
  vida.frameAtual = Math.min(configSpriteVida.totalFrames - 1, Math.floor((1 - porcentagem) * configSpriteVida.totalFrames));
    if(vida.vidaAtual <= 0){
      gameOver();
    }
}

function atualizarRaposaAnimada(raposaAtual, rota, deltaTempo) {
  if (!raposaAtual || !raposaAtual.ativa || !rota || rota.length < 2) return;

  raposaAtual.tempoAnimacao += deltaTempo;
  const frameCalculado = Math.floor(raposaAtual.tempoAnimacao * configSpriteRaposa.fpsAnimacao);
  raposaAtual.frameAtual = frameCalculado % configSpriteRaposa.totalFrames;

  //adicionado para remover as raposas que atacam o chickencoop
  if (raposaAtual.indicePonto >= rota.length - 1) {
    danoChickenCoop(1);

    const indice = raposasEmOnda.indexOf(raposaAtual);
    if (indice != -1){
    raposasEmOnda.splice(indice, 1);
    }
    return; //para nao continuar nessa função e acabar por mover a raposa removida 
  }


  const pAtual = rota[raposaAtual.indicePonto];
  const pProx = rota[Math.min(raposaAtual.indicePonto + 1, rota.length - 1)];

  const dx = pProx.x - pAtual.x;
  const dy = pProx.y - pAtual.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    raposaAtual.progresso += (raposaAtual.velocidade * deltaTempo) / dist;
  } else {
    raposaAtual.progresso = 1.0;
  }

  while (raposaAtual.progresso >= 1.0 && raposaAtual.indicePonto < rota.length - 1) {
    raposaAtual.progresso -= 1.0;
    raposaAtual.indicePonto++;
  }

  if (raposaAtual.indicePonto < rota.length - 1) {
    const p1 = rota[raposaAtual.indicePonto];
    const p2 = rota[raposaAtual.indicePonto + 1];

    raposaAtual.x = p1.x + (p2.x - p1.x) * raposaAtual.progresso;
    raposaAtual.y = p1.y + (p2.y - p1.y) * raposaAtual.progresso;

    if (p2.x > p1.x + 0.001) {
      raposaAtual.olhandoParaDireita = true;
    } else if (p2.x < p1.x - 0.001) {
      raposaAtual.olhandoParaDireita = false;
    }
  }
}

function desenharRaposaAnimada(raposaAtual) {
  if (!raposaAtual.ativa) return;

  const cfg = configSpriteRaposa;

  const pixelX = raposaAtual.frameAtual * cfg.larguraFrame;
  const pixelY = cfg.linhaAnimacao * cfg.alturaFrame;

  let u1 = pixelX / cfg.larguraSheet;
  let u2 = (pixelX + cfg.larguraFrame) / cfg.larguraSheet;

  if (!raposaAtual.olhandoParaDireita) {
    [u1, u2] = [u2, u1];
  }

  const v1 = (cfg.alturaSheet - (pixelY + cfg.alturaFrame)) / cfg.alturaSheet;
  const v2 = (cfg.alturaSheet - pixelY) / cfg.alturaSheet;

  const aspectCanvas = canvas.width / canvas.height;
  const meiaH = raposaAtual.tamanhoY / 2;
  const meiaW = meiaH / aspectCanvas;

  desenharRetanguloTexturizado(
    raposaAtual.x - meiaW,
    raposaAtual.y - meiaH,
    raposaAtual.x + meiaW,
    raposaAtual.y + meiaH,
    texturaRaposa,
    u1,
    v1,
    u2,
    v2,
    false
  );
}

function desenharVida(){
  const cfg = configSpriteVida;

  //posicao em pixels dentro do spritsheet
  const pixelX = vida.frameAtual * cfg.larguraFrame;
  const pixelY = cfg.linhaAnimacao * cfg.alturaFrame;

  const u1 = pixelX / cfg.larguraSheet;
  const u2 = (pixelX + cfg.larguraFrame) / cfg.larguraSheet;
  const v1 = (cfg.alturaSheet - (pixelY + cfg.alturaFrame)) / cfg.alturaSheet;
  const v2 = (cfg.alturaSheet - pixelY) / cfg.alturaSheet;

  //retangulo padrao para colocar a textura
  desenharRetanguloTexturizado(
    -0.16, 0.44, 0.16, 0.52, texturaVida, u1, v1, u2, v2,
    false
  );
}

function desenharOvosDisparados() {
  const alturaSheet = 48;
  const tamanhoFrame = 16;
  const linhaOvoBranco = 32;
  const v1 = (alturaSheet - (linhaOvoBranco + tamanhoFrame)) / alturaSheet;
  const v2 = (alturaSheet - linhaOvoBranco) / alturaSheet;
  const meiaAltura = 0.025;
  const meiaLargura = meiaAltura / (canvas.width / canvas.height);

  for (const ovo of ovosDisparados) {
    const u1 = ovo.frame / 4;
    const u2 = (ovo.frame + 1) / 4;
    desenharRetanguloTexturizado(
      ovo.x - meiaLargura,
      ovo.y - meiaAltura,
      ovo.x + meiaLargura,
      ovo.y + meiaAltura,
      texturaOvos,
      u1,
      v1,
      u2,
      v2,
      false,
    );
  }
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

  desenharTorresGalinha();

  desenharRaposaAnimada(raposa);
  desenharRaposaAnimada(raposaDireita);

  for (const raposaAtual of raposasEmOnda) {
    desenharRaposaEmOnda(raposaAtual);
  }

  desenharOvosDisparados();

  // Galinheiro sobre a área central. As proporções compensam o canvas
  // retangular para que o sprite quadrado não fique achatado.
  desenharRetanguloTexturizado(
    -0.18,
    -0.22,
    0.18,
    0.42,
    texturaGalinheiro
  );  const meiaAltura = 0.18;

  desenharVida();
}



// ----------------------------------------------------------
// LOOP DA ANIMAÇÃO

let tempoAnterior = 0;

function loop(tempoAtual) {
  const deltaTempo = (tempoAtual - tempoAnterior) / 1000 || 0;
  tempoAnterior = tempoAtual;

  if (jogoIniciado) {
    tempoDeJogo += deltaTempo;
    const minutos = Math.floor(tempoDeJogo / 60).toString().padStart(2, "0");
    const segundos = Math.floor(tempoDeJogo % 60).toString().padStart(2, "0");
    textoCronometro.textContent = `${minutos}:${segundos}`;

    tempoProximaOnda -= deltaTempo;

    if (tempoProximaOnda <= 0) {
      gerarOndaRaposa();
      tempoProximaOnda = intervaloEntreRaposas(tempoDeJogo);
    }

   atualizarRaposaAnimada(raposa, rotaEsquerda, deltaTempo);
    atualizarRaposaAnimada(raposaDireita, rotaDireita, deltaTempo);

    for (let i = 0; i < raposasEmOnda.length; i++) {
      atualizarRaposaEmOnda(raposasEmOnda[i], deltaTempo);
    }

    atualizarAtaquesDasTorres(deltaTempo);
  }

  renderizar();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
