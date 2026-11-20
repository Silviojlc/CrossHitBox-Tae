(function () {
  if (document.getElementById("gestaoTotalAdminModulo")) return;

  const KEY_PAGAMENTOS = "crosshitbox_pagamentos_v1";
  const KEY_PAG_EXCLUIDOS = "crosshitbox_pagamentos_excluidos_v1";
  const KEY_ORDEM_SECOES = "crosshitbox_admin_ordem_secoes_v1";
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

  function chaveUnicaPagamento(p, idx) {
    return String(p.id || `${p.email || "sem"}_${p.mes_referencia || "sem"}_${p.data_envio || idx}`);
  }

  async function carregarPagamentosEditaveis() {
    const excluidos = new Set(lerArray(KEY_PAG_EXCLUIDOS).map(String));
    let lista = lerArray(KEY_PAGAMENTOS);

    try {
      const r = await fetch("/api/crosshitbox/pagamentos?_=" + Date.now(), { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.pagamentos) && d.pagamentos.length) {
          lista = d.pagamentos;
        }
      }
    } catch {}

    const normalizados = lista
      .map((p, idx) => {
        const id = chaveUnicaPagamento(p, idx);
        return Object.assign({}, p, {
          id,
          nome: p.nome || (p.email ? p.email.split("@")[0] : "Atleta"),
          email: (p.email || "").toLowerCase(),
          mes_referencia: p.mes_referencia && p.mes_referencia !== "undefined" ? p.mes_referencia : new Date().toISOString().slice(0, 7),
          metodo: p.metodo && p.metodo !== "undefined" ? p.metodo : (p.referencia || "-"),
          valor: p.valor || "500$00",
          estado: p.estado || "Aguardando Validação",
          notas: p.notas || ""
        });
      })
      .filter((p) => !excluidos.has(String(p.id)));

    gravarArray(KEY_PAGAMENTOS, normalizados);
    return normalizados;
  }

  window.chbAbrirEditorPagamento = async function (id) {
    const lista = await carregarPagamentosEditaveis();
    const item = lista.find((x) => String(x.id) === String(id));
    if (!item) return;

    const modal = document.getElementById("modalEditorPagamentoCHB");
    if (!modal) return;
    document.getElementById("editPgId").value = item.id;
    document.getElementById("editPgNome").value = item.nome || "";
    document.getElementById("editPgEmail").value = item.email || "";
    document.getElementById("editPgMes").value = item.mes_referencia || new Date().toISOString().slice(0, 7);
    document.getElementById("editPgMetodo").value = item.metodo || "";
    document.getElementById("editPgValor").value = item.valor || "500$00";
    document.getElementById("editPgEstado").value = item.estado || "Pago / Ativo";
    document.getElementById("editPgNotas").value = item.notas || "";
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  };

  window.chbFecharEditorPagamento = function () {
    const modal = document.getElementById("modalEditorPagamentoCHB");
    if (modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
  };

  window.chbGuardarEdicaoPagamento = async function (ev) {
    if (ev) ev.preventDefault();
    const id = document.getElementById("editPgId").value;
    const lista = await carregarPagamentosEditaveis();
    const idx = lista.findIndex((x) => String(x.id) === String(id));
    if (idx < 0) return;

    const estadoNovo = document.getElementById("editPgEstado").value;
    const aprovado = estadoNovo === "Pago / Ativo";
    const validade = aprovado ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) : (lista[idx].validade_ate || "");

    const atualizado = Object.assign({}, lista[idx], {
      nome: document.getElementById("editPgNome").value.trim(),
      email: document.getElementById("editPgEmail").value.trim().toLowerCase(),
      mes_referencia: document.getElementById("editPgMes").value.trim(),
      metodo: document.getElementById("editPgMetodo").value.trim(),
      valor: document.getElementById("editPgValor").value.trim() || "500$00",
      estado: estadoNovo,
      aprovado_admin: aprovado,
      validade_ate: validade,
      notas: document.getElementById("editPgNotas").value.trim()
    });

    lista[idx] = atualizado;
    gravarArray(KEY_PAGAMENTOS, lista);

    try {
      await fetch("/api/crosshitbox/pagamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(atualizado)
      });
    } catch {}

    window.chbFecharEditorPagamento();
    await window.renderGestaoTotalPagamentosUI();
  };

  window.chbMoverPagamento = async function (id, direcao) {
    const lista = await carregarPagamentosEditaveis();
    const idx = lista.findIndex((x) => String(x.id) === String(id));
    if (idx < 0) return;

    const [item] = lista.splice(idx, 1);
    if (direcao === "TOPO") {
      lista.unshift(item);
    } else if (direcao === "CIMA") {
      lista.splice(Math.max(0, idx - 1), 0, item);
    } else if (direcao === "BAIXO") {
      lista.splice(Math.min(lista.length, idx + 1), 0, item);
    }
    gravarArray(KEY_PAGAMENTOS, lista);

    try {
      await fetch("/api/crosshitbox/pagamentos/reordenar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagamentos: lista })
      });
    } catch {}

    await window.renderGestaoTotalPagamentosUI();
  };

  window.chbExcluirPagamento = async function (id) {
    if (!id) return;
    const excl = new Set(lerArray(KEY_PAG_EXCLUIDOS).map(String));
    excl.add(String(id));
    gravarArray(KEY_PAG_EXCLUIDOS, Array.from(excl));

    const restam = (await carregarPagamentosEditaveis()).filter((x) => String(x.id) !== String(id));
    gravarArray(KEY_PAGAMENTOS, restam);

    try {
      await fetch("/api/crosshitbox/pagamentos/" + encodeURIComponent(id), { method: "DELETE" });
    } catch {}

    await window.renderGestaoTotalPagamentosUI();
  };

  window.chbLimparDuplicadosPagamentos = async function () {
    const lista = await carregarPagamentosEditaveis();
    const vistos = new Set();
    const excl = new Set(lerArray(KEY_PAG_EXCLUIDOS).map(String));
    const limpos = [];

    for (const item of lista) {
      const chaveDedupe = `${item.email}_${item.mes_referencia}_${item.estado}_${item.comprovativo_base64 ? "COM_ANEXO" : "SEM_ANEXO"}`;
      if (vistos.has(chaveDedupe)) {
        excl.add(String(item.id));
        try {
          fetch("/api/crosshitbox/pagamentos/" + encodeURIComponent(item.id), { method: "DELETE" }).catch(() => {});
        } catch {}
      } else {
        vistos.add(chaveDedupe);
        limpos.push(item);
      }
    }

    gravarArray(KEY_PAG_EXCLUIDOS, Array.from(excl));
    gravarArray(KEY_PAGAMENTOS, limpos);
    await window.renderGestaoTotalPagamentosUI();
  };

  window.renderGestaoTotalPagamentosUI = async function () {
    const alvo = document.getElementById("conteudoGestaoTotalPagamentos");
    if (!alvo) return;
    const filtro = document.getElementById("filtroEstadoPagTotal")?.value || "TODOS";
    const lista = await carregarPagamentosEditaveis();
    const filtrados = lista.filter((p) => filtro === "TODOS" || p.estado === filtro);

    alvo.innerHTML = `
      <div class="space-y-3 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
          <div class="text-slate-300">
            Total visível: <strong class="text-white">${filtrados.length}</strong> • Usa os botões em cada cartão para <strong>Editar</strong>, <strong>Mover (↑ ↓ ★)</strong> ou <strong>Apagar</strong>.
          </div>
          <button type="button" onclick="chbLimparDuplicadosPagamentos()" class="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-bold">
            Limpar Duplicados / Repetidos
          </button>
        </div>

        ${
          filtrados.length
            ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${filtrados.map((p, idx) => {
                  const corBadge =
                    p.estado === "Pago / Ativo"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : p.estado === "Em Análise"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-300";
                  return `
                    <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                      <div class="flex items-start justify-between gap-2">
                        <div>
                          <div class="font-bold text-white text-sm">${p.nome}</div>
                          <div class="text-slate-400">Mês: <strong class="text-slate-200">${p.mes_referencia}</strong> • Ref: ${p.metodo} • Valor: <strong class="text-amber-300">${p.valor}</strong></div>
                          ${p.notas ? `<div class="text-slate-400 italic mt-0.5">${p.notas}</div>` : ""}
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full font-bold shrink-0 ${corBadge}">${p.estado}</span>
                      </div>

                      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                        <div class="flex flex-wrap items-center gap-1.5">
                          ${p.comprovativo_base64 ? `<a href="${p.comprovativo_base64}" download="Comprovativo_${p.nome}.jpg" class="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold">Ver Comprovativo</a>` : `<span class="text-slate-500">Sem anexo</span>`}
                          <button type="button" onclick="chbAbrirEditorPagamento('${p.id}')" class="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">Editar</button>
                          <button type="button" onclick="chbExcluirPagamento('${p.id}')" class="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold">Apagar</button>
                        </div>

                        <div class="flex items-center gap-1" title="Mover posição">
                          <button type="button" onclick="chbMoverPagamento('${p.id}', 'TOPO')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold" title="Mover para o topo">★</button>
                          <button type="button" onclick="chbMoverPagamento('${p.id}', 'CIMA')" ${idx === 0 ? "disabled" : ""} class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold disabled:opacity-40" title="Subir">↑</button>
                          <button type="button" onclick="chbMoverPagamento('${p.id}', 'BAIXO')" ${idx === filtrados.length - 1 ? "disabled" : ""} class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold disabled:opacity-40" title="Descer">↓</button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>`
            : `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400">Nenhum registo neste filtro.</div>`
        }
      </div>
    `;
  };

  // Controlo livre para mover qualquer bloco/secção do painel admin para cima/baixo ou minimizar
  function ativarControloLivreBlocosAdmin() {
    const seccoes = Array.from(document.querySelectorAll("section[id]"));
    seccoes.forEach((sec) => {
      if (sec.querySelector(".barra-mover-bloco-chb")) return;
      const barra = document.createElement("div");
      barra.className = "barra-mover-bloco-chb flex items-center justify-end gap-1.5 mb-2 text-[11px]";
      barra.innerHTML = `
        <span class="text-slate-500 mr-auto">Posição do Painel:</span>
        <button type="button" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold" data-acao="CIMA" title="Mover bloco para cima">↑ Subir Bloco</button>
        <button type="button" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold" data-acao="BAIXO" title="Mover bloco para baixo">↓ Descer Bloco</button>
        <button type="button" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold" data-acao="MIN" title="Minimizar ou expandir">—</button>
      `;
      barra.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button[data-acao]");
        if (!btn || !sec.parentNode) return;
        const acao = btn.dataset.acao;
        if (acao === "CIMA" && sec.previousElementSibling) {
          sec.parentNode.insertBefore(sec, sec.previousElementSibling);
        } else if (acao === "BAIXO" && sec.nextElementSibling) {
          sec.parentNode.insertBefore(sec.nextElementSibling, sec);
        } else if (acao === "MIN") {
          const filhos = Array.from(sec.children).filter((c) => !c.classList.contains("barra-mover-bloco-chb"));
          const oculto = sec.dataset.minimizado === "1";
          filhos.forEach((f) => {
            f.style.display = oculto ? "" : "none";
          });
          sec.dataset.minimizado = oculto ? "0" : "1";
          btn.textContent = oculto ? "—" : "+ Expandir";
        }
        const ordem = Array.from(document.querySelectorAll("section[id]")).map((s) => s.id);
        gravarArray(KEY_ORDEM_SECOES, ordem);
      });
      sec.insertBefore(barra, sec.firstChild);
    });
  }

  if (!detectarAdmin()) return;

  const container = document.createElement("section");
  container.id = "gestaoTotalAdminModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-amber-500/45 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-amber-400">Controlo Total de Mensalidades &amp; Comprovativos (Editar, Mover, Apagar)</h2>
        <p class="text-xs text-slate-400">Edita qualquer campo, limpa registos repetidos, altera a ordem dos cartões e reorganiza os blocos do painel livremente.</p>
      </div>
      <div class="flex items-center gap-2">
        <select id="filtroEstadoPagTotal" onchange="renderGestaoTotalPagamentosUI()" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-semibold">
          <option value="TODOS">Todos os estados</option>
          <option value="Pago / Ativo">Pago / Ativo</option>
          <option value="Em Análise">Em Análise</option>
          <option value="Aguardando Validação">Aguardando Validação</option>
          <option value="Pendente">Pendente</option>
        </select>
        <button type="button" onclick="renderGestaoTotalPagamentosUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
      </div>
    </div>
    <div id="conteudoGestaoTotalPagamentos"></div>

    <div id="modalEditorPagamentoCHB" class="hidden fixed inset-0 z-50 bg-black/75 items-center justify-center p-4" style="display:none;">
      <form onsubmit="chbGuardarEdicaoPagamento(event)" class="bg-slate-900 border border-amber-500 rounded-2xl p-5 max-w-lg w-full space-y-3 text-xs shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-black text-amber-400">Editar Registo de Mensalidade / Comprovativo</h3>
          <button type="button" onclick="chbFecharEditorPagamento()" class="text-slate-400 hover:text-white font-bold">X</button>
        </div>
        <input id="editPgId" type="hidden">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-400 mb-1">Nome do Atleta</label>
            <input id="editPgNome" type="text" required class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">E-mail</label>
            <input id="editPgEmail" type="email" required class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Mês de Referência (AAAA-MM)</label>
            <input id="editPgMes" type="text" required placeholder="2026-11" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Referência / Método</label>
            <input id="editPgMetodo" type="text" placeholder="Transferência / Vinti4 / Numerário" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Valor</label>
            <input id="editPgValor" type="text" value="500$00" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Estado</label>
            <select id="editPgEstado" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold">
              <option value="Pago / Ativo">Pago / Ativo</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Aguardando Validação">Aguardando Validação</option>
              <option value="Pendente">Pendente</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-slate-400 mb-1">Observações</label>
          <input id="editPgNotas" type="text" placeholder="Nota administrativa opcional" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="chbFecharEditorPagamento()" class="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 font-bold">Cancelar</button>
          <button type="submit" class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">Guardar Alterações</button>
        </div>
      </form>
    </div>
  `;

  const refEl = document.getElementById("cadastroBlindagemModulo") || document.getElementById("modoComandoModulo") || document.body.firstChild;
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("gestaoTotalAdminModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.renderGestaoTotalPagamentosUI();
      ativarControloLivreBlocosAdmin();
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

  setInterval(avaliarSessao, 600);
  aplicarVisibilidade();
})();
