(function () {
  if (window.__chbCorrecaoFinalTresPontos) return;
  window.__chbCorrecaoFinalTresPontos = true;

  const KEY_EXCLUIDOS = "crosshitbox_membros_excluidos_v1";
  const CHAVES_MEMBROS = [
    "crosshitbox_membros_v1",
    "crosshitbox_inscricoes_v1",
    "crosshitbox_perfis_completos_v1"
  ];

  // URLs de pesquisa/abertura garantidas (evitam "Vídeo indisponível" no iframe)
  const LINKS_TREINO_SEGUROS = {
    "fit-hiit-20": "https://www.youtube.com/results?search_query=HIIT+Cardio+em+Casa+20+min+sem+equipamento",
    "fit-tae-box-30": "https://www.youtube.com/results?search_query=Cardio+Boxe+Tae+Bo+30+min",
    "fit-queima-15": "https://www.youtube.com/results?search_query=Queima+Rapida+Core+15+min+HIIT",
    "fit-baixo-impacto-25": "https://www.youtube.com/results?search_query=Cardio+Baixo+Impacto+25+min",
    "ntc-base-tae": "https://www.youtube.com/results?search_query=Nike+Training+Club+Cardio+Condicionamento",
    "ntc-forca-potencia": "https://www.youtube.com/results?search_query=Nike+Training+Club+Forca+Potencia",
    "ntc-mobilidade-core": "https://www.youtube.com/results?search_query=Mobilidade+Core+Alongamento+20+min",
    "run-tecnica-aquecimento": "https://www.youtube.com/results?search_query=Aquecimento+Tecnica+Corrida+Caminhada"
  };

  function ehAdmin() {
    return (window.location.pathname || "").toLowerCase().includes("admin");
  }

  function lerExcluidos() {
    try {
      const raw = localStorage.getItem(KEY_EXCLUIDOS);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set((Array.isArray(arr) ? arr : []).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean));
    } catch {
      return new Set();
    }
  }

  // 1. SINCRONIZAR NOVOS INSCRITOS PARA O ADMIN APROVAR E LIBERAR
  function sincronizarInscricoesParaAdmin() {
    const excl = lerExcluidos();
    const mapa = new Map();

    CHAVES_MEMBROS.forEach((chave) => {
      try {
        const arr = JSON.parse(localStorage.getItem(chave) || "[]");
        if (!Array.isArray(arr)) return;
        arr.forEach((m) => {
          if (!m || typeof m !== "object") return;
          const idNorm = String(m.email || m.id || m.telefone || m.nome || "").trim().toLowerCase();
          if (!idNorm || excl.has(idNorm)) return;
          const atual = mapa.get(idNorm) || {};
          mapa.set(idNorm, {
            status: "pendente",
            aprovado: false,
            ...atual,
            ...m
          });
        });
      } catch {}
    });

    const unificada = Array.from(mapa.values());
    CHAVES_MEMBROS.forEach((chave) => {
      try {
        localStorage.setItem(chave, JSON.stringify(unificada));
      } catch {}
    });

    if (ehAdmin() && !document.getElementById("chbPainelAprovacaoRapida")) {
      const pendentes = unificada.filter(
        (u) => !u.aprovado && String(u.status || "").toLowerCase() !== "ativo" && String(u.status || "").toLowerCase() !== "aprovado"
      );
      const box = document.createElement("section");
      box.id = "chbPainelAprovacaoRapida";
      box.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
      box.innerHTML = `
        <div class="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 space-y-3 text-xs">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[10px] font-extrabold uppercase text-amber-400">Aprovação &amp; Liberação de Novos Inscritos</div>
              <div class="font-black text-white text-sm">Membros Aguardando Aprovação (${pendentes.length})</div>
            </div>
          </div>
          <div id="chbListaPendentesAprovar" class="space-y-2">
            ${
              pendentes.length
                ? pendentes
                    .map((p, idx) => {
                      const chaveRef = String(p.email || p.nome || idx).replace(/'/g, "");
                      return `
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div>
                      <div class="font-bold text-white">${p.nome || "Novo Atleta"} <span class="text-amber-400">• ${p.turno || "Quartas-feiras"}</span></div>
                      <div class="text-[11px] text-slate-400">${p.email || "-"} • ${p.telefone || ""}</div>
                    </div>
                    <button type="button" onclick="chbAprovarELiberarMembro('${chaveRef}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">
                      Aprovar e Liberar Acesso
                    </button>
                  </div>
                `;
                    })
                    .join("")
                : `<div class="text-slate-400">Todos os inscritos ativos já estão aprovados ou sincronizados.</div>`
            }
          </div>
        </div>
      `;
      const mainEl = document.querySelector("main") || document.body;
      mainEl.insertBefore(box, mainEl.firstChild);
    }
  }

  window.chbAprovarELiberarMembro = function (ref) {
    const alvo = String(ref || "").trim().toLowerCase();
    CHAVES_MEMBROS.forEach((chave) => {
      try {
        const arr = JSON.parse(localStorage.getItem(chave) || "[]");
        if (!Array.isArray(arr)) return;
        arr.forEach((m) => {
          if (!m) return;
          const em = String(m.email || "").trim().toLowerCase();
          const nm = String(m.nome || "").trim().toLowerCase();
          if (!alvo || em === alvo || nm === alvo) {
            m.aprovado = true;
            m.ativo = true;
            m.status = "ativo";
          }
        });
        localStorage.setItem(chave, JSON.stringify(arr));
      } catch {}
    });
    const painel = document.getElementById("chbPainelAprovacaoRapida");
    if (painel) painel.remove();
    sincronizarInscricoesParaAdmin();
    if (typeof window.chbAtualizarDashboardPro === "function") {
      window.chbAtualizarDashboardPro();
    }
  };

  // 2. CRONÓMETRO HIIT / TABATA COM CONTAGEM CONTÍNUA GARANTIDA + FULL ECRÃ
  let hiitInterval = null;
  let hiitRestante = 40;
  let hiitAtivo = false;
  let hiitRound = 1;
  let ultimoTickMs = 0;

  function obterSecaoHiit() {
    return Array.from(document.querySelectorAll("section, div")).find((el) => {
      const t = el.innerText || "";
      return t.includes("Cronómetro HIIT / Tabata") && t.includes("Round");
    });
  }

  function garantirVisorHiitVivo() {
    const sec = obterSecaoHiit();
    if (!sec) return null;
    let visor = document.getElementById("chbVisorHiitAtivoReal");
    if (!visor) {
      visor = document.createElement("div");
      visor.id = "chbVisorHiitAtivoReal";
      visor.style.cssText =
        "margin-top:10px;padding:10px 14px;border-radius:12px;background:#020617;border:1px solid rgba(16,185,129,.45);display:flex;align-items:center;justify-content:space-between;color:#f8fafc;font-family:monospace;";
      visor.innerHTML = `
        <span id="chbHiitEstadoLabel" style="font-size:12px;font-weight:800;color:#34d399;">PRONTO • Round 1</span>
        <span id="chbHiitRelogioTexto" style="font-size:24px;font-weight:900;color:#ffffff;">00:40</span>
      `;
      const botoesLinha = Array.from(sec.querySelectorAll("button")).find((b) =>
        (b.textContent || "").trim().toLowerCase() === "iniciar"
      );
      if (botoesLinha && botoesLinha.parentElement && botoesLinha.parentElement.parentElement) {
        botoesLinha.parentElement.parentElement.appendChild(visor);
      } else {
        sec.appendChild(visor);
      }
    }
    return visor;
  }

  function atualizarContadorHiitVisual() {
    garantirVisorHiitVivo();
    const mm = String(Math.floor(hiitRestante / 60)).padStart(2, "0");
    const ss = String(hiitRestante % 60).padStart(2, "0");
    const textoTempo = `${mm}:${ss}`;

    const relEl = document.getElementById("chbHiitRelogioTexto");
    const estEl = document.getElementById("chbHiitEstadoLabel");
    if (relEl) relEl.textContent = textoTempo;
    if (estEl) {
      estEl.textContent = `${hiitAtivo ? "A CONTAR" : "PAUSADO"} • Round ${hiitRound}`;
      estEl.style.color = hiitAtivo ? "#34d399" : "#fbbf24";
    }
  }

  function lerSegundosTreinoInput() {
    const sec = obterSecaoHiit();
    if (!sec) return 40;
    const inps = Array.from(sec.querySelectorAll("input[type='number'], input"));
    for (const inp of inps) {
      const v = parseInt(inp.value, 10);
      if (Number.isFinite(v) && v > 0 && v <= 600) return v;
    }
    return 40;
  }

  window.chbHiitIniciarReal = function () {
    hiitAtivo = true;
    if (hiitRestante <= 0) {
      hiitRestante = lerSegundosTreinoInput();
    }
    ultimoTickMs = Date.now();
    if (hiitInterval) clearInterval(hiitInterval);
    atualizarContadorHiitVisual();

    hiitInterval = setInterval(() => {
      if (!hiitAtivo) return;
      const agora = Date.now();
      if (agora - ultimoTickMs >= 950) {
        ultimoTickMs = agora;
        if (hiitRestante > 1) {
          hiitRestante -= 1;
        } else {
          hiitRound += 1;
          hiitRestante = lerSegundosTreinoInput();
        }
        atualizarContadorHiitVisual();
      }
    }, 250);
  };

  window.chbHiitPausarReal = function () {
    hiitAtivo = false;
    if (hiitInterval) {
      clearInterval(hiitInterval);
      hiitInterval = null;
    }
    atualizarContadorHiitVisual();
  };

  window.chbHiitZerarReal = function () {
    hiitAtivo = false;
    if (hiitInterval) {
      clearInterval(hiitInterval);
      hiitInterval = null;
    }
    hiitRound = 1;
    hiitRestante = lerSegundosTreinoInput();
    atualizarContadorHiitVisual();
  };

  window.chbHiitFullEcranReal = function () {
    const sec = obterSecaoHiit();
    if (!sec) return;
    if (!document.fullscreenElement && typeof sec.requestFullscreen === "function") {
      sec.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  };

  function ligarControlesHiit() {
    garantirVisorHiitVivo();
    const sec = obterSecaoHiit();
    if (!sec) return;
    sec.querySelectorAll("button").forEach((btn) => {
      const label = (btn.textContent || "").trim().toLowerCase();
      if (label === "iniciar" && !btn.dataset.hiitReal) {
        btn.dataset.hiitReal = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          window.chbHiitIniciarReal();
        });
      } else if (label === "pausar" && !btn.dataset.hiitReal) {
        btn.dataset.hiitReal = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          window.chbHiitPausarReal();
        });
      } else if (label === "zerar" && !btn.dataset.hiitReal) {
        btn.dataset.hiitReal = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          window.chbHiitZerarReal();
        });
      } else if (label.includes("full") && !btn.dataset.hiitReal) {
        btn.dataset.hiitReal = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          window.chbHiitFullEcranReal();
        });
      }
    });
  }

  // 3. CORRIGIR PLAYER QUANDO MOSTRA "VÍDEO INDISPONÍVEL" OU SEM VÍDEO VINCULADO
  function corrigirPlayerSemVideoIndisponivel() {
    const playerBox = document.getElementById("chbPlayerVideoTreinoBox");
    if (!playerBox) return;

    let st = {};
    try {
      st = JSON.parse(localStorage.getItem("crosshitbox_central_treino_v1") || "{}") || {};
    } catch {}

    let dadosVid = { mapa: {} };
    try {
      dadosVid = JSON.parse(localStorage.getItem("crosshitbox_videos_programas_v1") || '{"mapa":{}}') || { mapa: {} };
    } catch {}

    const idAtual = st.videoAbertoId || "fit-hiit-20";
    const tituloAtual = st.videoAbertoTitulo || "Treino CrossHitBox Tae";
    const urlSalva = (dadosVid.mapa && dadosVid.mapa[idAtual]) || "";
    const linkSeguro = urlSalva || LINKS_TREINO_SEGUROS[idAtual] || `https://www.youtube.com/results?search_query=${encodeURIComponent("CrossHitBox Tae " + tituloAtual)}`;

    const temErroYoutube = Array.from(playerBox.querySelectorAll("*")).some((el) =>
      (el.textContent || "").toLowerCase().includes("vídeo indisponível") ||
      (el.textContent || "").toLowerCase().includes("video indisponivel") ||
      (el.textContent || "").toLowerCase().includes("ainda não foi associado um vídeo específico")
    );

    if (temErroYoutube) {
      const stage = document.getElementById("chbVideoStageFull") || playerBox;
      let painelAcao = document.getElementById("chbPainelVideoProntoUso");
      if (!painelAcao) {
        painelAcao = document.createElement("div");
        painelAcao.id = "chbPainelVideoProntoUso";
        painelAcao.className = "bg-slate-900 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3";
        stage.appendChild(painelAcao);
      }
      painelAcao.innerHTML = `
        <div>
          <div class="text-xs font-black text-white">${tituloAtual}</div>
          <div class="text-[11px] text-slate-300">Abre o vídeo no leitor com ecrã ativo e sem bloqueio de incorporação.</div>
        </div>
        <div class="flex flex-wrap gap-2">
          <a href="${linkSeguro}" target="_blank" rel="noopener" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs">
            Abrir Vídeo do Treino
          </a>
          <button type="button" onclick="window.chbAlternarFullEcranVideo && window.chbAlternarFullEcranVideo()" class="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs">
            Full Ecrã
          </button>
        </div>
      `;
    }
  }

  function executarCorrecoes() {
    sincronizarInscricoesParaAdmin();
    ligarControlesHiit();
    corrigirPlayerSemVideoIndisponivel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(executarCorrecoes, 450));
  } else {
    setTimeout(executarCorrecoes, 450);
  }
  setInterval(corrigirPlayerSemVideoIndisponivel, 1500);
})();
