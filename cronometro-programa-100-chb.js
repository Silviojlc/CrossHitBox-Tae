(function () {
  window.__chbHiitModuloFixAtivo = true;

  let rodando = false;
  let inicioMs = 0;
  let duracaoSeg = 40;
  let restanteSeg = 40;
  let roundAtual = 1;
  let trabalho = true;
  let presetTravaAte = 0;
  let presetAtivo = null;

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

  function aplicarInputs(mod, cfg) {
    if (!mod || !cfg) return;
    const inps = Array.from(mod.querySelectorAll("input[type='number'], input"));
    if (inps[0] && String(inps[0].value) !== String(cfg.treino)) {
      inps[0].value = String(cfg.treino);
      inps[0].dispatchEvent(new Event("input", { bubbles: true }));
      inps[0].dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (inps[1] && String(inps[1].value) !== String(cfg.descanso)) {
      inps[1].value = String(cfg.descanso);
      inps[1].dispatchEvent(new Event("input", { bubbles: true }));
      inps[1].dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (inps[2] && cfg.rounds && String(inps[2].value) !== String(cfg.rounds)) {
      inps[2].value = String(cfg.rounds);
      inps[2].dispatchEvent(new Event("input", { bubbles: true }));
      inps[2].dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function lerConfig(mod) {
    if (presetAtivo && Date.now() < presetTravaAte) {
      aplicarInputs(mod, presetAtivo);
      return {
        treino: presetAtivo.treino,
        descanso: presetAtivo.descanso,
        rounds: presetAtivo.rounds || 8
      };
    }
    let treino = 40;
    let descanso = 20;
    let rounds = 8;
    if (mod) {
      const inps = Array.from(mod.querySelectorAll("input[type='number'], input"));
      if (inps[0] && parseInt(inps[0].value, 10) > 0) treino = parseInt(inps[0].value, 10);
      if (inps[1] && parseInt(inps[1].value, 10) > 0) descanso = parseInt(inps[1].value, 10);
      if (inps[2] && parseInt(inps[2].value, 10) > 0) rounds = parseInt(inps[2].value, 10);
    }
    return { treino, descanso, rounds };
  }

  function garantirVisor(mod) {
    if (!mod) return null;
    let visor = document.getElementById("chbHiitDisplayReal");
    if (!visor) {
      visor = document.createElement("div");
      visor.id = "chbHiitDisplayReal";
      visor.style.cssText =
        "font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: 2px; margin-top: 4px;";
      const badgeRound = Array.from(mod.querySelectorAll("div, span, p")).find((el) =>
        /round\s+\d+/i.test((el.textContent || "").trim())
      );
      if (badgeRound && badgeRound.parentElement) {
        badgeRound.parentElement.appendChild(visor);
      } else {
        mod.insertBefore(visor, mod.firstChild);
      }
    }
    return visor;
  }

  function pintar(mod) {
    try {
      if (!mod) mod = getModuloHiit();
      if (!mod) return;
      const cfg = lerConfig(mod);
      const visor = garantirVisor(mod);
      if (visor) visor.textContent = fmt(restanteSeg);

      // Também tenta atualizar qualquer texto MM:SS visível no módulo caso exista
      mod.querySelectorAll("div, span, p, strong").forEach((el) => {
        if (el.id !== "chbHiitDisplayReal" && el.children.length === 0 && /^\d{1,2}:\d{2}$/.test((el.textContent || "").trim())) {
          el.textContent = fmt(restanteSeg);
        }
      });

      mod.querySelectorAll("div, span, p").forEach((el) => {
        if (el.children.length === 0 && /round\s+\d+/i.test((el.textContent || "").trim())) {
          el.textContent = `Round ${roundAtual} de ${cfg.rounds}`;
        }
      });

      mod.querySelectorAll("div, span").forEach((el) => {
        if (el.children.length === 0) {
          const t = (el.textContent || "").trim().toUpperCase();
          const alvo = trabalho ? "TRABALHO" : "DESCANSO";
          if ((t === "TRABALHO" || t === "DESCANSO" || t === "PRONTO") && t !== alvo) {
            el.textContent = alvo;
          }
        }
      });
    } catch {}
  }

  function tick() {
    try {
      const mod = getModuloHiit();
      if (!mod) return;
      if (presetAtivo && Date.now() < presetTravaAte) {
        aplicarInputs(mod, presetAtivo);
      }
      if (!rodando) {
        pintar(mod);
        return;
      }
      const cfg = lerConfig(mod);
      const passado = Math.floor((Date.now() - inicioMs) / 1000);
      const rest = duracaoSeg - passado;

      if (rest > 0) {
        restanteSeg = rest;
        pintar(mod);
        return;
      }

      beep(trabalho ? 660 : 990, 130);
      if (trabalho) {
        trabalho = false;
        duracaoSeg = cfg.descanso;
        restanteSeg = duracaoSeg;
        inicioMs = Date.now();
      } else if (roundAtual < cfg.rounds) {
        roundAtual += 1;
        trabalho = true;
        duracaoSeg = cfg.treino;
        restanteSeg = duracaoSeg;
        inicioMs = Date.now();
      } else {
        rodando = false;
        restanteSeg = 0;
      }
      pintar(mod);
    } catch {}
  }

  function iniciar() {
    const mod = getModuloHiit();
    const cfg = lerConfig(mod);
    beep(880, 110);
    const base = restanteSeg > 0 ? restanteSeg : cfg.treino;
    duracaoSeg = base;
    restanteSeg = base;
    inicioMs = Date.now();
    rodando = true;
    tick();
  }

  function pausar() {
    if (rodando) {
      tick();
      rodando = false;
    }
    pintar(getModuloHiit());
  }

  function zerar() {
    const mod = getModuloHiit();
    const cfg = lerConfig(mod);
    rodando = false;
    trabalho = true;
    roundAtual = 1;
    duracaoSeg = cfg.treino;
    restanteSeg = duracaoSeg;
    inicioMs = Date.now();
    pintar(mod);
  }

  function fullEcra() {
    const mod = getModuloHiit();
    if (!mod) return;
    if (!document.fullscreenElement && typeof mod.requestFullscreen === "function") {
      mod.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  }

  function setPreset(cfg) {
    const mod = getModuloHiit();
    presetAtivo = cfg;
    presetTravaAte = Date.now() + 1800;
    rodando = false;
    trabalho = true;
    roundAtual = 1;
    duracaoSeg = cfg.treino;
    restanteSeg = cfg.treino;
    aplicarInputs(mod, cfg);
    pintar(mod);
  }

  document.addEventListener(
    "click",
    (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const mod = getModuloHiit();
      if (!mod || !mod.contains(btn)) return;

      const rotulo = (btn.textContent || "").trim().toLowerCase();
      if (rotulo === "iniciar") iniciar();
      else if (rotulo === "pausar") pausar();
      else if (rotulo === "zerar") zerar();
      else if (rotulo.includes("full")) fullEcra();
      else if (rotulo.includes("tabata 20/10")) setPreset({ treino: 20, descanso: 10, rounds: 8 });
      else if (rotulo.includes("crosshitbox 40/20")) setPreset({ treino: 40, descanso: 20, rounds: 8 });
      else if (rotulo.includes("boxe 3m/1m")) setPreset({ treino: 180, descanso: 60, rounds: 5 });
    },
    true
  );

  if (window.__chbHiitModuloTimer) clearInterval(window.__chbHiitModuloTimer);
  window.__chbHiitModuloTimer = setInterval(tick, 150);

  setTimeout(() => {
    const mod = getModuloHiit();
    if (mod && !rodando) {
      const cfg = lerConfig(mod);
      duracaoSeg = cfg.treino;
      restanteSeg = cfg.treino;
      pintar(mod);
    }
  }, 300);
})();
