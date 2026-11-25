(function () {
  if (window.__chbCronometroCombateTotal) return;
  window.__chbCronometroCombateTotal = true;

  let ativo = false;
  let inicioMs = 0;
  let duracaoSeg = 40;
  let restanteSeg = 40;
  let roundAtual = 1;
  let faseTrabalho = true;
  let timerRapido = null;
  let rafId = null;

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
        const estado = ativo ? "A CONTAR" : "PAUSADO";
        const fase = faseTrabalho ? "TRABALHO" : "DESCANSO";
        st.textContent = `${estado} • ${fase} • ROUND ${roundAtual} DE ${roundsConfig()}`;
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
      const novoRestante = duracaoSeg - decorrido;

      if (novoRestante > 0) {
        restanteSeg = novoRestante;
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

  function removerDuplicados() {
    ["chbCronometroDefinitivoBox", "chbProgramaCronometro100Box", "chbCronometroFuncionalBox"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function montarUnico() {
    removerDuplicados();
    if (document.getElementById("chbCronometroUnicoBlindado")) return;

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
    restanteSeg = treinoConfig();
    duracaoSeg = restanteSeg;
    pintarForcado();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(montarUnico, 250));
  } else {
    setTimeout(montarUnico, 250);
  }
})();
