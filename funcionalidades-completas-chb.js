(function () {
  if (window.__chbFuncionalidadesCompletas) return;
  window.__chbFuncionalidadesCompletas = true;

  const KEY_DESCRICOES_VIDEOS = "crosshitbox_descricoes_videos_v1";
  const KEY_CHAT_AULA = "crosshitbox_chat_video_aula_v1";
  const KEY_EDIT_RELATORIOS = "crosshitbox_relatorios_editados_v1";
  const KEY_SALA_JITSI = "crosshitbox_sala_jitsi_limpa_v1";

  let wakeLockRef = null;
  let tabataTimer = null;
  let tabataSegundos = 40;
  let tabataRodando = false;
  let tabataRound = 1;

  function ehAdmin() {
    return (window.location.pathname || "").toLowerCase().includes("admin");
  }

  function obterNomeAtletaAtual() {
    try {
      const sessMembro = sessionStorage.getItem("chb_sessao_membro_autenticada_v1");
      const perfis = JSON.parse(localStorage.getItem("crosshitbox_perfis_completos_v1") || "[]");
      if (sessMembro && Array.isArray(perfis)) {
        const achado = perfis.find(
          (p) =>
            p &&
            (String(p.email || "").toLowerCase() === String(sessMembro).toLowerCase() ||
              String(p.nome || "").toLowerCase() === String(sessMembro).toLowerCase())
        );
        if (achado && achado.nome) return String(achado.nome);
      }
      if (sessMembro) return String(sessMembro);
    } catch {}
    return ehAdmin() ? "Administrador (Treinador)" : "Atleta CrossHitBox Tae";
  }

  async function manterEcraAtivo() {
    try {
      if ("wakeLock" in navigator && navigator.wakeLock && typeof navigator.wakeLock.request === "function") {
        if (!wakeLockRef) {
          wakeLockRef = await navigator.wakeLock.request("screen");
          wakeLockRef.addEventListener("release", () => {
            wakeLockRef = null;
          });
        }
      }
    } catch {}
  }

  // 1. DESCRIÇÃO NOS VÍDEOS DE TREINO (ADMIN + ATLETA)
  function lerDescricoesVideos() {
    try {
      return JSON.parse(localStorage.getItem(KEY_DESCRICOES_VIDEOS) || "{}") || {};
    } catch {
      return {};
    }
  }

  function guardarDescricaoVideo(idVideo, texto) {
    const mapa = lerDescricoesVideos();
    if (texto && texto.trim()) {
      mapa[idVideo] = texto.trim();
    } else {
      delete mapa[idVideo];
    }
    try {
      localStorage.setItem(KEY_DESCRICOES_VIDEOS, JSON.stringify(mapa));
    } catch {}
  }

  function enriquecerGestorVideosComDescricao() {
    const formVincular = Array.from(document.querySelectorAll("form")).find((f) =>
      (f.innerText || "").includes("Vincular Vídeo a um Treino")
    );
    if (formVincular && !document.getElementById("chbDescricaoVideoInput")) {
      const btn = formVincular.querySelector("button[type='submit']");
      const divDesc = document.createElement("div");
      divDesc.innerHTML = `
        <label class="block text-[11px] text-slate-300 mb-1">Descrição do Vídeo (Opcional — visível para os atletas)</label>
        <textarea id="chbDescricaoVideoInput" rows="2" placeholder="Ex: Foco na técnica, ritmo controlado e aquecimento inicial..." class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"></textarea>
      `;
      if (btn) {
        formVincular.insertBefore(divDesc, btn);
        btn.addEventListener("click", () => {
          const sel = document.getElementById("chbVidDestinoId");
          const descInp = document.getElementById("chbDescricaoVideoInput");
          if (sel && descInp) {
            guardarDescricaoVideo(sel.value, descInp.value);
            setTimeout(renderizarCaixaDescricaoPlayer, 150);
          }
        });
      }
    }
    renderizarCaixaDescricaoPlayer();
  }

  function renderizarCaixaDescricaoPlayer() {
    const playerBox = document.getElementById("chbPlayerVideoTreinoBox");
    if (!playerBox) return;
    let st = {};
    try {
      st = JSON.parse(localStorage.getItem("crosshitbox_central_treino_v1") || "{}") || {};
    } catch {}
    if (!st.videoAbertoId) return;
    const descMapa = lerDescricoesVideos();
    const descTexto = descMapa[st.videoAbertoId];
    let elDesc = document.getElementById("chbDescricaoVideoAtiva");
    if (!elDesc) {
      elDesc = document.createElement("div");
      elDesc.id = "chbDescricaoVideoAtiva";
      elDesc.className = "bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-300";
      playerBox.appendChild(elDesc);
    }
    elDesc.innerHTML = descTexto
      ? `<span class="font-extrabold text-amber-400 uppercase text-[10px] block mb-1">Descrição do Treino</span>${descTexto}`
      : `<span class="text-slate-400">Sem descrição adicional registada para este vídeo.</span>`;
  }

  // 2. CORRIGIR LINK DA SALA JITSI MEET (SEM CARACTERES INVÁLIDOS COMO :, /, ESPAÇOS)
  function limparSalaJitsi(valorBruto) {
    let limpo = String(valorBruto || "CrossHitBox-Tae-0500").trim();
    limpo = limpo.replace(/^https?:\/\/(meet\.jit\.si\/)?/i, "");
    limpo = limpo.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!limpo) limpo = "CrossHitBox-Tae-0500";
    return `https://meet.jit.si/${limpo}`;
  }

  function corrigirLinksJitsiNaPagina() {
    const salaGuardada = limparSalaJitsi(localStorage.getItem(KEY_SALA_JITSI) || "CrossHitBox-Tae-0500");
    document.querySelectorAll("a[href*='meet.jit.si']").forEach((a) => {
      a.href = limparSalaJitsi(a.href);
    });
    document.querySelectorAll("input").forEach((inp) => {
      const v = String(inp.value || "");
      if (v.includes("meet.jit.si") && (v.includes(" ") || v.match(/https?:\/\/meet\.jit\.si\/.*https?:\/\//i))) {
        inp.value = limparSalaJitsi(v);
      }
    });

    document.addEventListener(
      "click",
      (ev) => {
        const btn = ev.target.closest("button, a");
        if (!btn) return;
        const txt = (btn.textContent || "").toLowerCase();
        if (txt.includes("copiar link") || txt.includes("sala") || txt.includes("jitsi")) {
          const urlCorreta = limparSalaJitsi(localStorage.getItem(KEY_SALA_JITSI) || salaGuardada);
          if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
            navigator.clipboard.writeText(urlCorreta).catch(() => {});
          }
        }
      },
      true
    );
  }

  // 3. NOME DE CADA ATLETA NO CHAT DA VIDEOAULA
  function melhorarChatVideoAula() {
    if (document.getElementById("chbChatAtletaIdentificado")) return;
    const alvoChat = Array.from(document.querySelectorAll("section, div")).find((el) => {
      const t = (el.innerText || "").toLowerCase();
      return (t.includes("chat") && (t.includes("vídeo") || t.includes("video") || t.includes("aula"))) && el.querySelector("input, textarea");
    });

    const box = document.createElement("section");
    box.id = "chbChatAtletaIdentificado";
    box.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    box.innerHTML = `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[10px] font-extrabold uppercase text-amber-400">Chat da Videoaula • Identificação por Atleta</div>
            <div class="font-black text-white text-sm">Mensagens da Turma (Autor: ${obterNomeAtletaAtual()})</div>
          </div>
        </div>
        <div id="chbListaMensagensChat" class="max-h-48 overflow-y-auto space-y-2 bg-slate-950 border border-slate-800 rounded-xl p-3"></div>
        <form onsubmit="chbEnviarMensagemChatAtleta(event)" class="flex gap-2">
          <input id="chbInputChatMsg" type="text" required placeholder="Escreve a tua mensagem na videoaula..." class="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
          <button type="submit" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">Enviar</button>
        </form>
      </div>
    `;

    if (alvoChat && alvoChat.parentNode) {
      alvoChat.parentNode.insertBefore(box, alvoChat.nextSibling);
    } else {
      const mainEl = document.querySelector("main") || document.body;
      mainEl.appendChild(box);
    }
    renderizarMensagensChat();
  }

  function renderizarMensagensChat() {
    const listaEl = document.getElementById("chbListaMensagensChat");
    if (!listaEl) return;
    let msgs = [];
    try {
      msgs = JSON.parse(localStorage.getItem(KEY_CHAT_AULA) || "[]") || [];
    } catch {}
    if (!msgs.length) {
      listaEl.innerHTML = `<div class="text-slate-400">Sem mensagens ainda. Envia a primeira mensagem com o nome do atleta.</div>`;
      return;
    }
    listaEl.innerHTML = msgs
      .map(
        (m) => `
      <div class="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-black text-amber-400">${m.autor || "Atleta"}</span>
          <span class="text-slate-500">${m.hora || ""}</span>
        </div>
        <div class="text-slate-200 mt-0.5">${m.texto}</div>
      </div>
    `
      )
      .join("");
  }

  window.chbEnviarMensagemChatAtleta = function (ev) {
    if (ev) ev.preventDefault();
    const inp = document.getElementById("chbInputChatMsg");
    const texto = inp ? inp.value.trim() : "";
    if (!texto) return;
    let msgs = [];
    try {
      msgs = JSON.parse(localStorage.getItem(KEY_CHAT_AULA) || "[]") || [];
    } catch {}
    const agora = new Date();
    const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
    msgs.push({ autor: obterNomeAtletaAtual(), texto, hora });
    msgs = msgs.slice(-60);
    try {
      localStorage.setItem(KEY_CHAT_AULA, JSON.stringify(msgs));
    } catch {}
    if (inp) inp.value = "";
    renderizarMensagensChat();
  };

  // 4. CRONÓMETRO HIIT / TABATA FUNCIONAL + FULL ECRÃ
  window.chbTabataStart = function () {
    manterEcraAtivo();
    const treInp = document.querySelector("input[placeholder*='Treino'], input[id*='treino' i]");
    if (treInp && Number(treInp.value) > 0 && !tabataRodando) {
      tabataSegundos = Number(treInp.value);
    }
    if (tabataTimer) clearInterval(tabataTimer);
    tabataRodando = true;
    atualizarMostradorTabata();
    tabataTimer = setInterval(() => {
      if (tabataSegundos > 0) {
        tabataSegundos -= 1;
      } else {
        tabataRound += 1;
        tabataSegundos = treInp && Number(treInp.value) > 0 ? Number(treInp.value) : 40;
      }
      atualizarMostradorTabata();
    }, 1000);
  };

  window.chbTabataPause = function () {
    tabataRodando = false;
    if (tabataTimer) {
      clearInterval(tabataTimer);
      tabataTimer = null;
    }
    atualizarMostradorTabata();
  };

  window.chbTabataReset = function () {
    tabataRodando = false;
    if (tabataTimer) {
      clearInterval(tabataTimer);
      tabataTimer = null;
    }
    tabataRound = 1;
    const treInp = document.querySelector("input[placeholder*='Treino'], input[id*='treino' i]");
    tabataSegundos = treInp && Number(treInp.value) > 0 ? Number(treInp.value) : 40;
    atualizarMostradorTabata();
  };

  window.chbTabataFullScreen = function () {
    manterEcraAtivo();
    const secTabata = Array.from(document.querySelectorAll("section, div")).find((el) =>
      (el.innerText || "").includes("Cronómetro HIIT / Tabata")
    );
    if (!secTabata) return;
    if (!document.fullscreenElement && typeof secTabata.requestFullscreen === "function") {
      secTabata.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  };

  function atualizarMostradorTabata() {
    const mm = String(Math.floor(tabataSegundos / 60)).padStart(2, "0");
    const ss = String(tabataSegundos % 60).padStart(2, "0");
    const display = `${mm}:${ss}`;
    Array.from(document.querySelectorAll("div, span")).forEach((el) => {
      if (el.children.length === 0 && /^\d{2}:\d{2}$/.test((el.textContent || "").trim())) {
        const paiTxt = (el.parentElement && el.parentElement.innerText) || "";
        if (paiTxt.includes("Round") || paiTxt.includes("Tabata") || paiTxt.includes("HIIT")) {
          el.textContent = display;
        }
      }
    });
  }

  function ligarBotoesTabata() {
    const secTabata = Array.from(document.querySelectorAll("section, div")).find((el) =>
      (el.innerText || "").includes("Cronómetro HIIT / Tabata")
    );
    if (!secTabata) return;
    secTabata.querySelectorAll("button").forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      if (t === "iniciar" && !btn.dataset.chbBound) {
        btn.dataset.chbBound = "1";
        btn.addEventListener("click", window.chbTabataStart);
      } else if (t === "pausar" && !btn.dataset.chbBound) {
        btn.dataset.chbBound = "1";
        btn.addEventListener("click", window.chbTabataPause);
      } else if (t === "zerar" && !btn.dataset.chbBound) {
        btn.dataset.chbBound = "1";
        btn.addEventListener("click", window.chbTabataReset);
      }
    });

    if (!document.getElementById("chbBtnTabataFull")) {
      const btnFull = document.createElement("button");
      btnFull.id = "chbBtnTabataFull";
      btnFull.type = "button";
      btnFull.textContent = "Full Ecrã";
      btnFull.className = "px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-black text-xs ml-2";
      btnFull.onclick = window.chbTabataFullScreen;
      const zBtn = Array.from(secTabata.querySelectorAll("button")).find((b) => (b.textContent || "").trim().toLowerCase() === "zerar");
      if (zBtn && zBtn.parentNode) {
        zBtn.parentNode.appendChild(btnFull);
      }
    }
  }

  // 5. ADMIN: EDITAR RESUMOS & PLANO ALIMENTAR DIRECIONADO
  function adicionarEditorRelatoriosAdmin() {
    if (!ehAdmin() || document.getElementById("chbEditorRelatorioAdminBox")) return;
    const secRel = Array.from(document.querySelectorAll("section, div")).find((el) =>
      (el.innerText || "").includes("Relatórios Automáticos de Performance & Plano Alimentar")
    );
    if (!secRel) return;

    const box = document.createElement("div");
    box.id = "chbEditorRelatorioAdminBox";
    box.className = "mt-4 bg-slate-950 border border-amber-500/35 rounded-xl p-4 space-y-3 text-xs";
    box.innerHTML = `
      <div class="font-black text-amber-400 uppercase text-[11px]">Editar Resumo de Performance &amp; Plano Alimentar Direcionado</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-slate-300 font-bold mb-1">Resumo de Performance (Editável)</label>
          <textarea id="chbEditResumoTxt" rows="4" class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white" placeholder="Ajusta aqui o resumo semanal/mensal do atleta..."></textarea>
        </div>
        <div>
          <label class="block text-slate-300 font-bold mb-1">Plano Alimentar Direcionado (Editável)</label>
          <textarea id="chbEditPlanoTxt" rows="4" class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white" placeholder="Ajusta aqui as refeições, pré/pós-treino e hidratação..."></textarea>
        </div>
      </div>
      <div class="flex items-center justify-between gap-2">
        <span id="chbStatusEditRelatorio" class="text-emerald-400 font-bold"></span>
        <button type="button" onclick="chbGuardarEdicaoRelatorio()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">
          Guardar Alterações no Relatório &amp; Plano
        </button>
      </div>
    `;
    secRel.appendChild(box);
  }

  window.chbGuardarEdicaoRelatorio = function () {
    const resTxt = (document.getElementById("chbEditResumoTxt") || {}).value || "";
    const plaTxt = (document.getElementById("chbEditPlanoTxt") || {}).value || "";
    try {
      localStorage.setItem(KEY_EDIT_RELATORIOS, JSON.stringify({ resumo: resTxt, plano: plaTxt, data: new Date().toISOString() }));
    } catch {}
    const stEl = document.getElementById("chbStatusEditRelatorio");
    if (stEl) stEl.textContent = "Resumo e Plano Alimentar atualizados com sucesso.";
  };

  // 6. GESTÃO COMPLETA DE MEMBROS + ALTERAR/RESETAR SENHA (ADMIN E ATLETA)
  window.chbAlterarMinhaSenhaAtleta = function (ev) {
    if (ev) ev.preventDefault();
    const inpNova = document.getElementById("chbNovaSenhaAtleta");
    const stEl = document.getElementById("chbMsgSenhaAtleta");
    const nova = inpNova ? inpNova.value.trim() : "";
    if (!nova || nova.length < 4) {
      if (stEl) stEl.textContent = "A nova palavra-passe deve ter pelo menos 4 caracteres.";
      return;
    }
    const atualId = (sessionStorage.getItem("chb_sessao_membro_autenticada_v1") || "").toLowerCase();
    try {
      const perfis = JSON.parse(localStorage.getItem("crosshitbox_perfis_completos_v1") || "[]");
      if (Array.isArray(perfis)) {
        perfis.forEach((p) => {
          if (!p) return;
          if (!atualId || String(p.email || "").toLowerCase() === atualId || String(p.nome || "").toLowerCase() === atualId) {
            p.password = nova;
            p.senha = nova;
          }
        });
        localStorage.setItem("crosshitbox_perfis_completos_v1", JSON.stringify(perfis));
      }
    } catch {}
    if (inpNova) inpNova.value = "";
    if (stEl) stEl.textContent = "Palavra-passe atualizada com sucesso.";
  };

  function adicionarGestaoSenhaAtleta() {
    if (ehAdmin() || document.getElementById("chbBoxAlterarSenhaAtleta")) return;
    const box = document.createElement("section");
    box.id = "chbBoxAlterarSenhaAtleta";
    box.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    box.innerHTML = `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
        <div class="font-black text-white text-sm">Alterar a Minha Palavra-Passe</div>
        <form onsubmit="chbAlterarMinhaSenhaAtleta(event)" class="flex flex-col sm:flex-row gap-2">
          <input id="chbNovaSenhaAtleta" type="password" required minlength="4" placeholder="Nova palavra-passe" class="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
          <button type="submit" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">Guardar Nova Senha</button>
        </form>
        <div id="chbMsgSenhaAtleta" class="text-emerald-400 font-bold"></div>
      </div>
    `;
    const mainEl = document.querySelector("main") || document.body;
    mainEl.appendChild(box);
  }

  function executarTudo() {
    enriquecerGestorVideosComDescricao();
    corrigirLinksJitsiNaPagina();
    melhorarChatVideoAula();
    ligarBotoesTabata();
    adicionarEditorRelatoriosAdmin();
    adicionarGestaoSenhaAtleta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(executarTudo, 450));
  } else {
    setTimeout(executarTudo, 450);
  }
})();
