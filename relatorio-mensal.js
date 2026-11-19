(function () {
  if (document.getElementById("relatorioMensalModulo")) return;

  let sessaoAtiva = false;

  function mesAtualISO() {
    return new Date().toISOString().slice(0, 7);
  }

  function detectarAdmin() {
    const caminho = (window.location.pathname || "").toLowerCase();
    const txt = document.body ? (document.body.innerText || "") : "";
    return caminho.includes("admin") || txt.includes("Painel Administrativo") || txt.includes("Configurar Sala de Videochamada");
  }

  function escaparCsv(valor) {
    const s = (valor === null || valor === undefined ? "" : String(valor)).replace(/"/g, '""');
    return `"${s}"`;
  }

  async function obterJsonSeguro(url, chaveArray) {
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (chaveArray && Array.isArray(data[chaveArray])) return data[chaveArray];
      return data.data || [];
    } catch {
      return [];
    }
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

  async function construirLinhasRelatorio(mesRef) {
    const membrosRem = await obterJsonSeguro("/api/crosshitbox/membros", "membros");
    const fichasRem = await obterJsonSeguro("/api/crosshitbox/fichas", "fichas");
    const presencasRem = await obterJsonSeguro("/api/crosshitbox/presencas", "presencas");
    const pagamentosRem = await obterJsonSeguro("/api/crosshitbox/pagamentos", "pagamentos");

    const presencas = presencasRem.length ? presencasRem : lerLocalArray("crosshitbox_presencas_v1");
    const pagamentos = pagamentosRem.length ? pagamentosRem : lerLocalArray("crosshitbox_pagamentos_v1");

    const mapa = new Map();

    const garantirAtleta = (emailRaw, nomeRaw, turnoRaw) => {
      const email = (emailRaw || "").toString().trim().toLowerCase();
      if (!email) return null;
      if (!mapa.has(email)) {
        mapa.set(email, {
          nome: (nomeRaw || email.split("@")[0]).toString().trim(),
          email,
          turno: (turnoRaw || "05:00 - Madrugada").toString().trim(),
          checkinsMes: 0,
          estadoMensalidade: "Pendente",
          referenciaPagamento: "-",
          ultimaAtualizacao: "-"
        });
      }
      const obj = mapa.get(email);
      if (nomeRaw && !obj.nome) obj.nome = String(nomeRaw).trim();
      if (turnoRaw) obj.turno = String(turnoRaw).trim();
      return obj;
    };

    for (const m of membrosRem) garantirAtleta(m.email, m.nome, m.horario || m.turno);
    for (const f of fichasRem) garantirAtleta(f.email, f.nome, f.horario || f.turno);

    for (const p of presencas) {
      const at = garantirAtleta(p.email, p.nome, p.turno);
      if (at && (p.data || "").startsWith(mesRef)) {
        at.checkinsMes += 1;
      }
    }

    for (const pg of pagamentos) {
      const at = garantirAtleta(pg.email, pg.nome, null);
      if (at && (!pg.mes || pg.mes === mesRef)) {
        at.estadoMensalidade = pg.estado || "Em Análise";
        at.referenciaPagamento = pg.referencia || "-";
        at.ultimaAtualizacao = (pg.atualizadoEm || pg.atualizado_em || "").slice(0, 10) || "-";
      }
    }

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }

  window.relatorioAtualizarResumo = async function () {
    const mesRef = document.getElementById("relMesInput")?.value || mesAtualISO();
    const linhas = await construirLinhasRelatorio(mesRef);
    const totalAtletas = linhas.length;
    const totalCheckins = linhas.reduce((acc, l) => acc + l.checkinsMes, 0);
    const pagos = linhas.filter((l) => l.estadoMensalidade === "Pago / Ativo").length;
    const pendentes = totalAtletas - pagos;

    const resumoEl = document.getElementById("relResumoCards");
    if (resumoEl) {
      resumoEl.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-slate-400">Atletas no Relatório</div>
            <div class="text-lg font-black text-white">${totalAtletas}</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-slate-400">Check-ins no Mês</div>
            <div class="text-lg font-black text-sky-400">${totalCheckins}</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-slate-400">Mensalidades Ativas</div>
            <div class="text-lg font-black text-emerald-400">${pagos}</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-slate-400">Pendentes / Em Análise</div>
            <div class="text-lg font-black text-amber-400">${pendentes}</div>
          </div>
        </div>
      `;
    }
  };

  window.relatorioExportarCsv = async function () {
    const mesRef = document.getElementById("relMesInput")?.value || mesAtualISO();
    const linhas = await construirLinhasRelatorio(mesRef);

    const cabecalho = [
      "Mês Referência",
      "Nome",
      "E-mail",
      "Turno",
      "Total Check-ins",
      "Estado Mensalidade",
      "Referência Pagamento",
      "Última Atualização"
    ].map(escaparCsv).join(";");

    const corpo = linhas.map((l) => [
      mesRef,
      l.nome,
      l.email,
      l.turno,
      l.checkinsMes,
      l.estadoMensalidade,
      l.referenciaPagamento,
      l.ultimaAtualizacao
    ].map(escaparCsv).join(";"));

    const csvContent = "\uFEFF" + [cabecalho].concat(corpo).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crosshitbox-tae-relatorio-${mesRef}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!detectarAdmin()) return;

  const container = document.createElement("section");
  container.id = "relatorioMensalModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-cyan-500/30 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-cyan-400">Relatório Mensal Consolidado (CSV / Excel)</h2>
        <p class="text-xs text-slate-400">Exporta presenças, turnos e estado das mensalidades do mês selecionado.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <input id="relMesInput" type="month" value="${mesAtualISO()}" onchange="relatorioAtualizarResumo()" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
        <button type="button" onclick="relatorioAtualizarResumo()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar Resumo</button>
        <button type="button" onclick="relatorioExportarCsv()" class="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs">Exportar CSV</button>
      </div>
    </div>
    <div id="relResumoCards"></div>
  `;

  const refEl = document.getElementById("lembretesWhatsappModulo") || document.getElementById("evolucaoFisicaModulo");
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  window.relatorioAtualizarResumo();

  function aplicarVisibilidade() {
    const el = document.getElementById("relatorioMensalModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.relatorioAtualizarResumo();
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
