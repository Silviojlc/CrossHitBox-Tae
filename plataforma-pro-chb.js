(function () {
  if (window.__chbPlataformaPro) return;
  window.__chbPlataformaPro = true;

  const KEY_EXCLUIDOS = "crosshitbox_membros_excluidos_v1";
  const CHAVES_MEMBROS = [
    "crosshitbox_membros_v1",
    "crosshitbox_inscricoes_v1",
    "crosshitbox_perfis_completos_v1",
    "membros",
    "inscricoes"
  ];

  function normalizarChave(v) {
    return String(v || "").trim().toLowerCase();
  }

  function lerExcluidos() {
    try {
      const raw = localStorage.getItem(KEY_EXCLUIDOS);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set((Array.isArray(arr) ? arr : []).map(normalizarChave).filter(Boolean));
    } catch {
      return new Set();
    }
  }

  function registarExcluido(itemOrKey) {
    const excl = lerExcluidos();
    if (typeof itemOrKey === "string") {
      const k = normalizarChave(itemOrKey);
      if (k) excl.add(k);
    } else if (itemOrKey && typeof itemOrKey === "object") {
      [itemOrKey.id, itemOrKey.email, itemOrKey.telefone, itemOrKey.nome].forEach((val) => {
        const k = normalizarChave(val);
        if (k) excl.add(k);
      });
    }
    try {
      localStorage.setItem(KEY_EXCLUIDOS, JSON.stringify(Array.from(excl)));
    } catch {}
  }

  function itemEstaExcluido(item, exclSet) {
    if (!item || typeof item !== "object") return false;
    const candidatos = [item.id, item.email, item.telefone].map(normalizarChave).filter(Boolean);
    return candidatos.some((c) => exclSet.has(c));
  }

  function higienizarListaMembros(lista) {
    if (!Array.isArray(lista)) return lista;
    const excl = lerExcluidos();
    return lista.filter((m) => !itemEstaExcluido(m, excl));
  }

  // Intercepta leituras de localStorage para impedir que registos excluídos voltem à UI
  const _getItem = localStorage.getItem.bind(localStorage);
  localStorage.getItem = function (key) {
    const val = _getItem(key);
    if (!val || !CHAVES_MEMBROS.includes(key)) return val;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return JSON.stringify(higienizarListaMembros(parsed));
      }
    } catch {}
    return val;
  };

  // Observa cliques em botões de excluir/remover para registar exclusão definitiva imediatamente
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button, a");
    if (!btn) return;
    const rotulo = normalizarChave(btn.textContent);
    if (rotulo.includes("excluir") || rotulo.includes("eliminar") || rotulo.includes("apagar") || rotulo.includes("remover")) {
      const linha = btn.closest("tr, .card, [data-email], [data-id]");
      if (linha) {
        const emailAttr = linha.getAttribute("data-email");
        const idAttr = linha.getAttribute("data-id");
        if (emailAttr) registarExcluido(emailAttr);
        if (idAttr) registarExcluido(idAttr);
        const textoLinha = linha.innerText || "";
        const mEmail = textoLinha.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (mEmail) registarExcluido(mEmail[0]);
      }
      setTimeout(() => {
        if (typeof window.chbAtualizarDashboardPro === "function") {
          window.chbAtualizarDashboardPro();
        }
      }, 250);
    }
  }, true);

  function obterInscricoesOrdenadas() {
    const excl = lerExcluidos();
    const mapa = new Map();

    ["crosshitbox_perfis_completos_v1", "crosshitbox_membros_v1", "crosshitbox_inscricoes_v1"].forEach((chave) => {
      try {
        const raw = _getItem(chave);
        const arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) return;
        arr.forEach((m) => {
          if (!m || typeof m !== "object") return;
          if (itemEstaExcluido(m, excl)) return;
          const chaveUnica = normalizarChave(m.email || m.id || m.telefone || m.nome);
          if (!chaveUnica) return;
          const existente = mapa.get(chaveUnica) || {};
          mapa.set(chaveUnica, { ...existente, ...m });
        });
      } catch {}
    });

    const lista = Array.from(mapa.values());
    lista.sort((a, b) => {
      const da = Date.parse(a.created_at || a.data_inscricao || a.criado_em || "") || Number(a.id) || 0;
      const db = Date.parse(b.created_at || b.data_inscricao || b.criado_em || "") || Number(b.id) || 0;
      return db - da;
    });
    return lista;
  }

  window.chbExcluirDefinitivoPro = function (identificador) {
    if (!identificador) return;
    registarExcluido(identificador);
    const excl = lerExcluidos();
    ["crosshitbox_perfis_completos_v1", "crosshitbox_membros_v1", "crosshitbox_inscricoes_v1"].forEach((chave) => {
      try {
        const raw = _getItem(chave);
        const arr = raw ? JSON.parse(raw) : [];
        if (Array.isArray(arr)) {
          const limpos = arr.filter((m) => !itemEstaExcluido(m, excl));
          localStorage.setItem(chave, JSON.stringify(limpos));
        }
      } catch {}
    });
    window.chbAtualizarDashboardPro();
  };

  window.chbFocarSecaoPro = function (termo) {
    // Garante que nenhuma secção fique escondida indevidamente
    document.querySelectorAll("section").forEach((s) => {
      if (s.style && s.style.display === "none" && !s.classList.contains("hidden")) {
        s.style.display = "";
      }
    });
    if (!termo) return;
    const alvo = Array.from(document.querySelectorAll("section, h2, h3")).find((el) =>
      normalizarChave(el.innerText).includes(normalizarChave(termo))
    );
    if (alvo && typeof alvo.scrollIntoView === "function") {
      alvo.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  window.chbAtualizarDashboardPro = function () {
    const painel = document.getElementById("chbDashboardPro");
    if (!painel) return;

    const inscritos = obterInscricoesOrdenadas();
    let pagamentos = [];
    try {
      pagamentos = JSON.parse(_getItem("crosshitbox_pagamentos_v1") || "[]") || [];
    } catch {}

    const pendentes = inscritos.filter((i) => {
      const st = normalizarChave(i.status || i.estado || "");
      return st.includes("pend") || st.includes("aguard") || !i.aprovado;
    }).length;

    const recentes = inscritos.slice(0, 6);
    const corpoRecentes = document.getElementById("chbListaInscricoesRecentes");
    const kpiTotal = document.getElementById("chbKpiTotalInscritos");
    const kpiPend = document.getElementById("chbKpiPendentes");
    const kpiPag = document.getElementById("chbKpiPagamentos");

    if (kpiTotal) kpiTotal.textContent = String(inscritos.length);
    if (kpiPend) kpiPend.textContent = String(pendentes);
    if (kpiPag) kpiPag.textContent = String(Array.isArray(pagamentos) ? pagamentos.length : 0);

    if (corpoRecentes) {
      if (!recentes.length) {
        corpoRecentes.innerHTML = `<div class="text-xs text-slate-400 py-3">Nenhuma inscrição ativa registada no momento.</div>`;
      } else {
        corpoRecentes.innerHTML = recentes
          .map((ins) => {
            const nome = ins.nome || "Atleta sem nome";
            const email = ins.email || "-";
            const turno = ins.turno || ins.horario || "Turno a definir";
            const dataStr = (ins.created_at || ins.data_inscricao || "").toString().slice(0, 10) || "Recente";
            const chaveRef = ins.email || ins.id || nome;
            return `
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs">
                <div class="min-w-0">
                  <div class="font-bold text-white truncate">${nome} <span class="text-[11px] font-normal text-amber-400">• ${turno}</span></div>
                  <div class="text-[11px] text-slate-400 truncate">${email} • ${dataStr}</div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button type="button" onclick="chbFocarSecaoPro('mensalidade')" class="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold">Pagamento</button>
                  <button type="button" onclick="chbExcluirDefinitivoPro('${String(chaveRef).replace(/'/g, "")}')" class="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold">Excluir</button>
                </div>
              </div>
            `;
          })
          .join("");
      }
    }
  };

  function montarDashboardProfissional() {
    if (!document.body || document.getElementById("chbDashboardPro")) return;
    const isAdmin = (window.location.pathname || "").toLowerCase().includes("admin");
    if (!isAdmin) return;
    if (typeof window.chbEstadoAutenticado === "function" && !window.chbEstadoAutenticado()) return;

    // Garante que secções não fiquem ocultas em massa por filtros antigos
    document.querySelectorAll("section").forEach((sec) => {
      if (sec.style && sec.style.display === "none" && !sec.classList.contains("hidden")) {
        sec.style.display = "";
      }
    });

    const box = document.createElement("section");
    box.id = "chbDashboardPro";
    box.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    box.innerHTML = `
      <div class="bg-slate-900/95 border border-amber-500/35 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">CrossHitBox Tae • Centro de Comando</div>
            <h2 class="text-base sm:text-lg font-black text-white">Dashboard Geral &amp; Inscrições Recentes</h2>
          </div>
          <div class="flex flex-wrap gap-1.5 text-xs">
            <button type="button" onclick="chbFocarSecaoPro('turno')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold">Turnos</button>
            <button type="button" onclick="chbFocarSecaoPro('mensalidade')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold">Pagamentos</button>
            <button type="button" onclick="chbFocarSecaoPro('aula')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold">Aulas &amp; Vídeos</button>
            <button type="button" onclick="chbAtualizarDashboardPro()" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">Atualizar</button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-[11px] text-slate-400 uppercase font-semibold">Inscritos Ativos</div>
            <div id="chbKpiTotalInscritos" class="text-xl font-black text-white mt-0.5">0</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-[11px] text-slate-400 uppercase font-semibold">Pendentes</div>
            <div id="chbKpiPendentes" class="text-xl font-black text-amber-400 mt-0.5">0</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-[11px] text-slate-400 uppercase font-semibold">Pagamentos</div>
            <div id="chbKpiPagamentos" class="text-xl font-black text-emerald-400 mt-0.5">0</div>
          </div>
        </div>

        <div>
          <div class="text-xs font-extrabold uppercase tracking-wide text-slate-300 mb-2">Inscrições Recentes (Mais Recentes Primeiro)</div>
          <div id="chbListaInscricoesRecentes" class="space-y-2"></div>
        </div>
      </div>
    `;

    const primeiroMain = document.querySelector("main");
    if (primeiroMain && primeiroMain.firstChild) {
      primeiroMain.insertBefore(box, primeiroMain.firstChild);
    } else {
      document.body.insertBefore(box, document.body.firstChild);
    }

    window.chbAtualizarDashboardPro();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(montarDashboardProfissional, 200));
  } else {
    setTimeout(montarDashboardProfissional, 200);
  }
})();
