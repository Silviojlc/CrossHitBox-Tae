(function () {
  window.__chbHiitModoTravadoFix = true;

  // Modo padrão inicial: CrossHitBox 40/20 (8 rounds)
  let modoAtual = { nome: "CrossHitBox 40/20", treino: 40, descanso: 20, rounds: 8 };
  let rodando = false;
  let inicioMs = 0;
  let duracaoSeg = modoAtual.treino;
  let restanteSeg = modoAtual.treino;
  let roundAtual = 1;
  let emTrabalho = true;

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

  function getModuloHiit() {
    return (
      document.getElementById("hiitTimerModulo") ||
      Array.from(document.querySelectorAll("section, div")).find(
        (el) => (el.innerText || "").includes("Cronómetro HIIT / Tabata") && el.querySelector("button")
      ) ||
      null
    );
  }

  function sincronizarInputsComModo(mod) {
    if (!mod) return;
    const inps = Array.from(mod.querySelectorAll("input[type='number'], input"));
    if (inps[0] && String(inps[0].value) !== String(modoAtual.treino)) {
      inps[0].value = String(modoAtual.treino);
    }
    if (inps[1] && String(inps[1].value) !== String(modoAtual.descanso)) {
      inps[1].value = String(modoAtual.descanso);
    }
    if (inps[2] && String(inps[2].value) !== String(modoAtual.rounds)) {
      inps[2].value = String(modoAtual.rounds);
    }
  }

  function garantirVisor(mod) {
    if (!mod) return null;
    let visor = document.getElementById("chbHiitDisplayReal");
    if (!visor) {
      visor = document.createElement("div");
      visor.id = "chbHiitDisplayReal";
      visor.style.cssText =
        "font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: 2px; line-height: 1.1; margin-top: 6px;";
    }

    const badgeTrabalho = Array.from(mod.querySelectorAll("div, span")).find(
      (el) => el.children.length === 0 && /^(TRABALHO|DESCANSO|PRONTO)$/i.test((el.textContent || "").trim())
    );
    const painelEsquerdo =
      (badgeTrabalho && badgeTrabalho.closest("div.rounded-xl, div.rounded-2xl")) ||
      (badgeTrabalho && badgeTrabalho.parentElement && badgeTrabalho.parentElement.parentElement) ||
      mod;

    if (visor.parentElement !== painelEsquerdo) {
      painelEsquerdo.appendChild(visor);
    }
    return visor;
  }

  function pintar(mod) {
    try {
      if (!mod) mod = getModuloHiit();
      if (!mod) return;
      sincronizarInputsComModo(mod);

      const visor = garantirVisor(mod);
      const textoTempo = fmt(restanteSeg);
      if (visor && visor.textContent !== textoTempo) {
        visor.textContent = textoTempo;
      }

      mod.querySelectorAll("div, span, p").forEach((el) => {
        if (el.children.length === 0 && /round\s+\d+/i.test((el.textContent || "").trim())) {
          const alvoRound = `Round ${roundAtual} de ${modoAtual.rounds}`;
          if ((el.textContent || "").trim() !== alvoRound) {
            el.textContent = alvoRound;
          }
        }
      });

      mod.querySelectorAll("div, span").forEach((el) => {
        if (el.children.length === 0) {
          const t = (el.textContent || "").trim().toUpperCase();
          const alvoFase = emTrabalho ? "TRABALHO" : "DESCANSO";
          if ((t === "TRABALHO" || t === "DESCANSO" || t === "PRONTO") && t !== alvoFase) {
            el.textContent = alvoFase;
          }
        }
      });
    } catch {}
  }

  function passoContagem() {
    try {
      const mod = getModuloHiit();
      if (!mod) return;

      if (!rodando) {
        pintar(mod);
        return;
      }

      const decorrido = Math.floor((Date.now() - inicioMs) / 1000);
      const novoRestante = duracaoSeg - decorrido;

      if (novoRestante > 0) {
        restanteSeg = novoRestante;
        pintar(mod);
        return;
      }

      beep(emTrabalho ? 660 : 990, 130);
      if (emTrabalho) {
        emTrabalho = false;
        duracaoSeg = modoAtual.descanso;
        restanteSeg = duracaoSeg;
        inicioMs = Date.now();
      } else if (roundAtual < modoAtual.rounds) {
        roundAtual += 1;
        emTrabalho = true;
        duracaoSeg = modoAtual.treino;
        restanteSeg = duracaoSeg;
        inicioMs = Date.now();
      } else {
        rodando = false;
        restanteSeg = 0;
      }
      pintar(mod);
    } catch {}
  }

  function iniciarContagem() {
    beep(880, 110);
    const base = restanteSeg > 0 ? restanteSeg : emTrabalho ? modoAtual.treino : modoAtual.descanso;
    duracaoSeg = base;
    restanteSeg = base;
    inicioMs = Date.now();
    rodando = true;
    passoContagem();
  }

  function pausarContagem() {
    if (rodando) {
      passoContagem();
      rodando = false;
    }
    pintar(getModuloHiit());
  }

  function zerarContagem() {
    rodando = false;
    emTrabalho = true;
    roundAtual = 1;
    duracaoSeg = modoAtual.treino;
    restanteSeg = duracaoSeg;
    inicioMs = Date.now();
    pintar(getModuloHiit());
  }

  function aplicarModo(novoModo) {
    modoAtual = { ...novoModo };
    rodando = false;
    emTrabalho = true;
    roundAtual = 1;
    duracaoSeg = modoAtual.treino;
    restanteSeg = modoAtual.treino;
    inicioMs = Date.now();
    pintar(getModuloHiit());
  }

  function alternarFullEcran() {
    const mod = getModuloHiit();
    if (!mod) return;
    if (!document.fullscreenElement && typeof mod.requestFullscreen === "function") {
      mod.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Permite também alterar manualmente os números dos inputs sem perder o controlo
  document.addEventListener(
    "change",
    (ev) => {
      const inp = ev.target.closest("input");
      const mod = getModuloHiit();
      if (!inp || !mod || !mod.contains(inp)) return;
      const inps = Array.from(mod.querySelectorAll("input[type='number'], input"));
      const t = parseInt(inps[0] && inps[0].value, 10);
      const d = parseInt(inps[1] && inps[1].value, 10);
      const r = parseInt(inps[2] && inps[2].value, 10);
      if (t > 0) modoAtual.treino = t;
      if (d > 0) modoAtual.descanso = d;
      if (r > 0) modoAtual.rounds = r;
      if (!rodando) {
        restanteSeg = emTrabalho ? modoAtual.treino : modoAtual.descanso;
        duracaoSeg = restanteSeg;
        pintar(mod);
      }
    },
    true
  );

  document.addEventListener(
    "click",
    (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const mod = getModuloHiit();
      if (!mod || !mod.contains(btn)) return;

      const rotulo = (btn.textContent || "").trim().toLowerCase();
      if (rotulo.includes("tabata 20/10")) {
        aplicarModo({ nome: "Tabata 20/10", treino: 20, descanso: 10, rounds: 8 });
      } else if (rotulo.includes("crosshitbox 40/20")) {
        aplicarModo({ nome: "CrossHitBox 40/20", treino: 40, descanso: 20, rounds: 8 });
      } else if (rotulo.includes("boxe 3m/1m")) {
        aplicarModo({ nome: "Boxe 3m/1m", treino: 180, descanso: 60, rounds: 5 });
      } else if (rotulo === "iniciar") {
        iniciarContagem();
      } else if (rotulo === "pausar") {
        pausarContagem();
      } else if (rotulo === "zerar") {
        zerarContagem();
      } else if (rotulo.includes("full")) {
        alternarFullEcran();
      }
    },
    true
  );

  if (window.__chbHiitLoopPrincipal) clearInterval(window.__chbHiitLoopPrincipal);
  window.__chbHiitLoopPrincipal = setInterval(passoContagem, 100);

  setTimeout(() => pintar(getModuloHiit()), 250);
})();
