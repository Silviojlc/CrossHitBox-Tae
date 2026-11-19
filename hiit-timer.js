(function () {
  if (document.getElementById("hiitTimerModulo")) return;

  let estado = {
    trabalho: 40,
    descanso: 20,
    roundsTotal: 8,
    roundAtual: 1,
    fase: "PRONTO",
    segundosRestantes: 40,
    ativo: false,
    intervaloId: null
  };

  let sessaoAtiva = false;

  function tocarBip(freq, duracao, tipo = "sine") {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracao);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duracao);
    } catch {}
  }

  function formatarTempo(seg) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function atualizarUI() {
    const visor = document.getElementById("hiitVisorTempo");
    const badge = document.getElementById("hiitFaseBadge");
    const roundTxt = document.getElementById("hiitRoundTexto");
    const box = document.getElementById("hiitTimerModulo");
    if (!visor || !badge || !roundTxt || !box) return;

    visor.textContent = formatarTempo(estado.segundosRestantes);
    roundTxt.textContent = "Round " + estado.roundAtual + " de " + estado.roundsTotal;
    badge.textContent = estado.fase;

    box.classList.remove("border-emerald-500/60", "border-amber-500/60", "border-sky-500/60", "border-slate-800");
    badge.className = "px-2.5 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase ";

    if (estado.fase === "TRABALHO") {
      box.classList.add("border-emerald-500/60");
      badge.className += "bg-emerald-500 text-slate-950";
    } else if (estado.fase === "DESCANSO") {
      box.classList.add("border-amber-500/60");
      badge.className += "bg-amber-400 text-slate-950";
    } else if (estado.fase === "CONCLUIDO") {
      box.classList.add("border-sky-500/60");
      badge.className += "bg-sky-400 text-slate-950";
    } else {
      box.classList.add("border-slate-800");
      badge.className += "bg-slate-800 text-slate-200";
    }
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("hiitTimerModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
    } else {
      el.classList.add("hidden");
      el.style.display = "none";
    }
    window.dispatchEvent(new CustomEvent("crosshitbox:sessao", { detail: { ativa: sessaoAtiva } }));
  }

  function tick() {
    if (!estado.ativo) return;

    if (estado.segundosRestantes > 1) {
      estado.segundosRestantes -= 1;
      if (estado.segundosRestantes <= 3) {
        tocarBip(660, 0.14, "triangle");
      }
      atualizarUI();
      return;
    }

    if (estado.fase === "TRABALHO") {
      if (estado.roundAtual >= estado.roundsTotal) {
        estado.fase = "CONCLUIDO";
        estado.segundosRestantes = 0;
        estado.ativo = false;
        clearInterval(estado.intervaloId);
        tocarBip(980, 0.55, "square");
      } else {
        estado.fase = "DESCANSO";
        estado.segundosRestantes = estado.descanso;
        tocarBip(440, 0.35, "sawtooth");
      }
    } else if (estado.fase === "DESCANSO") {
      estado.roundAtual += 1;
      estado.fase = "TRABALHO";
      estado.segundosRestantes = estado.trabalho;
      tocarBip(880, 0.35, "square");
    }
    atualizarUI();
  }

  window.hiitAplicarPreset = function (trabalho, descanso, rounds) {
    window.hiitReiniciar(trabalho, descanso, rounds);
  };

  window.hiitLerInputs = function () {
    const t = Math.max(5, parseInt(document.getElementById("hiitInputTrabalho")?.value || "40", 10));
    const d = Math.max(0, parseInt(document.getElementById("hiitInputDescanso")?.value || "20", 10));
    const r = Math.max(1, parseInt(document.getElementById("hiitInputRounds")?.value || "8", 10));
    window.hiitReiniciar(t, d, r);
  };

  window.hiitIniciar = function () {
    if (estado.ativo) return;
    if (estado.fase === "PRONTO" || estado.fase === "CONCLUIDO") {
      estado.fase = "TRABALHO";
      estado.roundAtual = 1;
      estado.segundosRestantes = estado.trabalho;
      tocarBip(880, 0.35, "square");
    }
    estado.ativo = true;
    clearInterval(estado.intervaloId);
    estado.intervaloId = setInterval(tick, 1000);
    atualizarUI();
  };

  window.hiitPausar = function () {
    estado.ativo = false;
    clearInterval(estado.intervaloId);
    atualizarUI();
  };

  window.hiitReiniciar = function (trabalho, descanso, rounds) {
    estado.ativo = false;
    clearInterval(estado.intervaloId);
    if (typeof trabalho === "number") estado.trabalho = trabalho;
    if (typeof descanso === "number") estado.descanso = descanso;
    if (typeof rounds === "number") estado.roundsTotal = rounds;

    const inT = document.getElementById("hiitInputTrabalho");
    const inD = document.getElementById("hiitInputDescanso");
    const inR = document.getElementById("hiitInputRounds");
    if (inT) inT.value = estado.trabalho;
    if (inD) inD.value = estado.descanso;
    if (inR) inR.value = estado.roundsTotal;

    estado.roundAtual = 1;
    estado.fase = "PRONTO";
    estado.segundosRestantes = estado.trabalho;
    atualizarUI();
  };

  const container = document.createElement("section");
  container.id = "hiitTimerModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl transition-colors";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-amber-400">Cronómetro HIIT / Tabata — CrossHitBox Tae</h2>
        <p class="text-xs text-slate-400">Temporizador intervalado com sinal sonoro para treino ao vivo ou gravado.</p>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button type="button" onclick="hiitAplicarPreset(20, 10, 8)" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Tabata 20/10</button>
        <button type="button" onclick="hiitAplicarPreset(40, 20, 10)" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">CrossHitBox 40/20</button>
        <button type="button" onclick="hiitAplicarPreset(180, 60, 5)" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Boxe 3m/1m</button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
        <div class="flex items-center justify-center gap-2 mb-1">
          <span id="hiitFaseBadge" class="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase bg-slate-800 text-slate-200">PRONTO</span>
          <span id="hiitRoundTexto" class="text-xs font-semibold text-slate-400">Round 1 de 8</span>
        </div>
        <div id="hiitVisorTempo" class="text-5xl font-black tracking-tight text-white font-mono my-1">00:40</div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <label class="block text-[11px] text-slate-400 mb-1">Treino (s)</label>
          <input id="hiitInputTrabalho" type="number" min="5" value="40" onchange="hiitLerInputs()" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white font-bold">
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <label class="block text-[11px] text-slate-400 mb-1">Descanso (s)</label>
          <input id="hiitInputDescanso" type="number" min="0" value="20" onchange="hiitLerInputs()" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white font-bold">
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <label class="block text-[11px] text-slate-400 mb-1">Rounds</label>
          <input id="hiitInputRounds" type="number" min="1" value="8" onchange="hiitLerInputs()" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white font-bold">
        </div>
      </div>

      <div class="flex flex-wrap md:justify-end gap-2">
        <button type="button" onclick="hiitIniciar()" class="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm">Iniciar</button>
        <button type="button" onclick="hiitPausar()" class="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm">Pausar</button>
        <button type="button" onclick="hiitReiniciar()" class="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm">Zerar</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  function avaliarEstadoReal() {
    const bodyText = document.body ? (document.body.innerText || "") : "";
    const temBotaoSair = Array.from(document.querySelectorAll("button, a")).some((el) => {
      const t = (el.textContent || "").trim().toLowerCase();
      return (t === "sair" || t === "terminar sessão" || t === "logout") && el.offsetParent !== null;
    });
    const temSecaoAutenticada = bodyText.includes("Sessão ativa como:") || bodyText.includes("Vídeos de Aulas Gravadas") || bodyText.includes("Configurar Sala de Videochamada");
    const novaAtiva = Boolean(temBotaoSair || temSecaoAutenticada);
    if (novaAtiva !== sessaoAtiva) {
      sessaoAtiva = novaAtiva;
      aplicarVisibilidade();
    }
  }

  document.addEventListener("click", (ev) => {
    const alvo = ev.target.closest("button");
    if (!alvo) return;
    const txt = (alvo.textContent || "").trim().toLowerCase();
    if (txt === "sair" || txt === "terminar sessão" || txt === "logout") {
      sessaoAtiva = false;
      window.hiitPausar();
      aplicarVisibilidade();
    } else {
      setTimeout(avaliarEstadoReal, 150);
      setTimeout(avaliarEstadoReal, 500);
    }
  });

  document.addEventListener("submit", () => {
    setTimeout(avaliarEstadoReal, 200);
    setTimeout(avaliarEstadoReal, 600);
  });

  setInterval(avaliarEstadoReal, 500);
  aplicarVisibilidade();
  atualizarUI();
})();
