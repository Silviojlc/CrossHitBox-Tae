(function () {
  if (window.__chbSolucaoDefinitivaCronometroESessao) return;
  window.__chbSolucaoDefinitivaCronometroESessao = true;

  // =========================================================================
  // 1. PROTEÇÃO CONTRA LOGOFF AUTOMÁTICO INDEVIDO NO ARRANQUE
  // =========================================================================
  const CHAVES_SESSAO = [
    "chb_sessao_membro_autenticada_v1",
    "chb_sessao_admin_autenticada_v1",
    "crosshitbox_sessao_ativa_v1",
    "crosshitbox_usuario_logado_v1"
  ];
  const BACKUP_SESSAO_KEY = "__chb_sessao_backup_estavel_v1";

  function capturarSessoesAtuais() {
    const snap = {};
    CHAVES_SESSAO.forEach((k) => {
      try {
        const vLocal = localStorage.getItem(k);
        const vSess = sessionStorage.getItem(k);
        if (vLocal) snap[k] = vLocal;
        else if (vSess) snap[k] = vSess;
      } catch {}
    });
    if (Object.keys(snap).length > 0) {
      try {
        sessionStorage.setItem(BACKUP_SESSAO_KEY, JSON.stringify(snap));
        localStorage.setItem(BACKUP_SESSAO_KEY, JSON.stringify(snap));
      } catch {}
    }
    return snap;
  }

  function restaurarSessaoSeApagadaInesperadamente() {
    try {
      const raw = sessionStorage.getItem(BACKUP_SESSAO_KEY) || localStorage.getItem(BACKUP_SESSAO_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw);
      if (!snap || typeof snap !== "object") return;
      Object.keys(snap).forEach((k) => {
        const val = snap[k];
        if (!val) return;
        if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, val);
        if (!localStorage.getItem(k)) localStorage.setItem(k, val);
      });
    } catch {}
  }

  // Se o utilizador clicar explicitamente em "Logoff" / "Sair", limpa o backup para respeitar o logout intencional
  document.addEventListener(
    "click",
    (ev) => {
      const el = ev.target.closest("button, a");
      if (!el) return;
      const txt = (el.textContent || "").trim().toLowerCase();
      if (txt === "logoff" || txt === "sair" || txt === "logout") {
        try {
          sessionStorage.removeItem(BACKUP_SESSAO_KEY);
          localStorage.removeItem(BACKUP_SESSAO_KEY);
        } catch {}
      }
    },
    true
  );

  capturarSessoesAtuais();
  setInterval(() => {
    restaurarSessaoSeApagadaInesperadamente();
    capturarSessoesAtuais();
  }, 400);

  // =========================================================================
  // 2. CRONÓMETRO HIIT / TABATA / BOXE COM PRESETS TRAVADOS E CONTAGEM REAL
  // =========================================================================
  let hiitAtivo = false;
  let hiitInicioMs = 0;
  let hiitDuracaoSeg = 40;
  let hiitRestanteSeg = 40;
  let hiitRound = 1;
  let hiitTrabalho = true;
  let hiitLoopId = null;
  let presetBloqueioAteMs = 0;
  let presetForcado = null; // { treino, descanso, rounds, rotulo }

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

  function localizarCartaoHiit() {
    const els = Array.from(document.querySelectorAll("section, div"));
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      if (!el) continue;
      const txt = el.innerText || "";
      if (
        txt.includes("Cronómetro HIIT / Tabata") &&
        el.querySelectorAll("input").length >= 3 &&
        el.querySelectorAll("button").length >= 4
      ) {
        return el;
      }
    }
    return null;
  }

  function aplicarPresetNosInputs(cartao, preset) {
    if (!cartao || !preset) return;
    const inps = Array.from(cartao.querySelectorAll("input[type='number'], input"));
    if (inps[0]) {
      inps[0].value = String(preset.treino);
      inps[0].dispatchEvent(new Event("input", { bubbles: true }));
      inps[0].dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (inps[1]) {
      inps[1].value = String(preset.descanso);
      inps[1].dispatchEvent(new Event("input", { bubbles: true }));
      inps[1].dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (inps[2] && preset.rounds) {
      inps[2].value = String(preset.rounds);
      inps[2].dispatchEvent(new Event("input", { bubbles: true }));
      inps[2].dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function lerValoresCartaoHiit(cartao) {
    if (presetForcado && Date.now() < presetBloqueioAteMs) {
      aplicarPresetNosInputs(cartao, presetForcado);
      return {
        treino: presetForcado.treino,
        descanso: presetForcado.descanso,
        totalRounds: presetForcado.rounds || 8
      };
    }

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
      if (relEl) {
        if (relEl.firstChild && relEl.firstChild.nodeType === Node.TEXT_NODE) {
          relEl.firstChild.nodeValue = mmss;
        } else {
          relEl.textContent = mmss;
        }
      }

      cartao.querySelectorAll("div, span, p").forEach((el) => {
        if (el.children.length === 0 && /round\s+\d+/i.test(el.textContent || "")) {
          el.textContent = `Round ${hiitRound} de ${cfg.totalRounds}`;
        }
      });

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
      const cartao = localizarCartaoHiit();
      if (!cartao) return;
      if (presetForcado && Date.now() < presetBloqueioAteMs) {
        aplicarPresetNosInputs(cartao, presetForcado);
      }

      if (!hiitAtivo) {
        pintarCartaoHiit();
        return;
      }

      const cfg = lerValoresCartaoHiit(cartao);
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
    const cartao = localizarCartaoHiit();
    const cfg = lerValoresCartaoHiit(cartao);
    beep(880, 120);
    const base = hiitRestanteSeg > 0 ? hiitRestanteSeg : cfg.treino;
    hiitDuracaoSeg = base;
    hiitRestanteSeg = base;
    hiitInicioMs = Date.now();
    hiitAtivo = true;
    passoCartaoHiit();
    if (hiitLoopId) clearInterval(hiitLoopId);
    hiitLoopId = setInterval(passoCartaoHiit, 100);
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
    const cartao = localizarCartaoHiit();
    const cfg = lerValoresCartaoHiit(cartao);
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

  function selecionarPreset(preset, cartao) {
    presetForcado = preset;
    presetBloqueioAteMs = Date.now() + 1500;
    hiitAtivo = false;
    if (hiitLoopId) {
      clearInterval(hiitLoopId);
      hiitLoopId = null;
    }
    hiitTrabalho = true;
    hiitRound = 1;
    hiitDuracaoSeg = preset.treino;
    hiitRestanteSeg = preset.treino;
    aplicarPresetNosInputs(cartao, preset);
    pintarCartaoHiit();

    // Reforça os inputs nos instantes seguintes caso algum script nativo tente repor CrossHitBox Tae
    [120, 350, 700, 1100].forEach((ms) => {
      setTimeout(() => {
        const c = localizarCartaoHiit();
        if (c && presetForcado) {
          aplicarPresetNosInputs(c, presetForcado);
          if (!hiitAtivo) {
            hiitRestanteSeg = presetForcado.treino;
            pintarCartaoHiit();
          }
        }
      }, ms);
    });
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
      } else if (label.includes("tabata 20/10")) {
        selecionarPreset({ treino: 20, descanso: 10, rounds: 8, rotulo: "Tabata 20/10" }, cartao);
      } else if (label.includes("crosshitbox 40/20")) {
        selecionarPreset({ treino: 40, descanso: 20, rounds: 8, rotulo: "CrossHitBox 40/20" }, cartao);
      } else if (label.includes("boxe 3m/1m")) {
        selecionarPreset({ treino: 180, descanso: 60, rounds: 5, rotulo: "Boxe 3m/1m" }, cartao);
      }
    },
    true
  );

  function inicializarCronometro() {
    const cartao = localizarCartaoHiit();
    if (cartao && !hiitAtivo) {
      const cfg = lerValoresCartaoHiit(cartao);
      hiitDuracaoSeg = cfg.treino;
      hiitRestanteSeg = cfg.treino;
      pintarCartaoHiit();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(inicializarCronometro, 250));
  } else {
    setTimeout(inicializarCronometro, 250);
  }
})();
