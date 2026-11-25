(function () {
  window.__chbCronometroVersaoAtual = "v2026.11.25-estavel";

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
  }

  function restaurarSessaoSeApagada() {
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
  if (!window.__chbIntervalSessao) {
    window.__chbIntervalSessao = setInterval(() => {
      restaurarSessaoSeApagada();
      capturarSessoesAtuais();
    }, 500);
  }

  // =========================================================================
  // 2. CRONÓMETRO HIIT / TABATA / BOXE (CONTAGEM REGRESSIVA REAL POR SEGUNDO)
  // =========================================================================
  let hiitAtivo = false;
  let hiitInicioMs = 0;
  let hiitDuracaoSeg = 40;
  let hiitRestanteSeg = 40;
  let hiitRound = 1;
  let hiitTrabalho = true;
  let presetBloqueioAteMs = 0;
  let presetForcado = null;

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
    if (inps[0] && String(inps[0].value) !== String(preset.treino)) {
      inps[0].value = String(preset.treino);
      inps[0].dispatchEvent(new Event("input", { bubbles: true }));
      inps[0].dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (inps[1] && String(inps[1].value) !== String(preset.descanso)) {
      inps[1].value = String(preset.descanso);
      inps[1].dispatchEvent(new Event("input", { bubbles: true }));
      inps[1].dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (inps[2] && preset.rounds && String(inps[2].value) !== String(preset.rounds)) {
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
      if (relEl && (relEl.textContent || "").trim() !== mmss) {
        relEl.textContent = mmss;
      }

      cartao.querySelectorAll("div, span, p").forEach((el) => {
        if (el.children.length === 0 && /round\s+\d+/i.test(el.textContent || "")) {
          const novoRound = `Round ${hiitRound} de ${cfg.totalRounds}`;
          if ((el.textContent || "").trim() !== novoRound) {
            el.textContent = novoRound;
          }
        }
      });

      cartao.querySelectorAll("div, span").forEach((el) => {
        if (el.children.length === 0) {
          const t = (el.textContent || "").trim().toUpperCase();
          const faseAlvo = hiitTrabalho ? "TRABALHO" : "DESCANSO";
          if ((t === "TRABALHO" || t === "DESCANSO" || t === "PRONTO") && t !== faseAlvo) {
            el.textContent = faseAlvo;
          }
        }
      });
    } catch {}
  }

  function atualizarTickHiit() {
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

      beep(hiitTrabalho ? 660 : 990, 140);
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
      }
      pintarCartaoHiit();
    } catch {}
  }

  function iniciarHiit() {
    const cartao = localizarCartaoHiit();
    const cfg = lerValoresCartaoHiit(cartao);
    beep(880, 110);
    const base = hiitRestanteSeg > 0 ? hiitRestanteSeg : cfg.treino;
    hiitDuracaoSeg = base;
    hiitRestanteSeg = base;
    hiitInicioMs = Date.now();
    hiitAtivo = true;
    atualizarTickHiit();
  }

  function pausarHiit() {
    if (hiitAtivo) {
      atualizarTickHiit();
      hiitAtivo = false;
    }
    pintarCartaoHiit();
  }

  function zerarHiit() {
    const cartao = localizarCartaoHiit();
    const cfg = lerValoresCartaoHiit(cartao);
    hiitAtivo = false;
    hiitTrabalho = true;
    hiitRound = 1;
    hiitDuracaoSeg = cfg.treino;
    hiitRestanteSeg = hiitDuracaoSeg;
    hiitInicioMs = Date.now();
    pintarCartaoHiit();
  }

  function fullEcranHiit() {
    const cartao = localizarCartaoHiit();
    if (!cartao) return;
    if (!document.fullscreenElement && typeof cartao.requestFullscreen === "function") {
      cartao.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  }

  function escolherPreset(preset, cartao) {
    presetForcado = preset;
    presetBloqueioAteMs = Date.now() + 1600;
    hiitAtivo = false;
    hiitTrabalho = true;
    hiitRound = 1;
    hiitDuracaoSeg = preset.treino;
    hiitRestanteSeg = preset.treino;
    aplicarPresetNosInputs(cartao, preset);
    pintarCartaoHiit();
  }

  // =========================================================================
  // 3. CRONÓMETRO DE SESSÃO (00:00 -> 00:01...) INDEPENDENTE DO HIIT/TABATA
  // =========================================================================
  let sessaoAtiva = false;
  let sessaoSegAcumulados = 0;
  let sessaoInicioMs = 0;

  function localizarBlocoSessao() {
    return (
      Array.from(document.querySelectorAll("section, div")).find((el) => {
        const txt = el.innerText || "";
        return txt.includes("CRONÓMETRO DE SESSÃO") && el.querySelectorAll("button").length >= 1;
      }) || null
    );
  }

  function atualizarTickSessao() {
    try {
      const bloco = localizarBlocoSessao();
      if (!bloco) return;
      const totalSeg = sessaoAtiva
        ? sessaoSegAcumulados + Math.floor((Date.now() - sessaoInicioMs) / 1000)
        : sessaoSegAcumulados;
      const mmss = fmt(totalSeg);

      bloco.querySelectorAll("div, span, p, strong").forEach((el) => {
        if (el.children.length === 0 && /^\d{1,2}:\d{2}$/.test((el.textContent || "").trim())) {
          if ((el.textContent || "").trim() !== mmss) {
            el.textContent = mmss;
          }
        }
      });
    } catch {}
  }

  document.addEventListener(
    "click",
    (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const label = (btn.textContent || "").trim().toLowerCase();

      const cartaoHiit = localizarCartaoHiit();
      if (cartaoHiit && cartaoHiit.contains(btn)) {
        if (label === "iniciar") iniciarHiit();
        else if (label === "pausar") pausarHiit();
        else if (label === "zerar") zerarHiit();
        else if (label.includes("full")) fullEcranHiit();
        else if (label.includes("tabata 20/10")) escolherPreset({ treino: 20, descanso: 10, rounds: 8 }, cartaoHiit);
        else if (label.includes("crosshitbox 40/20")) escolherPreset({ treino: 40, descanso: 20, rounds: 8 }, cartaoHiit);
        else if (label.includes("boxe 3m/1m")) escolherPreset({ treino: 180, descanso: 60, rounds: 5 }, cartaoHiit);
        return;
      }

      const blocoSessao = localizarBlocoSessao();
      if (blocoSessao && blocoSessao.contains(btn)) {
        if (label === "iniciar") {
          if (!sessaoAtiva) {
            sessaoInicioMs = Date.now();
            sessaoAtiva = true;
          } else {
            sessaoSegAcumulados += Math.floor((Date.now() - sessaoInicioMs) / 1000);
            sessaoAtiva = false;
          }
          atualizarTickSessao();
        } else if (label === "zerar") {
          sessaoAtiva = false;
          sessaoSegAcumulados = 0;
          atualizarTickSessao();
        }
      }
    },
    true
  );

  if (window.__chbLoopGlobalCronometros) {
    clearInterval(window.__chbLoopGlobalCronometros);
  }
  window.__chbLoopGlobalCronometros = setInterval(() => {
    atualizarTickHiit();
    atualizarTickSessao();
  }, 150);

  setTimeout(() => {
    const cartao = localizarCartaoHiit();
    if (cartao && !hiitAtivo) {
      const cfg = lerValoresCartaoHiit(cartao);
      hiitDuracaoSeg = cfg.treino;
      hiitRestanteSeg = cfg.treino;
    }
    atualizarTickHiit();
    atualizarTickSessao();
  }, 300);
})();
