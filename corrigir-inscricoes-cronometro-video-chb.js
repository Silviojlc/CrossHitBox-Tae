(function () {
  if (window.__chbCorrecaoFinalTresPontos) return;
  window.__chbCorrecaoFinalTresPontos = true;

  const KEY_EXCLUIDOS = "crosshitbox_membros_excluidos_v1";
  const CHAVES_MEMBROS = [
    "crosshitbox_membros_v1",
    "crosshitbox_inscricoes_v1",
    "crosshitbox_perfis_completos_v1"
  ];

  // Vídeos padrão embutidos caso ainda não haja link customizado para a aula selecionada
  const VIDEOS_PADRAO_EMBED = {
    "fit-hiit-20": "https://www.youtube.com/embed/ml6cT4AZdqI?rel=0",
    "fit-tae-box-30": "https://www.youtube.com/embed/2MoGxae-zyo?rel=0",
    "fit-queima-15": "https://www.youtube.com/embed/cbKkB3POqaY?rel=0",
    "fit-baixo-impacto-25": "https://www.youtube.com/embed/enYITYwvPAQ?rel=0",
    "ntc-base-tae": "https://www.youtube.com/embed/fcN37TxBE_s?rel=0",
    "ntc-forca-potencia": "https://www.youtube.com/embed/UBMk30rjy0o?rel=0",
    "ntc-mobilidade-core": "https://www.youtube.com/embed/g_tea8ZNk5A?rel=0",
    "run-tecnica-aquecimento": "https://www.youtube.com/embed/3K8kG0V6hW0?rel=0"
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
      const pendentes = unificada.filter((u) => !u.aprovado && String(u.status || "").toLowerCase() !== "ativo" && String(u.status || "").toLowerCase() !== "aprovado");
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

  // 2. CRONÓMETRO HIIT / TABATA COM CONTAGEM REAL VISÍVEL + FULL ECRÃ
  let hiitInterval = null;
  let hiitRestante = 40;
  let hiitAtivo = false;
  let hiitRound = 1;

  function obterSecaoHiit() {
    return Array.from(document.querySelectorAll("section, div")).find((el) => {
      const t = (el.innerText || "");
      return t.includes("Cronómetro HIIT / Tabata") && t.includes("Round");
    });
  }

  function pintarContadorHiit() {
    const sec = obterSecaoHiit();
    if (!sec) return;
    const mm = String(Math.floor(hiitRestante / 60)).padStart(2, "0");
    const ss = String(hiitRestante % 60).padStart(2, "0");
    const textoTempo = `${mm}:${ss}`;

    // Atualiza o maior mostrador de tempo dentro do cronómetro HIIT
    let maiorEl = null;
    let maiorSize = 0;
    sec.querySelectorAll("div, span, p, strong").forEach((el) => {
      if (el.children.length === 0) {
        const txt = (el.textContent || "").trim();
        if (/^\d{1,2}:\d{2}$/.test(txt)) {
          const fs = parseFloat(window.getComputedStyle(el).fontSize) || 0;
          if (fs >= maiorSize) {
            maiorSize = fs;
            maiorEl = el;
          }
        }
      }
    });
    if (maiorEl) {
      maiorEl.textContent = textoTempo;
    }

    // Atualiza indicação de round se existir
    sec.querySelectorAll("div, span, p").forEach((el) => {
      if (el.children.length === 0 && /round\s+\d+/i.test(el.textContent || "")) {
        el.textContent = (el.textContent || "").replace(/round\s+\d+/i, `Round ${hiitRound}`);
      }
    });
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
    if (hiitInterval) clearInterval(hiitInterval);
    pintarContadorHiit();
    hiitInterval = setInterval(() => {
      if (!hiitAtivo) return;
      if (hiitRestante > 1) {
        hiitRestante -= 1;
      } else {
        hiitRound += 1;
        hiitRestante = lerSegundosTreinoInput();
      }
      pintarContadorHiit();
    }, 1000);
  };

  window.chbHiitPausarReal = function () {
    hiitAtivo = false;
    if (hiitInterval) {
      clearInterval(hiitInterval);
      hiitInterval = null;
    }
    pintarContadorHiit();
  };

  window.chbHiitZerarReal = function () {
    hiitAtivo = false;
    if (hiitInterval) {
      clearInterval(hiitInterval);
      hiitInterval = null;
    }
    hiitRound = 1;
    hiitRestante = lerSegundosTreinoInput();
    pintarContadorHiit();
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

  // 3. GARANTIR QUE O VÍDEO ABRE EMBUTIDO NO PRÓPRIO PROGRAMA (COM FALLBACK DE VÍDEO PRONTO)
  function garantirPlayerEmbutidoComVideo() {
    const playerBox = document.getElementById("chbPlayerVideoTreinoBox");
    if (!playerBox) return;
    const avisoSemVideo = Array.from(playerBox.querySelectorAll("div, p")).find((el) =>
      (el.textContent || "").includes("Ainda não foi associado um vídeo específico")
    );
    if (!avisoSemVideo) return;

    let st = {};
    try {
      st = JSON.parse(localStorage.getItem("crosshitbox_central_treino_v1") || "{}") || {};
    } catch {}
    const idAtual = st.videoAbertoId || "fit-hiit-20";
    const embedSrc = VIDEOS_PADRAO_EMBED[idAtual] || "https://www.youtube.com/embed/ml6cT4AZdqI?rel=0";

    const container = avisoSemVideo.parentElement || playerBox;
    container.innerHTML = `
      <div class="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-black">
        <iframe src="${embedSrc}" title="${st.videoAbertoTitulo || "Treino CrossHitBox Tae"}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>
      </div>
    `;
  }

  function executarCorrecoes() {
    sincronizarInscricoesParaAdmin();
    ligarControlesHiit();
    garantirPlayerEmbutidoComVideo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(executarCorrecoes, 450));
  } else {
    setTimeout(executarCorrecoes, 450);
  }
  setInterval(garantirPlayerEmbutidoComVideo, 1500);
})();
