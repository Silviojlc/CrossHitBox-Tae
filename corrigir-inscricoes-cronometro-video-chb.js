(function () {
  if (window.__chbCorrecaoFinalTresPontos) return;
  window.__chbCorrecaoFinalTresPontos = true;

  const KEY_EXCLUIDOS = "crosshitbox_membros_excluidos_v1";
  const CHAVES_MEMBROS = [
    "crosshitbox_membros_v1",
    "crosshitbox_inscricoes_v1",
    "crosshitbox_perfis_completos_v1"
  ];

  function ehAdmin() {
    return (window.location.pathname || "").toLowerCase().includes("admin");
  }

  function lerExcluidos() {
    try {
      const raw = localStorage.getItem(KEY_EXCLUIDOS);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set((Array.isArray(arr) ? arr : []).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean));
    } catch {
      return new Set();
    }
  }

  // 1. SINCRONIZAR NOVOS INSCRITOS PARA O ADMIN E ISOLAR SESSÃO DO ATLETA
  function sincronizarInscricoesParaAdmin() {
    const excl = lerExcluidos();
    const mapa = new Map();

    CHAVES_MEMBROS.forEach((chave) => {
      try {
        const arr = JSON.parse(localStorage.getItem(chave) || "[]");
        if (!Array.isArray(arr)) return;
        arr.forEach((m) => {
          if (!m || typeof m !== "object") return;
          const idNorm = String(m.email || m.id || m.telefone || m.nome || "").trim().toLowerCase();
          if (!idNorm || excl.has(idNorm)) return;
          const atual = mapa.get(idNorm) || {};
          mapa.set(idNorm, {
            status: "pendente",
            aprovado: false,
            ...atual,
            ...m
          });
        });
      } catch {}
    });

    const unificada = Array.from(mapa.values());
    CHAVES_MEMBROS.forEach((chave) => {
      try {
        localStorage.setItem(chave, JSON.stringify(unificada));
      } catch {}
    });

    if (ehAdmin() && !document.getElementById("chbPainelAprovacaoRapida")) {
      const pendentes = unificada.filter(
        (u) => !u.aprovado && String(u.status || "").toLowerCase() !== "ativo" && String(u.status || "").toLowerCase() !== "aprovado"
      );
      const box = document.createElement("section");
      box.id = "chbPainelAprovacaoRapida";
      box.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
      box.innerHTML = `
        <div class="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 space-y-3 text-xs">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[10px] font-extrabold uppercase text-amber-400">Aprovação &amp; Liberação de Novos Inscritos</div>
              <div class="font-black text-white text-sm">Membros Aguardando Aprovação (${pendentes.length})</div>
            </div>
          </div>
          <div id="chbListaPendentesAprovar" class="space-y-2">
            ${
              pendentes.length
                ? pendentes
                    .map((p, idx) => {
                      const chaveRef = String(p.email || p.nome || idx).replace(/'/g, "");
                      return `
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div>
                      <div class="font-bold text-white">${p.nome || "Novo Atleta"} <span class="text-amber-400">• ${p.turno || "Quartas-feiras"}</span></div>
                      <div class="text-[11px] text-slate-400">${p.email || "-"} • ${p.telefone || ""}</div>
                    </div>
                    <button type="button" onclick="chbAprovarELiberarMembro('${chaveRef}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">
                      Aprovar e Liberar Acesso
                    </button>
                  </div>
                `;
                    })
                    .join("")
                : `<div class="text-slate-400">Todos os inscritos ativos já estão aprovados ou sincronizados.</div>`
            }
          </div>
        </div>
      `;
      const mainEl = document.querySelector("main") || document.body;
      mainEl.insertBefore(box, mainEl.firstChild);
    }
  }

  function isolarDadosAtletaAtual() {
    if (ehAdmin()) return;
    const sessAtual = String(sessionStorage.getItem("chb_sessao_membro_autenticada_v1") || "").trim().toLowerCase();
    if (!sessAtual || sessAtual.includes("rajadabranco")) return;

    // Garante que o perfil exibido corresponde ao atleta autenticado e não aos registos de outro atleta
    try {
      const perfis = JSON.parse(localStorage.getItem("crosshitbox_perfis_completos_v1") || "[]");
      if (Array.isArray(perfis)) {
        const meuPerfil = perfis.find(
          (p) =>
            p &&
            (String(p.email || "").trim().toLowerCase() === sessAtual ||
              String(p.nome || "").trim().toLowerCase() === sessAtual)
        );
        if (meuPerfil) {
          document.querySelectorAll("h1, h2, h3, span, div, p").forEach((el) => {
            if (el.children.length === 0 && (el.textContent || "").toLowerCase().includes("rajadabranco")) {
              el.textContent = (el.textContent || "").replace(/rajadabranco/gi, meuPerfil.nome || sessAtual);
            }
          });
        }
      }
    } catch {}
  }

  window.chbAprovarELiberarMembro = function (ref) {
    const alvo = String(ref || "").trim().toLowerCase();
    CHAVES_MEMBROS.forEach((chave) => {
      try {
        const arr = JSON.parse(localStorage.getItem(chave) || "[]");
        if (!Array.isArray(arr)) return;
        arr.forEach((m) => {
          if (!m) return;
          const em = String(m.email || "").trim().toLowerCase();
          const nm = String(m.nome || "").trim().toLowerCase();
          if (!alvo || em === alvo || nm === alvo) {
            m.aprovado = true;
            m.ativo = true;
            m.status = "ativo";
          }
        });
        localStorage.setItem(chave, JSON.stringify(arr));
      } catch {}
    });
    const painel = document.getElementById("chbPainelAprovacaoRapida");
    if (painel) painel.remove();
    sincronizarInscricoesParaAdmin();
    if (typeof window.chbAtualizarDashboardPro === "function") {
      window.chbAtualizarDashboardPro();
    }
  };

  // 2. CRONÓMETRO HIIT / TABATA FUNCIONAL EM AMBOS OS PERFIS (ADMIN + ATLETA)
  let hiitTimerId = null;
  let hiitSegundosRestantes = 40;
  let hiitFaseTrabalho = true;
  let hiitRoundAtual = 1;
  let hiitEmExecucao = false;

  function obterCartaoHiitExato() {
    const candidatos = Array.from(document.querySelectorAll("section, div"));
    return (
      candidatos.find((el) => {
        const t = el.innerText || "";
        return t.includes("Cronómetro HIIT / Tabata") && t.includes("Round") && el.querySelector("button");
      }) || null
    );
  }

  function lerConfigHiit(cartao) {
    let treino = 40;
    let descanso = 20;
    let totalRounds = 8;
    if (!cartao) return { treino, descanso, totalRounds };

    const inputs = Array.from(cartao.querySelectorAll("input[type='number'], input"));
    inputs.forEach((inp) => {
      const rotulo = ((inp.parentElement && inp.parentElement.innerText) || "").toLowerCase();
      const val = parseInt(inp.value, 10);
      if (!Number.isFinite(val) || val <= 0) return;
      if (rotulo.includes("treino")) treino = val;
      else if (rotulo.includes("descanso")) descanso = val;
      else if (rotulo.includes("round")) totalRounds = val;
    });

    if (inputs.length >= 3) {
      const v0 = parseInt(inputs[0].value, 10);
      const v1 = parseInt(inputs[1].value, 10);
      const v2 = parseInt(inputs[2].value, 10);
      if (Number.isFinite(v0) && v0 > 0) treino = v0;
      if (Number.isFinite(v1) && v1 > 0) descanso = v1;
      if (Number.isFinite(v2) && v2 > 0) totalRounds = v2;
    }

    return { treino, descanso, totalRounds };
  }

  function atualizarVisorHiitIsolado() {
    const cartao = obterCartaoHiitExato();
    if (!cartao) return;

    const cfg = lerConfigHiit(cartao);
    const mm = String(Math.floor(hiitSegundosRestantes / 60)).padStart(2, "0");
    const ss = String(hiitSegundosRestantes % 60).padStart(2, "0");
    const relogioStr = `${mm}:${ss}`;

    let visorTempo = null;
    let maiorTamanho = 0;
    cartao.querySelectorAll("div, span, p, strong").forEach((el) => {
      if (el.children.length === 0) {
        const txt = (el.textContent || "").trim();
        if (/^\d{1,2}:\d{2}$/.test(txt)) {
          const fs = parseFloat(window.getComputedStyle(el).fontSize) || 0;
          if (fs >= maiorTamanho) {
            maiorTamanho = fs;
            visorTempo = el;
          }
        }
      }
    });
    if (visorTempo) {
      visorTempo.textContent = relogioStr;
    }

    cartao.querySelectorAll("div, span, p").forEach((el) => {
      if (el.children.length === 0 && /round\s+\d+/i.test(el.textContent || "")) {
        el.textContent = `Round ${hiitRoundAtual} de ${cfg.totalRounds}`;
      }
    });

    cartao.querySelectorAll("div, span").forEach((el) => {
      if (el.children.length === 0) {
        const t = (el.textContent || "").trim().toUpperCase();
        if (t === "TRABALHO" || t === "DESCANSO" || t === "PRONTO") {
          el.textContent = hiitFaseTrabalho ? "TRABALHO" : "DESCANSO";
        }
      }
    });
  }

  function passoSegundoHiit() {
    if (!hiitEmExecucao) return;
    const cfg = lerConfigHiit(obterCartaoHiitExato());

    if (hiitSegundosRestantes > 1) {
      hiitSegundosRestantes -= 1;
    } else if (hiitFaseTrabalho) {
      hiitFaseTrabalho = false;
      hiitSegundosRestantes = cfg.descanso;
    } else if (hiitRoundAtual < cfg.totalRounds) {
      hiitRoundAtual += 1;
      hiitFaseTrabalho = true;
      hiitSegundosRestantes = cfg.treino;
    } else {
      hiitEmExecucao = false;
      if (hiitTimerId) {
        clearInterval(hiitTimerId);
        hiitTimerId = null;
      }
      hiitSegundosRestantes = 0;
    }

    atualizarVisorHiitIsolado();
  }

  function iniciarCronometroHiit() {
    const cfg = lerConfigHiit(obterCartaoHiitExato());
    if (hiitSegundosRestantes <= 0) {
      hiitSegundosRestantes = cfg.treino;
      hiitFaseTrabalho = true;
    }
    hiitEmExecucao = true;
    if (hiitTimerId) clearInterval(hiitTimerId);
    atualizarVisorHiitIsolado();
    hiitTimerId = setInterval(passoSegundoHiit, 1000);
  }

  function pausarCronometroHiit() {
    hiitEmExecucao = false;
    if (hiitTimerId) {
      clearInterval(hiitTimerId);
      hiitTimerId = null;
    }
    atualizarVisorHiitIsolado();
  }

  function zerarCronometroHiit() {
    hiitEmExecucao = false;
    if (hiitTimerId) {
      clearInterval(hiitTimerId);
      hiitTimerId = null;
    }
    const cfg = lerConfigHiit(obterCartaoHiitExato());
    hiitFaseTrabalho = true;
    hiitRoundAtual = 1;
    hiitSegundosRestantes = cfg.treino;
    atualizarVisorHiitIsolado();
  }

  function fullEcranCronometroHiit() {
    const cartao = obterCartaoHiitExato();
    if (!cartao) return;
    if (!document.fullscreenElement && typeof cartao.requestFullscreen === "function") {
      cartao.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  }

  document.addEventListener(
    "click",
    (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const cartao = obterCartaoHiitExato();
      if (!cartao || !cartao.contains(btn)) return;

      const rotulo = (btn.textContent || "").trim().toLowerCase();
      if (rotulo === "iniciar") {
        iniciarCronometroHiit();
      } else if (rotulo === "pausar") {
        pausarCronometroHiit();
      } else if (rotulo === "zerar") {
        zerarCronometroHiit();
      } else if (rotulo.includes("full")) {
        fullEcranCronometroHiit();
      }
    },
    true
  );

  function executarCorrecoes() {
    sincronizarInscricoesParaAdmin();
    isolarDadosAtletaAtual();
    const cartao = obterCartaoHiitExato();
    if (cartao && !hiitEmExecucao) {
      const cfg = lerConfigHiit(cartao);
      hiitSegundosRestantes = cfg.treino;
      atualizarVisorHiitIsolado();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(executarCorrecoes, 450));
  } else {
    setTimeout(executarCorrecoes, 450);
  }
})();
