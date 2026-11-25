(function () {
  if (window.__chbCronometroPrograma100) return;
  window.__chbCronometroPrograma100 = true;

  let rodando = false;
  let inicioMs = 0;
  let duracaoSeg = 40;
  let restanteSeg = 40;
  let roundAtual = 1;
  let emTrabalho = true;
  let intervaloSync = null;

  function beepCurto(freq = 880, durMs = 130) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close().catch(() => {});
      }, durMs);
    } catch {}
  }

  function fmtMMSS(totalSeg) {
    const s = Math.max(0, Math.floor(Number(totalSeg) || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function getTreinoSeg() {
    const el = document.getElementById("chbProgInpTreino");
    const v = el ? parseInt(el.value, 10) : 40;
    return Number.isFinite(v) && v > 0 ? v : 40;
  }

  function getDescansoSeg() {
    const el = document.getElementById("chbProgInpDescanso");
    const v = el ? parseInt(el.value, 10) : 20;
    return Number.isFinite(v) && v > 0 ? v : 20;
  }

  function getRoundsTotal() {
    const el = document.getElementById("chbProgInpRounds");
    const v = el ? parseInt(el.value, 10) : 8;
    return Number.isFinite(v) && v > 0 ? v : 8;
  }

  function renderizarVisor() {
    const relEl = document.getElementById("chbProgCronRelogio");
    const stEl = document.getElementById("chbProgCronStatus");
    if (relEl) relEl.textContent = fmtMMSS(restanteSeg);
    if (stEl) {
      const estado = rodando ? "A CONTAR" : "PAUSADO";
      const fase = emTrabalho ? "TRABALHO" : "DESCANSO";
      stEl.textContent = `${estado} • ${fase} • Round ${roundAtual} de ${getRoundsTotal()}`;
    }
  }

  function avancarPasso() {
    if (!rodando) {
      renderizarVisor();
      return;
    }
    const passado = Math.floor((Date.now() - inicioMs) / 1000);
    const novoRestante = duracaoSeg - passado;

    if (novoRestante > 0) {
      restanteSeg = novoRestante;
      renderizarVisor();
      return;
    }

    beepCurto(emTrabalho ? 660 : 990, 160);
    if (emTrabalho) {
      emTrabalho = false;
      duracaoSeg = getDescansoSeg();
      restanteSeg = duracaoSeg;
      inicioMs = Date.now();
    } else {
      const total = getRoundsTotal();
      if (roundAtual < total) {
        roundAtual += 1;
        emTrabalho = true;
        duracaoSeg = getTreinoSeg();
        restanteSeg = duracaoSeg;
        inicioMs = Date.now();
      } else {
        rodando = false;
        restanteSeg = 0;
        if (intervaloSync) {
          clearInterval(intervaloSync);
          intervaloSync = null;
        }
      }
    }
    renderizarVisor();
  }

  window.chbProgCronIniciar = function () {
    beepCurto(880, 120);
    if (!rodando) {
      const segPartida = restanteSeg > 0 ? restanteSeg : getTreinoSeg();
      duracaoSeg = segPartida;
      restanteSeg = segPartida;
      inicioMs = Date.now();
      rodando = true;
    }
    renderizarVisor();
    if (intervaloSync) clearInterval(intervaloSync);
    intervaloSync = setInterval(avancarPasso, 120);
    requestAnimationFrame(avancarPasso);
  };

  window.chbProgCronPausar = function () {
    if (rodando) {
      avancarPasso();
      rodando = false;
    }
    if (intervaloSync) {
      clearInterval(intervaloSync);
      intervaloSync = null;
    }
    renderizarVisor();
  };

  window.chbProgCronZerar = function () {
    rodando = false;
    if (intervaloSync) {
      clearInterval(intervaloSync);
      intervaloSync = null;
    }
    emTrabalho = true;
    roundAtual = 1;
    duracaoSeg = getTreinoSeg();
    restanteSeg = duracaoSeg;
    inicioMs = Date.now();
    renderizarVisor();
  };

  window.chbProgCronFullEcra = function () {
    const box = document.getElementById("chbProgramaCronometro100Box");
    if (!box) return;
    if (!document.fullscreenElement && typeof box.requestFullscreen === "function") {
      box.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  };

  function montar() {
    if (document.getElementById("chbProgramaCronometro100Box")) return;
    const sec = document.createElement("section");
    sec.id = "chbProgramaCronometro100Box";
    sec.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    sec.innerHTML = `
      <div class="bg-slate-900/95 border border-emerald-500/50 rounded-2xl p-4 space-y-3 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div id="chbProgCronStatus" class="text-[11px] font-extrabold uppercase text-emerald-400">PAUSADO • TRABALHO • Round 1 de 8</div>
            <div id="chbProgCronRelogio" class="text-4xl font-mono font-black text-white mt-0.5">00:40</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" onclick="chbProgCronIniciar()" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">Iniciar</button>
            <button type="button" onclick="chbProgCronPausar()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">Pausar</button>
            <button type="button" onclick="chbProgCronZerar()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">Zerar</button>
            <button type="button" onclick="chbProgCronFullEcra()" class="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold">Full Ecrã</button>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 pt-1">
          <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
            <span class="block text-[10px] text-slate-400">Treino (s)</span>
            <input id="chbProgInpTreino" type="number" min="1" max="600" value="40" onchange="chbProgCronZerar()" class="w-full bg-transparent text-white font-bold outline-none">
          </label>
          <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
            <span class="block text-[10px] text-slate-400">Descanso (s)</span>
            <input id="chbProgInpDescanso" type="number" min="1" max="600" value="20" class="w-full bg-transparent text-white font-bold outline-none">
          </label>
          <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
            <span class="block text-[10px] text-slate-400">Rounds</span>
            <input id="chbProgInpRounds" type="number" min="1" max="99" value="8" onchange="renderizarVisor()" class="w-full bg-transparent text-white font-bold outline-none">
          </label>
        </div>
      </div>
    `;
    const mainEl = document.querySelector("main") || document.body;
    mainEl.insertBefore(sec, mainEl.firstChild);
    restanteSeg = getTreinoSeg();
    duracaoSeg = restanteSeg;
    renderizarVisor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(montar, 200));
  } else {
    setTimeout(montar, 200);
  }
})();
