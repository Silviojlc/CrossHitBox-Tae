(function () {
  if (window.__chbCronometroUnicoBlindado) return;
  window.__chbCronometroUnicoBlindado = true;

  let emExecucao = false;
  let timestampInicioFase = 0;
  let duracaoFaseSeg = 40;
  let segundosRestantes = 40;
  let roundAtual = 1;
  let emTrabalho = true;
  let loopId = null;

  function beep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.06;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        try {
          osc.stop();
          ctx.close().catch(() => {});
        } catch {}
      }, 120);
    } catch {}
  }

  function fmt(s) {
    const n = Math.max(0, Math.floor(Number(s) || 0));
    const m = String(Math.floor(n / 60)).padStart(2, "0");
    const seg = String(n % 60).padStart(2, "0");
    return `${m}:${seg}`;
  }

  function lerTreino() {
    const el = document.getElementById("chbUnicoTreino");
    const v = el ? parseInt(el.value, 10) : 40;
    return Number.isFinite(v) && v > 0 ? v : 40;
  }

  function lerDescanso() {
    const el = document.getElementById("chbUnicoDescanso");
    const v = el ? parseInt(el.value, 10) : 20;
    return Number.isFinite(v) && v > 0 ? v : 20;
  }

  function lerRounds() {
    const el = document.getElementById("chbUnicoRounds");
    const v = el ? parseInt(el.value, 10) : 8;
    return Number.isFinite(v) && v > 0 ? v : 8;
  }

  function atualizarEcra() {
    try {
      const rel = document.getElementById("chbUnicoRelogio");
      const st = document.getElementById("chbUnicoStatus");
      if (rel) rel.textContent = fmt(segundosRestantes);
      if (st) {
        const estadoTxt = emExecucao ? "A CONTAR" : "PAUSADO";
        const faseTxt = emTrabalho ? "TRABALHO" : "DESCANSO";
        st.textContent = `${estadoTxt} • ${faseTxt} • ROUND ${roundAtual} DE ${lerRounds()}`;
      }
    } catch {}
  }

  function passo() {
    try {
      if (!emExecucao) {
        atualizarEcra();
        return;
      }
      const decorrido = Math.floor((Date.now() - timestampInicioFase) / 1000);
      const restante = duracaoFaseSeg - decorrido;

      if (restante > 0) {
        segundosRestantes = restante;
        atualizarEcra();
        return;
      }

      beep();
      if (emTrabalho) {
        emTrabalho = false;
        duracaoFaseSeg = lerDescanso();
        segundosRestantes = duracaoFaseSeg;
        timestampInicioFase = Date.now();
      } else {
        const total = lerRounds();
        if (roundAtual < total) {
          roundAtual += 1;
          emTrabalho = true;
          duracaoFaseSeg = lerTreino();
          segundosRestantes = duracaoFaseSeg;
          timestampInicioFase = Date.now();
        } else {
          emExecucao = false;
          segundosRestantes = 0;
        }
      }
      atualizarEcra();
    } catch {}
  }

  window.chbUnicoIniciar = function () {
    beep();
    const base = segundosRestantes > 0 ? segundosRestantes : lerTreino();
    duracaoFaseSeg = base;
    segundosRestantes = base;
    timestampInicioFase = Date.now();
    emExecucao = true;
    atualizarEcra();
    if (loopId) clearInterval(loopId);
    loopId = setInterval(passo, 150);
  };

  window.chbUnicoPausar = function () {
    if (emExecucao) {
      passo();
      emExecucao = false;
    }
    if (loopId) {
      clearInterval(loopId);
      loopId = null;
    }
    atualizarEcra();
  };

  window.chbUnicoZerar = function () {
    emExecucao = false;
    if (loopId) {
      clearInterval(loopId);
      loopId = null;
    }
    emTrabalho = true;
    roundAtual = 1;
    duracaoFaseSeg = lerTreino();
    segundosRestantes = duracaoFaseSeg;
    timestampInicioFase = Date.now();
    atualizarEcra();
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

  function removerDuplicadosAntigos() {
    ["chbCronometroDefinitivoBox", "chbProgramaCronometro100Box", "chbCronometroFuncionalBox"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function montarUnico() {
    removerDuplicadosAntigos();
    if (document.getElementById("chbCronometroUnicoBlindado")) return;

    const sec = document.createElement("section");
    sec.id = "chbCronometroUnicoBlindado";
    sec.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    sec.innerHTML = `
      <div class="bg-slate-900/95 border border-emerald-500/50 rounded-2xl p-4 space-y-3 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div id="chbUnicoStatus" class="text-[11px] font-extrabold uppercase text-emerald-400">PAUSADO • TRABALHO • ROUND 1 DE 8</div>
            <div id="chbUnicoRelogio" class="text-4xl font-mono font-black text-white mt-0.5">00:40</div>
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
            <input id="chbUnicoRounds" type="number" min="1" max="99" value="8" onchange="atualizarEcra()" class="w-full bg-transparent text-white font-bold outline-none">
          </label>
        </div>
      </div>
    `;

    const mainEl = document.querySelector("main") || document.body;
    mainEl.insertBefore(sec, mainEl.firstChild);
    segundosRestantes = lerTreino();
    duracaoFaseSeg = segundosRestantes;
    atualizarEcra();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(montarUnico, 250));
  } else {
    setTimeout(montarUnico, 250);
  }
})();
