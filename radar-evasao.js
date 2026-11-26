/* chb-safe-fetch-guard */
(() => {
  if (window.__chbSafeFetchInstalled) return;
  window.__chbSafeFetchInstalled = true;
  const _fetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.includes("/api/crosshitbox/fichas") || url.includes("/api/crosshitbox/membros")) {
      try {
        const resp = await _fetch(input, init);
        if (resp.status === 401 || resp.status === 404) {
          return new Response(JSON.stringify({ success: true, fichas: [], membros: [], data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        return resp;
      } catch {
        return new Response(JSON.stringify({ success: true, fichas: [], membros: [], data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    return _fetch(input, init);
  };
})();

(function () {
  if (document.getElementById("radarEvasaoModulo")) return;

  let sessaoAtiva = false;

  function detectarAdmin() {
    const caminho = (window.location.pathname || "").toLowerCase();
    const txt = document.body ? (document.body.innerText || "") : "";
    return caminho.includes("admin") || txt.includes("Painel Administrativo") || txt.includes("Configurar Sala de Videochamada");
  }

  function lerLocalArray(key) {
    try {
      const raw = localStorage.getItem(key);
      const p = raw ? JSON.parse(raw) : [];
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }

  function limparTelefoneCV(raw) {
    const digitos = (raw || "").toString().replace(/\D+/g, "");
    if (!digitos) return "";
    return digitos.length === 7 ? "238" + digitos : digitos;
  }

  async function obterDadosRadar() {
    let membros = [];
    let presencas = lerLocalArray("crosshitbox_presencas_v1");
    let pagamentos = lerLocalArray("crosshitbox_pagamentos_v1");

    try {
      const [rM, rP, rPg] = await Promise.all([
        fetch("/api/crosshitbox/membros").catch(() => null),
        fetch("/api/crosshitbox/presencas").catch(() => null),
        fetch("/api/crosshitbox/pagamentos").catch(() => null)
      ]);
      if (rM && rM.ok) {
        const d = await rM.json();
        membros = Array.isArray(d) ? d : (d.membros || d.data || []);
      }
      if (rP && rP.ok) {
        const d = await rP.json();
        if (Array.isArray(d.presencas) && d.presencas.length) presencas = d.presencas;
      }
      if (rPg && rPg.ok) {
        const d = await rPg.json();
        if (Array.isArray(d.pagamentos) && d.pagamentos.length) pagamentos = d.pagamentos;
      }
    } catch {}

    return { membros, presencas, pagamentos };
  }

  window.renderRadarEvasaoUI = async function () {
    const alvo = document.getElementById("conteudoRadarEvasao");
    if (!alvo) return;
    const { membros, presencas, pagamentos } = await obterDadosRadar();
    const agoraMs = Date.now();

    const mapaAtletas = new Map();
    for (const m of membros) {
      const em = (m.email || "").toString().trim().toLowerCase();
      if (!em) continue;
      mapaAtletas.set(em, {
        nome: m.nome || em.split("@")[0],
        email: em,
        telefone: m.telefone || m.contacto || m.telemovel || "",
        turno: m.horario || m.turno || "05:00 - Madrugada",
        ultimaData: null,
        diasSemTreino: 999,
        estadoMensalidade: "Pendente"
      });
    }

    for (const p of presencas) {
      const em = (p.email || "").toString().trim().toLowerCase();
      if (!em) continue;
      if (!mapaAtletas.has(em)) {
        mapaAtletas.set(em, {
          nome: p.nome || em.split("@")[0],
          email: em,
          telefone: "",
          turno: p.turno || "05:00 - Madrugada",
          ultimaData: null,
          diasSemTreino: 999,
          estadoMensalidade: "Pendente"
        });
      }
      const at = mapaAtletas.get(em);
      if (p.data && (!at.ultimaData || p.data > at.ultimaData)) {
        at.ultimaData = p.data;
      }
    }

    for (const pg of pagamentos) {
      const em = (pg.email || "").toString().trim().toLowerCase();
      if (em && mapaAtletas.has(em)) {
        mapaAtletas.get(em).estadoMensalidade = pg.estado || "Em Análise";
      }
    }

    const lista = Array.from(mapaAtletas.values()).map((at) => {
      if (at.ultimaData) {
        const ms = new Date(at.ultimaData + "T12:00:00Z").getTime();
        at.diasSemTreino = Math.max(0, Math.floor((agoraMs - ms) / 86400000));
      }
      let nivel = "EM_DIA";
      if (at.diasSemTreino >= 7 || at.estadoMensalidade === "Pendente") nivel = "CRITICO";
      else if (at.diasSemTreino >= 4 || at.estadoMensalidade === "Em Análise") nivel = "ATENCAO";
      return Object.assign({ nivel }, at);
    });

    const filtro = document.getElementById("radarFiltroNivel")?.value || "TODOS";
    const filtrados = lista
      .filter((x) => filtro === "TODOS" || x.nivel === filtro)
      .sort((a, b) => b.diasSemTreino - a.diasSemTreino);

    const criticos = lista.filter((x) => x.nivel === "CRITICO").length;
    const atencao = lista.filter((x) => x.nivel === "ATENCAO").length;

    alvo.innerHTML = `
      <div class="space-y-3 text-xs">
        <div class="flex flex-wrap items-center gap-2 text-slate-300">
          <span class="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold">Risco Crítico / Renovação: ${criticos}</span>
          <span class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">Atenção: ${atencao}</span>
          <span class="px-3 py-1 rounded-full bg-slate-800 text-slate-300">Total monitorizado: ${lista.length}</span>
        </div>

        ${
          filtrados.length
            ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                ${filtrados.map((item) => {
                  const badgeClasse =
                    item.nivel === "CRITICO"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : item.nivel === "ATENCAO"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
                  const rotuloNivel =
                    item.nivel === "CRITICO" ? "Risco / Renovação" : item.nivel === "ATENCAO" ? "Atenção" : "Em Dia";
                  const msg =
                    item.estadoMensalidade !== "Pago / Ativo"
                      ? `Olá ${item.nome}! Passando para lembrar a mensalidade do CrossHitBox Tae e convidar-te a regressar ao treino (${item.turno}).`
                      : `Olá ${item.nome}! Sentimos a tua falta no CrossHitBox Tae (${item.turno}). Vamos retomar o ritmo esta semana?`;
                  const tel = limparTelefoneCV(item.telefone);
                  const waHref = tel
                    ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
                    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

                  return `
                    <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-bold text-white text-sm truncate">${item.nome}</span>
                        <span class="px-2 py-0.5 rounded-full border text-[11px] font-bold ${badgeClasse}">${rotuloNivel}</span>
                      </div>
                      <div class="text-slate-400">
                        Último check-in: <strong class="text-slate-200">${item.ultimaData || "Sem registo"}</strong>
                        ${item.diasSemTreino < 999 ? ` (${item.diasSemTreino}d)` : ""}
                      </div>
                      <div class="flex items-center justify-between pt-1">
                        <span class="text-slate-300">Mensalidade: <strong>${item.estadoMensalidade}</strong></span>
                        <a href="${waHref}" target="_blank" rel="noopener" class="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>`
            : `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400">Nenhum atleta neste filtro de risco.</div>`
        }
      </div>
    `;
  };

  if (!detectarAdmin()) return;

  const container = document.createElement("section");
  container.id = "radarEvasaoModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-rose-500/35 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-rose-400">Radar de Risco de Evasão &amp; Renovação Inteligente</h2>
        <p class="text-xs text-slate-400">Identifica faltas prolongadas e mensalidades por regularizar com envio rápido via WhatsApp.</p>
      </div>
      <div class="flex items-center gap-2">
        <select id="radarFiltroNivel" onchange="renderRadarEvasaoUI()" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
          <option value="TODOS">Todos os níveis</option>
          <option value="CRITICO">Risco Crítico / Renovação</option>
          <option value="ATENCAO">Atenção</option>
          <option value="EM_DIA">Em Dia</option>
        </select>
        <button type="button" onclick="renderRadarEvasaoUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
      </div>
    </div>
    <div id="conteudoRadarEvasao"></div>
  `;

  const refEl = document.getElementById("streakSelosModulo") || document.getElementById("modoComandoModulo");
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("radarEvasaoModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.renderRadarEvasaoUI();
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
    const temAreaAutenticada = bodyText.includes("Sessão ativa como:") || bodyText.includes("Configurar Sala de Videochamada");
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

  document.addEventListener("submit", () => {
    setTimeout(avaliarSessao, 200);
    setTimeout(avaliarSessao, 600);
  });

  setInterval(avaliarSessao, 500);
  aplicarVisibilidade();
})();
