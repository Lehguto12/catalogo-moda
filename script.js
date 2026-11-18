// ===== Catálogo de roupas | Fase 1: base e dados =====

let PRODUTOS = []; // lista global, reaproveitada nas próximas fases

// ----- Utilitários -----
const el = (id) => document.getElementById(id);

// Remove acentos, caixa e símbolos (ex.: "Preço_Promocional" vira "preco_promocional")
function normalizar(txt) {
  return String(txt || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Protege o HTML contra caracteres especiais vindos da planilha
function esc(txt) {
  return String(txt).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function listar(txt, separador) {
  return String(txt || "").split(separador).map((x) => x.trim()).filter(Boolean);
}

// Aceita "59,90", "59.90" e "1.299,90"
function paraNumero(v) {
  let s = String(v || "").replace(/[^\d,.-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatarPreco(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Pessoa pediu menos animação no sistema? Então a rolagem da galeria não deve deslizar.
const semMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Foto que não carrega (link quebrado, arquivo ausente): troca pela inicial do nome.
// O evento "error" não "sobe" no HTML, por isso o ouvinte usa o modo de captura (true).
document.addEventListener("error", (e) => {
  const img = e.target;
  if (!img || img.tagName !== "IMG") return;
  const mini = img.closest(".mini");
  if (mini) { mini.hidden = true; return; } // miniatura quebrada some
  const marcador = document.createElement("div");
  marcador.className = "sem-foto";
  marcador.setAttribute("aria-hidden", "true");
  marcador.textContent = (img.alt || "?").trim().charAt(0).toUpperCase() || "?";
  img.replaceWith(marcador);
}, true);

// ----- Tema e cabeçalho -----
function aplicarTema() {
  const raiz = document.documentElement.style;
  raiz.setProperty("--fundo", CONFIG.cores.fundo);
  raiz.setProperty("--texto", CONFIG.cores.texto);
  raiz.setProperty("--principal", CONFIG.cores.principal);
  raiz.setProperty("--destaque", CONFIG.cores.destaque);
  document.title = CONFIG.nomeLoja + " | Catálogo";
  if (el("nomeLoja")) el("nomeLoja").textContent = CONFIG.nomeLoja;
  if (el("slogan")) el("slogan").textContent = CONFIG.slogan;
  if (el("aviso")) el("aviso").textContent = CONFIG.mensagemAviso;
}

// Contador do carrinho no cabeçalho (número + texto do link para leitores de tela)
function atualizarContador() {
  const contador = el("contadorCarrinho");
  if (!contador) return;
  let total = 0;
  try {
    const itens = JSON.parse(localStorage.getItem("carrinho") || "[]");
    total = itens.reduce((soma, i) => soma + (i.qtd || 1), 0);
  } catch {
    total = 0;
  }
  contador.textContent = total;
  // O aria-label substitui o texto visível, então ele precisa conter a quantidade
  contador.parentElement.setAttribute("aria-label", "Ver carrinho, " + total + (total === 1 ? " item" : " itens"));
}

// ----- Leitura do CSV -----
// Parser que respeita aspas (vírgulas dentro de "..." não separam colunas)
function parseCSV(texto) {
  const linhas = [];
  let linha = [], campo = "", aspas = false;
  const fecharLinha = () => {
    linha.push(campo);
    campo = "";
    if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
    linha = [];
  };
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fecharLinha();
    } else campo += c;
  }
  fecharLinha();
  return linhas;
}

// Largura (em pixels) pedida ao Drive. Mais alto = foto mais nítida e mais pesada.
const LARGURA_FOTO_DRIVE = 1000;

// O lojista pode colar na planilha o link normal de compartilhamento do Google Drive.
// Esse link abre uma página do Drive, não a imagem, então aqui ele é trocado pelo
// endereço de miniatura, que o navegador consegue usar dentro de um <img>.
// Caminhos como "img/foto.jpg" e URLs de outros sites passam sem mudança.
// Se o Google mudar esse formato, o ajuste é só nesta função.
function urlDaImagem(url) {
  const u = String(url).trim();
  // Formatos aceitos: /file/d/ID/view, /open?id=ID e /uc?...id=ID
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?(?:[^#]*&)?id=|uc\?(?:[^#]*&)?id=)([\w-]+)/);
  if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w" + LARGURA_FOTO_DRIVE;
  if (/drive\.google\.com\/drive\/folders\//.test(u)) {
    console.warn("Link de PASTA do Drive não funciona como foto. Use o link de cada arquivo:", u);
  }
  return u;
}

async function carregarProdutos() {
  const url = CONFIG.urlPlanilhaCSV || "data/produtos-exemplo.csv";
  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) throw new Error("Falha ao ler a planilha (HTTP " + resposta.status + ")");

  const linhas = parseCSV((await resposta.text()).replace(/^\uFEFF/, ""));
  const cabecalho = linhas.shift().map((h) => normalizar(h).replace(/[^a-z0-9]+/g, "_"));

  return linhas
    .map((l) => {
      const o = {};
      cabecalho.forEach((chave, i) => (o[chave] = (l[i] || "").trim()));
      return {
        id: o.id,
        nome: o.nome,
        categoria: o.categoria,
        tipo: o.tipo,
        preco: paraNumero(o.preco),
        precoPromo: paraNumero(o.preco_promocional),
        imagens: listar(o.imagem_url, "|").map(urlDaImagem),
        descricao: o.descricao,
        tamanhos: listar(o.tamanhos, ",").map((t) => t.toUpperCase()),
        disponiveis: listar(o.disponiveis, ",").map((t) => t.toUpperCase()),
        ultimas: normalizar(o.ultimas_unidades) === "sim",
        destaque: normalizar(o.destaque) === "sim",
        ativo: normalizar(o.ativo) !== "nao" // célula vazia conta como ativo
      };
    })
    .filter((p) => p.id && p.nome && p.ativo);
}

// ----- Vitrine -----
function cardHTML(p) {
  const esgotado = p.disponiveis.length === 0;
  const emPromo = p.precoPromo > 0 && p.precoPromo < p.preco;

  const foto = p.imagens[0]
    ? `<img src="${esc(p.imagens[0])}" alt="${esc(p.nome)}" loading="lazy" decoding="async">`
    : `<div class="sem-foto" aria-hidden="true">${esc(p.nome.charAt(0))}</div>`;

  const selos = [
    esgotado ? '<span class="selo esgotado">Esgotado</span>' : "",
    !esgotado && p.ultimas ? '<span class="selo alerta">Últimas unidades</span>' : "",
    !esgotado && p.destaque ? '<span class="selo">Destaque</span>' : ""
  ].join("");

  const preco = emPromo
    ? `<s>${formatarPreco(p.preco)}</s><span class="promo">${formatarPreco(p.precoPromo)}</span>`
    : formatarPreco(p.preco);

  return `
    <a class="card${esgotado ? " esgotado" : ""}" href="produto.html?id=${encodeURIComponent(p.id)}">
      <div class="foto">${foto}<div class="selos">${selos}</div></div>
      <h2 class="nome">${esc(p.nome)}</h2>
      <p class="tipo">${esc(p.tipo)}</p>
      <p class="preco">${preco}</p>
    </a>`;
}

function mostrarCarregando() {
  el("vitrine").innerHTML = '<div class="skeleton"></div>'.repeat(8);
}

function mostrarMensagem(texto, comBotao) {
  el("vitrine").innerHTML =
    `<div class="mensagem"><p>${texto}</p>` +
    (comBotao ? '<button onclick="iniciarVitrine()">Tentar de novo</button>' : "") +
    "</div>";
}

async function iniciarVitrine() {
  aplicarTema();
  atualizarContador();
  mostrarCarregando();
  try {
    PRODUTOS = await carregarProdutos();
    if (PRODUTOS.length === 0) {
      mostrarMensagem("Ainda não há produtos no catálogo.", false);
      return;
    }
    montarChips("chipsCategoria", "categoria", valoresUnicos("categoria"));
    montarChips("chipsTipo", "tipo", valoresUnicos("tipo"));
    el("busca").oninput = (e) => { FILTRO.busca = e.target.value; aplicarFiltros(); };
    aplicarFiltros();
  } catch (erro) {
    console.error(erro);
    mostrarMensagem("Não foi possível carregar os produtos. Verifique a conexão e tente de novo.", true);
  }
}


// ===== Fase 2: busca e filtros =====
let FILTRO = { busca: "", categoria: "", tipo: "" };

function valoresUnicos(campo) {
  return [...new Set(PRODUTOS.map((p) => p[campo]).filter(Boolean))];
}

function montarChips(idEl, chave, valores) {
  const caixa = el(idEl);
  caixa.innerHTML = ["", ...valores].map((v) =>
    `<button type="button" class="chip" data-valor="${esc(v)}" aria-pressed="${FILTRO[chave] === v}">${v ? esc(v) : "Todos"}</button>`
  ).join("");
  caixa.onclick = (e) => {
    const botao = e.target.closest(".chip");
    if (!botao) return;
    FILTRO[chave] = botao.dataset.valor;
    caixa.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === botao));
    aplicarFiltros();
  };
}

function aplicarFiltros() {
  const termo = normalizar(FILTRO.busca);
  const lista = PRODUTOS.filter((p) =>
    (!FILTRO.categoria || p.categoria === FILTRO.categoria) &&
    (!FILTRO.tipo || p.tipo === FILTRO.tipo) &&
    (!termo || normalizar(p.nome + " " + p.tipo).includes(termo))
  );
  el("vitrine").innerHTML = lista.length
    ? lista.map(cardHTML).join("")
    : '<div class="mensagem"><p>Nenhum produto encontrado. Tente outro termo ou escolha "Todos".</p></div>';
  // Anuncia só a contagem para leitores de tela
  if (el("statusVitrine")) {
    el("statusVitrine").textContent = lista.length === 1 ? "1 produto encontrado." : lista.length + " produtos encontrados.";
  }
}

// ===== Fase 2: página do produto =====
async function iniciarProduto() {
  aplicarTema();
  atualizarContador();
  const alvo = el("produto");
  const id = new URLSearchParams(location.search).get("id");
  try {
    PRODUTOS = await carregarProdutos();
  } catch (erro) {
    console.error(erro);
    alvo.innerHTML = '<div class="mensagem"><p>Não foi possível carregar o produto. Tente de novo.</p><button onclick="iniciarProduto()">Tentar de novo</button></div>';
    return;
  }
  const p = PRODUTOS.find((x) => x.id === id);
  if (!p) {
    alvo.innerHTML = '<div class="mensagem"><p>Produto não encontrado.</p><a href="index.html">Voltar ao catálogo</a></div>';
    return;
  }
  document.title = p.nome + " | " + CONFIG.nomeLoja;

  const emPromo = p.precoPromo > 0 && p.precoPromo < p.preco;
  const preco = emPromo
    ? `<s>${formatarPreco(p.preco)}</s><span class="promo">${formatarPreco(p.precoPromo)}</span>`
    : formatarPreco(p.preco);

  const slides = p.imagens.length
    ? p.imagens.map((f, i) => `<img src="${esc(f)}" alt="${esc(p.nome)}, foto ${i + 1}" decoding="async"${i ? ' loading="lazy"' : ""}>`).join("")
    : `<div class="sem-foto" aria-hidden="true">${esc(p.nome.charAt(0))}</div>`;
  const minis = p.imagens.length > 1
    ? `<div class="minis">${p.imagens.map((f, i) =>
        `<button type="button" class="mini" data-i="${i}" aria-label="Ver foto ${i + 1}" aria-current="${i === 0}"><img src="${esc(f)}" alt=""></button>`).join("")}</div>`
    : "";

  alvo.innerHTML = `
    <div class="galeria"><div class="faixa" id="faixa"${p.imagens.length > 1 ? ` tabindex="0" role="region" aria-label="Fotos de ${esc(p.nome)}"` : ""}>${slides}</div>${minis}</div>
    <div class="info">
      <h1>${esc(p.nome)}</h1>
      <p class="tipo">${esc(p.categoria)} | ${esc(p.tipo)}</p>
      <p class="preco">${preco}</p>
      <p class="descricao">${esc(p.descricao)}</p>
      <div id="areaTamanhos"></div> <!-- Fase 3: botões de tamanho -->
    </div>`;

  montarTamanhos(p);

  // Galeria: deslizar no celular e clicar nas miniaturas
  const faixa = el("faixa");
  const botoes = [...document.querySelectorAll(".mini")];
  botoes.forEach((b) => b.onclick = () =>
    faixa.scrollTo({ left: faixa.clientWidth * Number(b.dataset.i), behavior: semMovimento() ? "auto" : "smooth" }));
  faixa.onscroll = () => {
    const atual = Math.round(faixa.scrollLeft / faixa.clientWidth);
    botoes.forEach((b, i) => b.setAttribute("aria-current", i === atual));
  };
}


// ===== Fase 3: tamanhos e validação =====
function precoFinal(p) {
  return p.precoPromo > 0 && p.precoPromo < p.preco ? p.precoPromo : p.preco;
}

// Guarda no localStorage (a página do carrinho nasce na Fase 4)
function adicionarAoCarrinho(id, tamanho) {
  let itens = [];
  try { itens = JSON.parse(localStorage.getItem("carrinho") || "[]"); } catch { itens = []; }
  const existente = itens.find((i) => i.id === id && i.tamanho === tamanho);
  if (existente) existente.qtd += 1;
  else itens.push({ id, tamanho, qtd: 1 });
  localStorage.setItem("carrinho", JSON.stringify(itens));
  atualizarContador();
}

function linkWhatsApp(p, tamanho) {
  const url = new URL("produto.html?id=" + encodeURIComponent(p.id), location.href).href;
  const msg = `Olá! Quero fazer um pedido:\n\n1x ${p.nome}, tamanho ${tamanho}, ${formatarPreco(precoFinal(p))}\nLink: ${url}`;
  return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg);
}

function montarTamanhos(p) {
  const area = el("areaTamanhos");
  if (p.disponiveis.length === 0) {
    area.innerHTML = '<p class="aviso-estoque">Produto esgotado no momento.</p>';
    return;
  }
  // Todos os tamanhos do modelo: os sem estoque ficam riscados e desabilitados
  const todos = [...new Set([...p.tamanhos, ...p.disponiveis])];
  let escolhido = "";

  area.innerHTML = `
    <p class="rotulo" id="rotuloTamanho">Tamanho</p>
    <div class="tamanhos" role="group" aria-labelledby="rotuloTamanho">
      ${todos.map((t) => {
        const ok = p.disponiveis.includes(t);
        return `<button type="button" class="tam" data-t="${esc(t)}" aria-pressed="false"${ok ? "" : ` disabled aria-label="${esc(t)}, esgotado"`}>${esc(t)}</button>`;
      }).join("")}
    </div>
    ${p.ultimas ? '<p class="aviso-estoque alerta">Últimas unidades</p>' : ""}
    <p class="dica" id="dicaTamanho" aria-live="polite">Escolha um tamanho para continuar.</p>
    <div class="acoes">
      <button type="button" class="btn" id="btnCarrinho" disabled>Adicionar ao carrinho</button>
      <button type="button" class="btn secundario" id="btnWhats" disabled>Pedir pelo WhatsApp</button>
    </div>
    <p class="nota">${esc(CONFIG.mensagemAviso)}</p>`;

  const botoes = [...area.querySelectorAll(".tam")];
  botoes.forEach((b) => {
    b.onclick = () => {
      escolhido = b.dataset.t;
      botoes.forEach((x) => x.setAttribute("aria-pressed", x === b));
      el("btnCarrinho").disabled = false;
      el("btnWhats").disabled = false;
      el("dicaTamanho").textContent = "Tamanho " + escolhido + " selecionado.";
    };
  });
  el("btnCarrinho").onclick = () => {
    adicionarAoCarrinho(p.id, escolhido);
    el("dicaTamanho").textContent = "Adicionado ao carrinho (tamanho " + escolhido + ").";
  };
  el("btnWhats").onclick = () => window.open(linkWhatsApp(p, escolhido), "_blank", "noopener");
}


// ===== Fase 4: carrinho e finalização no WhatsApp =====
const MAX_QTD = 99; // a planilha não informa quantidade em estoque, então o limite é fixo

// Lê o localStorage e "limpa" cada item (id e tamanho como texto, qtd entre 1 e MAX_QTD)
function lerCarrinho() {
  let itens = [];
  try { itens = JSON.parse(localStorage.getItem("carrinho") || "[]"); } catch { itens = []; }
  if (!Array.isArray(itens)) return [];
  return itens
    .filter((i) => i && i.id)
    .map((i) => ({
      id: String(i.id),
      tamanho: String(i.tamanho || ""),
      qtd: Math.min(MAX_QTD, Math.max(1, parseInt(i.qtd, 10) || 1))
    }));
}

function salvarCarrinho(itens) {
  localStorage.setItem("carrinho", JSON.stringify(itens));
  atualizarContador();
}

// Cruza o item do carrinho com a planilha atual. Devolve um destes códigos:
// "ok" | "removido" (saiu da planilha ou ficou inativo) | "esgotado" | "semTamanho"
function situacaoItem(item, p) {
  if (!p) return "removido"; // carregarProdutos() já descarta os inativos
  if (p.disponiveis.length === 0) return "esgotado";
  if (!p.disponiveis.includes(item.tamanho.toUpperCase())) return "semTamanho";
  return "ok";
}

function textoProblema(situacao, item) {
  if (situacao === "removido") return "Este produto não está mais no catálogo.";
  if (situacao === "esgotado") return "Produto esgotado no momento.";
  return "O tamanho " + item.tamanho + " esgotou.";
}

// Monta o texto do pedido no formato combinado (só itens "ok")
function mensagemPedido(validas, total) {
  const blocos = validas.map(({ item, p }) => {
    const url = new URL("produto.html?id=" + encodeURIComponent(p.id), location.href).href;
    const preco = formatarPreco(precoFinal(p));
    const valor = item.qtd > 1 ? preco + " cada" : preco;
    return `${item.qtd}x ${p.nome}, tamanho ${item.tamanho}, ${valor}\nLink: ${url}`;
  });
  return "Olá! Quero fazer um pedido:\n\n" + blocos.join("\n\n") + "\n\nTotal: " + formatarPreco(total);
}

function itemCarrinhoHTML({ item, i, p, situacao }) {
  const ok = situacao === "ok";
  const nome = p ? p.nome : "Produto #" + item.id;
  const foto = p && p.imagens[0]
    ? `<img src="${esc(p.imagens[0])}" alt="${esc(p.nome)}" loading="lazy" decoding="async">`
    : `<div class="sem-foto" aria-hidden="true">${esc(nome.charAt(0))}</div>`;
  const nomeHTML = p
    ? `<a class="item-nome" href="produto.html?id=${encodeURIComponent(p.id)}">${esc(nome)}</a>`
    : `<span class="item-nome">${esc(nome)}</span>`;
  const botaoRemover = `<button type="button" class="remover" data-acao="remover" data-i="${i}" aria-label="Remover ${esc(nome)} do carrinho">Remover</button>`;

  // Item com problema: só aviso e botão de remover (sem preço e sem quantidade)
  if (!ok) {
    return `
      <li class="item-carrinho problema">
        <div class="item-foto">${foto}</div>
        <div class="item-info">
          ${nomeHTML}
          ${item.tamanho ? `<p class="tipo">Tamanho ${esc(item.tamanho)}</p>` : ""}
          <p class="problema-aviso"><span class="selo">Indisponível</span>${esc(textoProblema(situacao, item))}</p>
          <div class="item-linha">${botaoRemover}</div>
        </div>
      </li>`;
  }

  const unit = precoFinal(p);
  const emPromo = p.precoPromo > 0 && p.precoPromo < p.preco;
  const preco = emPromo
    ? `<s>${formatarPreco(p.preco)}</s><span class="promo">${formatarPreco(unit)}</span>`
    : formatarPreco(unit);
  const subtotal = formatarPreco(Math.round(unit * 100) * item.qtd / 100);

  return `
    <li class="item-carrinho">
      <div class="item-foto">${foto}</div>
      <div class="item-info">
        ${nomeHTML}
        <p class="tipo">Tamanho ${esc(item.tamanho)}</p>
        <p class="preco">${preco}</p>
        <div class="item-linha">
          <div class="qtd" role="group" aria-label="Quantidade de ${esc(nome)}">
            <button type="button" data-acao="menos" data-i="${i}" aria-label="Diminuir quantidade"${item.qtd <= 1 ? " disabled" : ""}>−</button>
            <output aria-label="Quantidade">${item.qtd}</output>
            <button type="button" data-acao="mais" data-i="${i}" aria-label="Aumentar quantidade"${item.qtd >= MAX_QTD ? " disabled" : ""}>+</button>
          </div>
          <span class="subtotal">${subtotal}</span>
        </div>
        ${botaoRemover}
      </div>
    </li>`;
}

// Desenha o carrinho inteiro a partir do localStorage + PRODUTOS.
// "foco" é um seletor para devolver o foco do teclado ao botão usado (a tela é redesenhada).
function renderCarrinho(foco) {
  const alvo = el("carrinho");
  const itens = lerCarrinho();

  if (itens.length === 0) {
    alvo.innerHTML = '<div class="mensagem"><p>Seu carrinho está vazio.</p><a class="btn" href="index.html">Ver o catálogo</a></div>';
    return;
  }

  const linhas = itens.map((item, i) => {
    const p = PRODUTOS.find((x) => x.id === item.id);
    return { item, i, p, situacao: situacaoItem(item, p) };
  });
  const validas = linhas.filter((l) => l.situacao === "ok");
  const problemas = linhas.length - validas.length;
  // Soma em centavos para evitar erro de ponto flutuante (ex.: 0.1 + 0.2)
  const totalCentavos = validas.reduce((s, l) => s + Math.round(precoFinal(l.p) * 100) * l.item.qtd, 0);
  const total = totalCentavos / 100;
  const unidades = validas.reduce((s, l) => s + l.item.qtd, 0);

  alvo.innerHTML = `
    <div class="carrinho-layout">
      <ul class="lista-carrinho">${linhas.map(itemCarrinhoHTML).join("")}</ul>
      <aside class="resumo" aria-label="Resumo do pedido">
        <div class="resumo-linha"><span>${unidades} ${unidades === 1 ? "item" : "itens"}</span><span>${formatarPreco(total)}</span></div>
        <div class="resumo-linha resumo-total"><span>Total</span><span>${formatarPreco(total)}</span></div>
        ${problemas
          ? `<p class="aviso-estoque" role="alert">${problemas === 1 ? "Há 1 item indisponível." : "Há " + problemas + " itens indisponíveis."} Remova para finalizar o pedido.</p>`
          : ""}
        <button type="button" class="btn" id="btnFinalizar"${problemas ? " disabled" : ""}>Finalizar no WhatsApp</button>
        <a class="btn secundario" href="index.html">Continuar comprando</a>
        <p class="nota">${esc(CONFIG.mensagemAviso)}</p>
      </aside>
    </div>`;

  el("btnFinalizar").onclick = () => {
    const url = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(mensagemPedido(validas, total));
    window.open(url, "_blank", "noopener");
  };

  if (foco) {
    const botao = alvo.querySelector(foco);
    if (botao && !botao.disabled) botao.focus();
  }
}

// Cliques em −, + e Remover (um único ouvinte para a lista toda)
function tratarCliqueCarrinho(e) {
  const botao = e.target.closest("button[data-acao]");
  if (!botao) return;
  const i = Number(botao.dataset.i);
  const acao = botao.dataset.acao;
  const itens = lerCarrinho();
  const item = itens[i];
  if (!item) return;

  const p = PRODUTOS.find((x) => x.id === item.id);
  const nome = p ? p.nome : "Produto #" + item.id;
  const status = el("statusCarrinho");

  if (acao === "mais") item.qtd = Math.min(MAX_QTD, item.qtd + 1);
  else if (acao === "menos") item.qtd = Math.max(1, item.qtd - 1);
  else if (acao === "remover") itens.splice(i, 1);
  else return;
  salvarCarrinho(itens);

  if (acao === "remover") {
    renderCarrinho();
    status.textContent = nome + " removido do carrinho.";
    el("tituloCarrinho").focus(); // o botão clicado deixou de existir
  } else {
    // Se o botão usado ficou desabilitado (limite 1 ou 99), o foco vai para o outro
    const outro = acao === "mais" ? "menos" : "mais";
    renderCarrinho(`[data-acao="${acao}"][data-i="${i}"]`);
    if (!document.activeElement || document.activeElement === document.body) {
      const alt = el("carrinho").querySelector(`[data-acao="${outro}"][data-i="${i}"]`);
      if (alt) alt.focus();
    }
    status.textContent = "Quantidade de " + nome + ": " + item.qtd + ".";
  }
}

async function iniciarCarrinho() {
  aplicarTema();
  document.title = "Carrinho | " + CONFIG.nomeLoja; // aplicarTema() põe "Catálogo", que não serve aqui
  atualizarContador();
  const alvo = el("carrinho");

  // Carrinho vazio não precisa buscar a planilha
  if (lerCarrinho().length === 0) { renderCarrinho(); return; }

  alvo.innerHTML = '<div class="skeleton" style="max-width:320px"></div>';
  try {
    PRODUTOS = await carregarProdutos();
  } catch (erro) {
    console.error(erro);
    alvo.innerHTML = '<div class="mensagem"><p>Não foi possível carregar o carrinho. Verifique a conexão e tente de novo.</p><button onclick="iniciarCarrinho()">Tentar de novo</button></div>';
    return;
  }
  alvo.onclick = tratarCliqueCarrinho;
  renderCarrinho();
}