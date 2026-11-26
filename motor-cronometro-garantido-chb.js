(function () {
  window.__chbMotorCronometroGarantido = true;

  let preset = { nome: "CrossHitBox 40/20", treino: 40, descanso: 20, rounds: 8 };
  let rodando = false;
  let inicioFaseMs = 0;
  let duracaoSeg = preset.treino;
  let restanteSeg = preset.treino;
  let roundAtual = 1;
  let emTrabalho = true;
  let timeoutId = null;
  let rafId = null;

  function beep(freq = 880, ms = 110) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.05;
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

  function atualizarVisor() {
    const elTempo = document.getElementById("chbRelogioRealGarantido");
    const elEstado = document.getElementById("chbEstadoRealGarantido");
    const elModo = document.getElementById("chbModoRealGarantido");
    if (elTempo) elTempo.textContent = fmt(restanteSeg);
    if (elModo) elModo.textContent = preset.nome;
    if (elEstado) {
      const st = rodando ? "A CONTAR" : "PAUSADO";
      const fase = emTrabalho ? "TRABALHO" : "DESCANSO";
      elEstado.textContent = `${st} • ${fase} • Round ${roundAtual} de ${preset.rounds}`;
    }
  }

  function pararAgendamento() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function agendarProximoPasso() {
    pararAgendamento();
    if (!rodando) return;
    timeoutId = setTimeout(passo, 150);
    rafId = requestAnimationFrame(passo);
  }

  function passo() {
    if (!rodando) {
      atualizarVisor();
      return;
    }
    const decorrido = Math.floor((Date.now() - inicioFaseMs) / 1000);
    const rest = duracaoSeg - decorrido;

    if (rest > 0) {
      restanteSeg = rest;
      atualizarVisor();
      agendarProximoPasso();
      return;
    }

    beep(emTrabalho ? 660 : 990, 140);
    if (emTrabalho) {
      emTrabalho = false;
      duracaoSeg = preset.descanso;
      restanteSeg = duracaoSeg;
      inicioFaseMs = Date.now();
      atualizarVisor();
      agendarProximoPasso();
    } else if (roundAtual < preset.rounds) {
      roundAtual += 1;
      emTrabalho = true;
      duracaoSeg = preset.treino;
      restanteSeg = duracaoSeg;
      inicioFaseMs = Date.now();
      atualizarVisor();
      agendarProximoPasso();
    } else {
      rodando = false;
      restanteSeg = 0;
      pararAgendamento();
      atualizarVisor();
    }
  }

  window.chbGarantidoPreset = function (nome, treino, descanso, rounds) {
    preset = { nome, treino, descanso, rounds };
    rodando = false;
    pararAgendamento();
    emTrabalho = true;
    roundAtual = 1;
    duracaoSeg = treino;
    restanteSeg = treino;
    inicioFaseMs = Date.now();
    const inT = document.getElementById("chbGarantidoTreino");
    const inD = document.getElementById("chbGarantidoDescanso");
    const inR = document.getElementById("chbGarantidoRounds");
    if (inT) inT.value = treino;
    if (inD) inD.value = descanso;
    if (inR) inR.value = rounds;
    atualizarVisor();
  };

  window.chbGarantidoLerInputs = function () {
    const t = Math.max(1, parseInt((document.getElementById("chbGarantidoTreino") || {}).value || preset.treino, 10) || preset.treino);
    const d = Math.max(0, parseInt((document.getElementById("chbGarantidoDescanso") || {}).value || preset.descanso, 10) || 0);
    const r = Math.max(1, parseInt((document.getElementById("chbGarantidoRounds") || {}).value || preset.rounds, 10) || 1);
    preset = { ...preset, treino: t, descanso: d, rounds: r };
    if (!rodando) {
      emTrabalho = true;
      roundAtual = 1;
      duracaoSeg = t;
      restanteSeg = t;
      atualizarVisor();
    }
  };

  window.chbGarantidoIniciar = function () {
    beep(880, 110);
    const base = restanteSeg > 0 ? restanteSeg : emTrabalho ? preset.treino : preset.descanso;
    duracaoSeg = base;
    restanteSeg = base;
    inicioFaseMs = Date.now();
    rodando = true;
    atualizarVisor();
    agendarProximoPasso();
  };

  window.chbGarantidoPausar = function () {
    if (rodando) {
      const decorrido = Math.floor((Date.now() - inicioFaseMs) / 1000);
      restanteSeg = Math.max(0, duracaoSeg - decorrido);
      rodando = false;
    }
    pararAgendamento();
    atualizarVisor();
  };

  window.chbGarantidoZerar = function () {
    rodando = false;
    pararAgendamento();
    emTrabalho = true;
    roundAtual = 1;
    duracaoSeg = preset.treino;
    restanteSeg = duracaoSeg;
    inicioFaseMs = Date.now();
    atualizarVisor();
  };

  window.chbGarantidoFullEcra = function () {
    const box = document.getElementById("chbCronometroGarantidoBox");
    if (!box) return;
    if (!document.fullscreenElement && typeof box.requestFullscreen === "function") {
      box.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  };

  function montar() {
    if (document.getElementById("chbCronometroGarantidoBox")) return;
    const sec = document.createElement("section");
    sec.id = "chbCronometroGarantidoBox";
    sec.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    sec.innerHTML = `
      <div class="bg-slate-900/95 border border-emerald-500/50 rounded-2xl p-4 space-y-3 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span id="chbModoRealGarantido" class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase">CrossHitBox 40/20</span>
              <span id="chbEstadoRealGarantido" class="text-[11px] font-extrabold uppercase text-emerald-400">PAUSADO • TRABALHO • Round 1 de 8</span>
            </div>
            <div id="chbRelogioRealGarantido" class="text-4xl font-mono font-black text-white mt-1">00:40</div>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button type="button" onclick="chbGarantidoPreset('Tabata 20/10', 20, 10, 8)" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold">Tabata 20/10</button>
            <button type="button" onclick="chbGarantidoPreset('CrossHitBox 40/20', 40, 20, 8)" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold">CrossHitBox 40/20</button>
            <button type="button" onclick="chbGarantidoPreset('Boxe 3m/1m', 180, 60, 5)" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold">Boxe 3m/1m</button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
            <span class="block text-[10px] text-slate-400">Treino (s)</span>
            <input id="chbGarantidoTreino" type="number" min="1" value="40" onchange="chbGarantidoLerInputs()" class="w-full bg-transparent text-white font-bold outline-none">
          </label>
          <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
            <span class="block text-[10px] text-slate-400">Descanso (s)</span>
            <input id="chbGarantidoDescanso" type="number" min="0" value="20" onchange="chbGarantidoLerInputs()" class="w-full bg-transparent text-white font-bold outline-none">
          </label>
          <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
            <span class="block text-[10px] text-slate-400">Rounds</span>
            <input id="chbGarantidoRounds" type="number" min="1" value="8" onchange="chbGarantidoLerInputs()" class="w-full bg-transparent text-white font-bold outline-none">
          </label>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="chbGarantidoIniciar()" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">Iniciar</button>
          <button type="button" onclick="chbGarantidoPausar()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">Pausar</button>
          <button type="button" onclick="chbGarantidoZerar()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">Zerar</button>
          <button type="button" onclick="chbGarantidoFullEcra()" class="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold">Full Ecrã</button>
        </div>
      </div>
    `;
    const mainEl = document.querySelector("main") || document.body;
    mainEl.insertBefore(sec, mainEl.firstChild);
    atualizarVisor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(montar, 200));
  } else {
    setTimeout(montar, 200);
  }
})();
