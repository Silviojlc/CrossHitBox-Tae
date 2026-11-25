(function () {
  if (window.__chbCronometroCombateTotal) return;
  window.__chbCronometroCombateTotal = true;

  // 1) MOTOR DO CRONÓMETRO PRINCIPAL (00:35 -> 00:34...)
  let ativo = false;
  let inicioMs = 0;
  let duracaoSeg = 40;
  let restanteSeg = 40;
  let roundAtual = 1;
  let faseTrabalho = true;
  let timerRapido = null;
  let rafId = null;

  // 2) MOTOR ACOPLADO AO CARTÃO NATIVO "Cronómetro HIIT / Tabata — CrossHitBox Tae"
  let hiitAtivo = false;
  let hiitInicioMs = 0;
  let hiitDuracaoSeg = 40;
  let hiitRestanteSeg = 40;
  let hiitRound = 1;
  let hiitTrabalho = true;
  let hiitLoopId = null;

  function beep(freq = 880, ms = 120) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.06;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        try {
          osc.stop();
          ctx.close().catch(() => {});
        } catch {}
      }, ms);
    } catch {}
  }

  function fmt(s) {
    const n = Math.max(0, Math.floor(Number(s) || 0));
    const m = String(Math.floor(n / 60)).padStart(2, "0");
    const seg = String(n % 60).padStart(2, "0");
    return `${m}:${seg}`;
  }

  function treinoConfig() {
    const el = document.getElementById("chbUnicoTreino");
    const v = el ? parseInt(el.value, 10) : 40;
    return Number.isFinite(v) && v > 0 ? v : 40;
  }

  function descansoConfig() {
    const el = document.getElementById("chbUnicoDescanso");
    const v = el ? parseInt(el.value, 10) : 20;
    return Number.isFinite(v) && v > 0 ? v : 20;
  }

  function roundsConfig() {
    const el = document.getElementById("chbUnicoRounds");
    const v = el ? parseInt(el.value, 10) : 8;
    return Number.isFinite(v) && v > 0 ? v : 8;
  }

  function pintarForcado() {
    try {
      const rel = document.getElementById("chbUnicoRelogio");
      const st = document.getElementById("chbUnicoStatus");
      const textoRel = fmt(restanteSeg);
      if (rel) {
        if (rel.firstChild && rel.firstChild.nodeType === Node.TEXT_NODE) {
          rel.firstChild.nodeValue = textoRel;
        } else {
          rel.textContent = textoRel;
        }
      }
      if (st) {
        const estadoTxt = ativo ? "A CONTAR" : "PAUSADO";
        const faseTxt = faseTrabalho ? "TRABALHO" : "DESCANSO";
        st.textContent = `${estadoTxt} • ${faseTxt} • ROUND ${roundAtual} DE ${roundsConfig()}`;
      }
    } catch {}
  }

  function cicloContagem() {
    try {
      if (!ativo) {
        pintarForcado();
        return;
      }
      const decorrido = Math.floor((Date.now() - inicioMs) / 1000);
      const restante = duracaoSeg - decorrido;

      if (restante > 0) {
        restanteSeg = restante;
        pintarForcado();
      } else {
        beep(faseTrabalho ? 660 : 990, 150);
        if (faseTrabalho) {
          faseTrabalho = false;
          duracaoSeg = descansoConfig();
          restanteSeg = duracaoSeg;
          inicioMs = Date.now();
        } else {
          const total = roundsConfig();
          if (roundAtual < total) {
            roundAtual += 1;
            faseTrabalho = true;
            duracaoSeg = treinoConfig();
            restanteSeg = duracaoSeg;
            inicioMs = Date.now();
          } else {
            ativo = false;
            restanteSeg = 0;
            pararLoops();
          }
        }
        pintarForcado();
      }

      if (ativo) {
        rafId = requestAnimationFrame(cicloContagem);
      }
    } catch {}
  }

  function pararLoops() {
    if (timerRapido) {
      clearInterval(timerRapido);
      timerRapido = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  window.chbUnicoIniciar = function () {
    beep(880, 120);
    pararLoops();
    const base = restanteSeg > 0 ? restanteSeg : treinoConfig();
    duracaoSeg = base;
    restanteSeg = base;
    inicioMs = Date.now();
    ativo = true;
    pintarForcado();
    timerRapido = setInterval(cicloContagem, 100);
    rafId = requestAnimationFrame(cicloContagem);
  };

  window.chbUnicoPausar = function () {
    if (ativo) {
      cicloContagem();
      ativo = false;
    }
    pararLoops();
    pintarForcado();
  };

  window.chbUnicoZerar = function () {
    ativo = false;
    pararLoops();
    faseTrabalho = true;
    roundAtual = 1;
    duracaoSeg = treinoConfig();
    restanteSeg = duracaoSeg;
    inicioMs = Date.now();
    pintarForcado();
  };

  window.chbUnicoFullEcra = function () {
    const box = document.getElementById("chbCronometroUnicoBlindado");
    if (!box) return;
    if (!document.fullscreenElement && typeof box.requestFullscreen === "function") {
      box.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  };

  // --- CONTROLE DO CARTÃO NATIVO "Cronómetro HIIT / Tabata — CrossHitBox Tae" ---
  function localizarCartaoHiit() {
    const els = Array.from(document.querySelectorAll("section, div"));
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      if (!el || el.id === "chbCronometroUnicoBlindado") continue;
      const txt = el.innerText || "";
      if (
        txt.includes("Cronómetro HIIT / Tabata") &&
        txt.includes("Round") &&
        el.querySelectorAll("input").length >= 3 &&
        el.querySelectorAll("button").length >= 4
      ) {
        return el;
      }
    }
    return null;
  }

  function lerValoresCartaoHiit(cartao) {
    let treino = 40;
    let descanso = 20;
    let totalRounds = 8;
    if (!cartao) return { treino, descanso, totalRounds };
    const inps = Array.from(cartao.querySelectorAll("input[type='number'], input"));
    if (inps[0]) {
      const v0 = parseInt(inps[0].value, 10);
      if (Number.isFinite(v0) && v0 > 0) treino = v0;
    }
    if (inps[1]) {
      const v1 = parseInt(inps[1].value, 10);
      if (Number.isFinite(v1) && v1 > 0) descanso = v1;
    }
    if (inps[2]) {
      const v2 = parseInt(inps[2].value, 10);
      if (Number.isFinite(v2) && v2 > 0) totalRounds = v2;
    }
    return { treino, descanso, totalRounds };
  }

  function pintarCartaoHiit() {
    try {
      const cartao = localizarCartaoHiit();
      if (!cartao) return;
      const cfg = lerValoresCartaoHiit(cartao);
      const mmss = fmt(hiitRestanteSeg);

      // Mostra o relógio no elemento MM:SS dentro do cartão nativo
      let relEl = null;
      let maiorFonte = 0;
      cartao.querySelectorAll("div, span, p, strong").forEach((el) => {
        if (el.children.length === 0) {
          const t = (el.textContent || "").trim();
          if (/^\d{1,2}:\d{2}$/.test(t)) {
            const fs = parseFloat(window.getComputedStyle(el).fontSize) || 0;
            if (fs >= maiorFonte) {
              maiorFonte = fs;
              relEl = el;
            }
          }
        }
      });
      if (relEl) relEl.textContent = mmss;

      // Atualiza Round X de Y
      cartao.querySelectorAll("div, span, p").forEach((el) => {
        if (el.children.length === 0 && /round\s+\d+/i.test(el.textContent || "")) {
          el.textContent = `Round ${hiitRound} de ${cfg.totalRounds}`;
        }
      });

      // Atualiza badge TRABALHO / DESCANSO
      cartao.querySelectorAll("div, span").forEach((el) => {
        if (el.children.length === 0) {
          const t = (el.textContent || "").trim().toUpperCase();
          if (t === "TRABALHO" || t === "DESCANSO" || t === "PRONTO") {
            el.textContent = hiitTrabalho ? "TRABALHO" : "DESCANSO";
          }
        }
      });
    } catch {}
  }

  function passoCartaoHiit() {
    try {
      if (!hiitAtivo) {
        pintarCartaoHiit();
        return;
      }
      const cfg = lerValoresCartaoHiit(localizarCartaoHiit());
      const decorrido = Math.floor((Date.now() - hiitInicioMs) / 1000);
      const restante = hiitDuracaoSeg - decorrido;

      if (restante > 0) {
        hiitRestanteSeg = restante;
        pintarCartaoHiit();
        return;
      }

      beep(hiitTrabalho ? 660 : 990, 150);
      if (hiitTrabalho) {
        hiitTrabalho = false;
        hiitDuracaoSeg = cfg.descanso;
        hiitRestanteSeg = hiitDuracaoSeg;
        hiitInicioMs = Date.now();
      } else if (hiitRound < cfg.totalRounds) {
        hiitRound += 1;
        hiitTrabalho = true;
        hiitDuracaoSeg = cfg.treino;
        hiitRestanteSeg = hiitDuracaoSeg;
        hiitInicioMs = Date.now();
      } else {
        hiitAtivo = false;
        hiitRestanteSeg = 0;
        if (hiitLoopId) {
          clearInterval(hiitLoopId);
          hiitLoopId = null;
        }
      }
      pintarCartaoHiit();
    } catch {}
  }

  function iniciarCartaoHiit() {
    const cfg = lerValoresCartaoHiit(localizarCartaoHiit());
    beep(880, 120);
    const base = hiitRestanteSeg > 0 ? hiitRestanteSeg : cfg.treino;
    hiitDuracaoSeg = base;
    hiitRestanteSeg = base;
    hiitInicioMs = Date.now();
    hiitAtivo = true;
    pintarCartaoHiit();
    if (hiitLoopId) clearInterval(hiitLoopId);
    hiitLoopId = setInterval(passoCartaoHiit, 120);
  }

  function pausarCartaoHiit() {
    if (hiitAtivo) {
      passoCartaoHiit();
      hiitAtivo = false;
    }
    if (hiitLoopId) {
      clearInterval(hiitLoopId);
      hiitLoopId = null;
    }
    pintarCartaoHiit();
  }

  function zerarCartaoHiit() {
    const cfg = lerValoresCartaoHiit(localizarCartaoHiit());
    hiitAtivo = false;
    if (hiitLoopId) {
      clearInterval(hiitLoopId);
      hiitLoopId = null;
    }
    hiitTrabalho = true;
    hiitRound = 1;
    hiitDuracaoSeg = cfg.treino;
    hiitRestanteSeg = hiitDuracaoSeg;
    hiitInicioMs = Date.now();
    pintarCartaoHiit();
  }

  function fullEcranCartaoHiit() {
    const cartao = localizarCartaoHiit();
    if (!cartao) return;
    if (!document.fullscreenElement && typeof cartao.requestFullscreen === "function") {
      cartao.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  }

  document.addEventListener(
    "click",
    (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const cartao = localizarCartaoHiit();
      if (!cartao || !cartao.contains(btn)) return;

      const label = (btn.textContent || "").trim().toLowerCase();
      if (label === "iniciar") {
        iniciarCartaoHiit();
      } else if (label === "pausar") {
        pausarCartaoHiit();
      } else if (label === "zerar") {
        zerarCartaoHiit();
      } else if (label.includes("full")) {
        fullEcranCartaoHiit();
      } else if (label.includes("tabata 20/10") || label.includes("crosshitbox 40/20") || label.includes("boxe 3m/1m")) {
        setTimeout(() => {
          const cfg = lerValoresCartaoHiit(cartao);
          hiitAtivo = false;
          hiitTrabalho = true;
          hiitRound = 1;
          hiitDuracaoSeg = cfg.treino;
          hiitRestanteSeg = cfg.treino;
          pintarCartaoHiit();
        }, 60);
      }
    },
    true
  );

  function removerDuplicados() {
    ["chbCronometroDefinitivoBox", "chbProgramaCronometro100Box", "chbCronometroFuncionalBox"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function montarUnico() {
    removerDuplicados();
    if (!document.getElementById("chbCronometroUnicoBlindado")) {
      const sec = document.createElement("section");
      sec.id = "chbCronometroUnicoBlindado";
      sec.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
      sec.innerHTML = `
        <div class="bg-slate-900/95 border border-emerald-500/50 rounded-2xl p-4 space-y-3 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div id="chbUnicoStatus" class="text-[11px] font-extrabold uppercase text-emerald-400">PAUSADO • TRABALHO • ROUND 1 DE 8</div>
              <div id="chbUnicoRelogio" data-chb-relogio-real="1" class="text-4xl font-mono font-black text-white mt-0.5">00:40</div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" onclick="chbUnicoIniciar()" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">Iniciar</button>
              <button type="button" onclick="chbUnicoPausar()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">Pausar</button>
              <button type="button" onclick="chbUnicoZerar()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">Zerar</button>
              <button type="button" onclick="chbUnicoFullEcra()" class="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold">Full Ecrã</button>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 pt-1">
            <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
              <span class="block text-[10px] text-slate-400">Treino (s)</span>
              <input id="chbUnicoTreino" type="number" min="1" max="600" value="40" onchange="chbUnicoZerar()" class="w-full bg-transparent text-white font-bold outline-none">
            </label>
            <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
              <span class="block text-[10px] text-slate-400">Descanso (s)</span>
              <input id="chbUnicoDescanso" type="number" min="1" max="600" value="20" class="w-full bg-transparent text-white font-bold outline-none">
            </label>
            <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
              <span class="block text-[10px] text-slate-400">Rounds</span>
              <input id="chbUnicoRounds" type="number" min="1" max="99" value="8" onchange="pintarForcado()" class="w-full bg-transparent text-white font-bold outline-none">
            </label>
          </div>
        </div>
      `;

      const mainEl = document.querySelector("main") || document.body;
      mainEl.insertBefore(sec, mainEl.firstChild);
    }

    restanteSeg = treinoConfig();
    duracaoSeg = restanteSeg;
    pintarForcado();

    const cartaoHiit = localizarCartaoHiit();
    if (cartaoHiit && !hiitAtivo) {
      const cfg = lerValoresCartaoHiit(cartaoHiit);
      hiitDuracaoSeg = cfg.treino;
      hiitRestanteSeg = cfg.treino;
      pintarCartaoHiit();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(montarUnico, 250));
  } else {
    setTimeout(montarUnico, 250);
  }
})();
