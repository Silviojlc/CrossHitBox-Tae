(function () {
  if (document.getElementById("ajustesPraticosCHB")) return;

  const KEY_PAGAMENTOS = "crosshitbox_pagamentos_v1";
  const KEY_PERFIS = "crosshitbox_perfis_completos_v1";
  const KEY_EXCLUIDOS = "crosshitbox_membros_excluidos_v1";
  let sessaoAtiva = false;

  function detectarAdmin() {
    const p = (window.location.pathname || "").toLowerCase();
    const txt = document.body ? (document.body.innerText || "") : "";
    return p.includes("admin") || txt.includes("Painel Administrativo") || txt.includes("Configurar Sala de Videochamada");
  }

  function lerArray(key) {
    try {
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function gravarArray(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.isArray(arr) ? arr : []));
    } catch {}
  }

  function limparTelefoneCV(raw) {
    const d = (raw || "").toString().replace(/\D+/g, "");
    if (!d) return "";
    return d.length === 7 ? "238" + d : d;
  }

  function higienizarDadosLocais() {
    const excl = new Set(lerArray(KEY_EXCLUIDOS).map((x) => String(x).trim().toLowerCase()));

    const perfisLimpos = lerArray(KEY_PERFIS).filter((p) => {
      const em = String((p && p.email) || "").trim().toLowerCase();
      return em && !excl.has(em);
    });
    gravarArray(KEY_PERFIS, perfisLimpos);

    const pgsLimpos = lerArray(KEY_PAGAMENTOS).filter((pg) => {
      if (!pg || typeof pg !== "object") return false;
      const em = String(pg.email || "").trim().toLowerCase();
      if (em && excl.has(em)) return false;
      const mesInvalido = !pg.mes_referencia || String(pg.mes_referencia) === "undefined";
      const semProva = !pg.comprovativo_base64 && !pg.recibo_numero && pg.aprovado_admin !== true;
      if (mesInvalido && semProva) return false;
      return true;
    });
    gravarArray(KEY_PAGAMENTOS, pgsLimpos);

    return { perfisLimpos, pgsLimpos };
  }

  function obterLinkSalaAtual() {
    const inputs = Array.from(document.querySelectorAll("input"));
    for (const inp of inputs) {
      const v = (inp.value || "").trim();
      if (v.startsWith("http") && (v.includes("jit.si") || v.includes("meet") || v.includes("zoom") || v.includes("CrossHitBox"))) {
        return v;
      }
      if (v.toLowerCase().includes("crosshitbox-tae-")) {
        return "https://meet.jit.si/" + v.replace(/^https?:\/\/(meet\.jit\.si\/)?/i, "");
      }
    }
    return "https://meet.jit.si/CrossHitBox-Tae-0500";
  }

  window.chbCopiarLinkSala = async function () {
    const link = obterLinkSalaAtual();
    const msgEl = document.getElementById("chbStatusSalaRapida");
    try {
      await navigator.clipboard.writeText(link);
      if (msgEl) msgEl.textContent = "Link copiado: " + link;
    } catch {
      if (msgEl) msgEl.textContent = "Link da sala: " + link;
    }
  };

  window.chbAbrirSalaNovaJanela = function () {
    const link = obterLinkSalaAtual();
    window.open(link, "_blank", "noopener,noreferrer");
  };

  window.chbEnviarAlertaVencimentoWA = function (nome, telefone, validade, diasRestantes) {
    const tel = limparTelefoneCV(telefone);
    const statusTxt =
      diasRestantes < 0
        ? `expirada em ${validade}`
        : `a vencer em ${diasRestantes} dia(s) (${validade})`;
    const texto = `Olá ${nome || "Atleta"}! Lembrete CrossHitBox Tae: a tua mensalidade encontra-se ${statusTxt}. Envia o comprovativo de renovação para manter o teu acesso ativo sem interrupções.`;
    const url = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener");
  };

  window.renderAjustesPraticosUI = function () {
    const alvo = document.getElementById("conteudoAjustesPraticos");
    if (!alvo) return;
    const { perfisLimpos, pgsLimpos } = higienizarDadosLocais();
    const hojeMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();

    const alertasVencimento = [];
    for (const p of perfisLimpos) {
      const em = (p.email || "").toLowerCase();
      const pg = pgsLimpos.find((x) => (x.email || "").toLowerCase() === em && x.validade_ate);
      const validade = (pg && pg.validade_ate) || p.validade_ate || "";
      if (!validade) continue;
      const valMs = new Date(validade + "T00:00:00Z").getTime();
      if (!Number.isFinite(valMs)) continue;
      const diasRestantes = Math.ceil((valMs - hojeMs) / 86400000);
      if (diasRestantes <= 5) {
        alertasVencimento.push({
          nome: p.nome || em,
          email: em,
          telefone: p.telefone || "",
          validade,
          diasRestantes
        });
      }
    }

    const linkSala = obterLinkSalaAtual();

    alvo.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="font-extrabold text-amber-400 uppercase tracking-wide">Acesso Rápido à Sala de Aula (Telemóvel / Tablet / PC / TV)</div>
          <div class="text-slate-300 break-all">Sala ativa: <strong class="text-white">${linkSala}</strong></div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="chbAbrirSalaNovaJanela()" class="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">Abrir Aula em Nova Janela</button>
            <button type="button" onclick="chbCopiarLinkSala()" class="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold">Copiar Link da Sala</button>
          </div>
          <div id="chbStatusSalaRapida" class="text-emerald-300 font-semibold"></div>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-rose-400 uppercase tracking-wide">Alerta de Vencimento (≤ 5 Dias ou Expirado)</span>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">${alertasVencimento.length}</span>
          </div>
          ${
            alertasVencimento.length
              ? `<div class="space-y-2">
                  ${alertasVencimento.map((a) => `
                    <div class="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                      <div>
                        <div class="font-bold text-white">${a.nome}</div>
                        <div class="${a.diasRestantes < 0 ? "text-rose-400" : "text-amber-300"} font-semibold">
                          ${a.diasRestantes < 0 ? `Expirado em ${a.validade}` : `Expira em ${a.diasRestantes} dia(s) (${a.validade})`}
                        </div>
                      </div>
                      <button type="button" onclick="chbEnviarAlertaVencimentoWA('${(a.nome || "").replace(/'/g, "")}','${a.telefone}','${a.validade}',${a.diasRestantes})" class="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shrink-0">Avisar WhatsApp</button>
                    </div>
                  `).join("")}
                </div>`
              : `<div class="text-slate-400">Nenhuma mensalidade a vencer nos próximos 5 dias ou expirada de momento.</div>`
          }
        </div>
      </div>
    `;
  };

  const container = document.createElement("section");
  container.id = "ajustesPraticosCHB";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-emerald-400">Central Operacional Rápida — Aula em Qualquer Ecrã &amp; Alertas de Renovação</h2>
        <p class="text-xs text-slate-400">Acesso direto à sala sem bloqueio de pop-up, higienização automática de registos e alertas de vencimento.</p>
      </div>
      <button type="button" onclick="renderAjustesPraticosUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
    </div>
    <div id="conteudoAjustesPraticos"></div>
  `;

  const refEl = document.getElementById("workspaceUnificadoCHB") || document.body.firstChild;
  if (refEl && refEl.nextSibling) {
    refEl.parentNode.insertBefore(container, refEl.nextSibling);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("ajustesPraticosCHB");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      higienizarDadosLocais();
      window.renderAjustesPraticosUI();
    } else {
      el.classList.add("hidden");
      el.style.display = "none";
    }
  }

  function avaliarSessao() {
    const bodyText = document.body ? (document.body.innerText || "") : "";
    const temBotaoSair = Array.from(document.querySelectorAll("button, a")).some((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      return (t === "sair" || t === "terminar sessão" || t === "logout") && btn.offsetParent !== null;
    });
    const temAreaAutenticada =
      bodyText.includes("Sessão ativa como:") ||
      bodyText.includes("Atleta Autenticado") ||
      bodyText.includes("Configurar Sala de Videochamada");
    const nova = Boolean(temBotaoSair || temAreaAutenticada);
    if (nova !== sessaoAtiva) {
      sessaoAtiva = nova;
      aplicarVisibilidade();
    }
  }

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button, a");
    if (btn && ["sair", "terminar sessão", "logout"].includes((btn.textContent || "").trim().toLowerCase())) {
      sessaoAtiva = false;
      aplicarVisibilidade();
      return;
    }
    setTimeout(avaliarSessao, 150);
    setTimeout(avaliarSessao, 500);
  });

  setInterval(avaliarSessao, 700);
  setTimeout(avaliarSessao, 300);
})();
