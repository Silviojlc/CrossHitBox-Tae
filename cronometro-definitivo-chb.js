(function () {
  if (window.__chbCronometroDefinitivoAtivo) return;
  window.__chbCronometroDefinitivoAtivo = true;

  let timerHandle = null;
  let segundosAtuais = 40;
  let emContagem = false;
  let roundAtual = 1;
  let faseTrabalho = true;

  function tocarBip() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close().catch(() => {});
      }, 140);
    } catch {}
  }

  function formatarTempo(s) {
    const num = Math.max(0, Number(s) || 0);
    const min = String(Math.floor(num / 60)).padStart(2, "0");
    const seg = String(num % 60).padStart(2, "0");
    return `${min}:${seg}`;
  }

  function lerSegundosConfigurados() {
    const inpTreino = document.getElementById("chbDefTreinoSeg");
    const val = inpTreino ? parseInt(inpTreino.value, 10) : 40;
    return Number.isFinite(val) && val > 0 ? val : 40;
  }

  function lerDescansoConfigurado() {
    const inpDesc = document.getElementById("chbDefDescansoSeg");
    const val = inpDesc ? parseInt(inpDesc.value, 10) : 20;
    return Number.isFinite(val) && val > 0 ? val : 20;
  }

  function lerTotalRounds() {
    const inpRounds = document.getElementById("chbDefRoundsTotais");
    const val = inpRounds ? parseInt(inpRounds.value, 10) : 8;
    return Number.isFinite(val) && val > 0 ? val : 8;
  }

  function pintarEcra() {
    const elTempo = document.getElementById("chbDefRelogio");
    const elEstado = document.getElementById("chbDefEstado");
    if (elTempo) elTempo.textContent = formatarTempo(segundosAtuais);
    if (elEstado) {
      const faseTxt = faseTrabalho ? "TRABALHO" : "DESCANSO";
      const estadoTxt = emContagem ? "A CONTAR" : "PAUSADO";
      elEstado.textContent = `${estadoTxt} • ${faseTxt} • Round ${roundAtual} de ${lerTotalRounds()}`;
    }
  }

  function tick() {
    if (!emContagem) return;
    if (segundosAtuais > 1) {
      segundosAtuais -= 1;
    } else {
      tocarBip();
      if (faseTrabalho) {
        faseTrabalho = false;
        segundosAtuais = lerDescansoConfigurado();
      } else {
        const total = lerTotalRounds();
        if (roundAtual < total) {
          roundAtual += 1;
          faseTrabalho = true;
          segundosAtuais = lerSegundosConfigurados();
        } else {
          emContagem = false;
          if (timerHandle) {
            clearInterval(timerHandle);
            timerHandle = null;
          }
          segundosAtuais = 0;
        }
      }
    }
    pintarEcra();
  }

  window.chbDefIniciar = function () {
    tocarBip();
    if (segundosAtuais <= 0) {
      segundosAtuais = lerSegundosConfigurados();
      faseTrabalho = true;
    }
    emContagem = true;
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
    pintarEcra();
    timerHandle = setInterval(tick, 1000);
  };

  window.chbDefPausar = function () {
    emContagem = false;
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
    pintarEcra();
  };

  window.chbDefZerar = function () {
    emContagem = false;
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
    faseTrabalho = true;
    roundAtual = 1;
    segundosAtuais = lerSegundosConfigurados();
    pintarEcra();
  };

  window.chbDefFullEcra = function () {
    const box = document.getElementById("chbCronometroDefinitivoBox");
    if (!box) return;
    if (!document.fullscreenElement && typeof box.requestFullscreen === "function") {
      box.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  };

  function montar() {
    if (document.getElementById("chbCronometroDefinitivoBox")) return;
    const sec = document.createElement("section");
    sec.id = "chbCronometroDefinitivoBox";
    sec.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    sec.innerHTML = `
      <div class="bg-slate-900/95 border border-emerald-500/50 rounded-2xl p-4 space-y-3 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div id="chbDefEstado" class="text-[11px] font-extrabold uppercase text-emerald-400">PAUSADO • TRABALHO • Round 1 de 8</div>
            <div id="chbDefRelogio" class="text-4xl font-mono font-black text-white mt-0.5">00:40</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" onclick="chbDefIniciar()" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">Iniciar</button>
            <button type="button" onclick="chbDefPausar()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">Pausar</button>
            <button type="button" onclick="chbDefZerar()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">Zerar</button>
            <button type="button" onclick="chbDefFullEcra()" class="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold">Full Ecrã</button>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 pt-1">
          <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
            <span class="block text-[10px] text-slate-400">Treino (s)</span>
            <input id="chbDefTreinoSeg" type="number" min="1" max="600" value="40" onchange="chbDefZerar()" class="w-full bg-transparent text-white font-bold outline-none">
          </label>
          <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
            <span class="block text-[10px] text-slate-400">Descanso (s)</span>
            <input id="chbDefDescansoSeg" type="number" min="1" max="600" value="20" class="w-full bg-transparent text-white font-bold outline-none">
          </label>
          <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
            <span class="block text-[10px] text-slate-400">Rounds</span>
            <input id="chbDefRoundsTotais" type="number" min="1" max="99" value="8" onchange="pintarEcra()" class="w-full bg-transparent text-white font-bold outline-none">
          </label>
        </div>
      </div>
    `;
    const mainEl = document.querySelector("main") || document.body;
    mainEl.insertBefore(sec, mainEl.firstChild);
    pintarEcra();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(montar, 250));
  } else {
    setTimeout(montar, 250);
  }
})();
