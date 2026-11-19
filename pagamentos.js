(function () {
  if (document.getElementById("pagamentosModulo")) return;

  const STORAGE_KEY = "crosshitbox_pagamentos_v1";
  let sessaoAtiva = false;
  let comprovativoBase64Atual = "";
  let comprovativoNomeAtual = "";

  function mesAtualISO() {
    return new Date().toISOString().slice(0, 7);
  }

  function lerStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function guardarStorage(lista) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    } catch {}
  }

  function detectarContexto() {
    const caminho = (window.location.pathname || "").toLowerCase();
    const txt = document.body ? (document.body.innerText || "") : "";
    const isAdmin = caminho.includes("admin") || txt.includes("Painel Administrativo") || txt.includes("Configurar Sala de Videochamada");
    return { isAdmin };
  }

  function obterAtletaAtual() {
    const inputs = Array.from(document.querySelectorAll("input"));
    for (const inp of inputs) {
      const val = (inp.value || "").trim();
      if (val.includes("@")) {
        return { email: val.toLowerCase(), nome: val.split("@")[0] };
      }
    }
    const matchEmail = (document.body.innerText || "").match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (matchEmail) {
      return { email: matchEmail[0].toLowerCase(), nome: matchEmail[0].split("@")[0] };
    }
    return { email: "atleta@crosshitbox.cv", nome: "Atleta" };
  }

  async function sincronizarServidor(registo) {
    try {
      await fetch("/api/crosshitbox/pagamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registo)
      });
    } catch {}
  }

  async function obterPagamentos() {
    let lista = lerStorage();
    try {
      const res = await fetch("/api/crosshitbox/pagamentos");
      if (res.ok) {
        const data = await res.json();
        const remoto = Array.isArray(data) ? data : (data.pagamentos || data.data || []);
        if (Array.isArray(remoto) && remoto.length) {
          const mapa = new Map();
          for (const item of lista.concat(remoto)) {
            const key = item.id || `${(item.email || "").toLowerCase()}_${item.mes || ""}`;
            mapa.set(key, Object.assign({}, mapa.get(key) || {}, item));
          }
          lista = Array.from(mapa.values());
          guardarStorage(lista);
        }
      }
    } catch {}
    return lista.sort((a, b) => (b.atualizadoEm || "").localeCompare(a.atualizadoEm || ""));
  }

  window.pagPrepararFicheiro = function (input) {
    const file = input && input.files && input.files[0];
    if (!file) {
      comprovativoBase64Atual = "";
      comprovativoNomeAtual = "";
      return;
    }
    comprovativoNomeAtual = file.name;
    const reader = new FileReader();
    reader.onload = function (e) {
      comprovativoBase64Atual = e.target.result || "";
      const info = document.getElementById("pagFicheiroInfo");
      if (info) info.textContent = "Ficheiro selecionado: " + comprovativoNomeAtual;
    };
    reader.readAsDataURL(file);
  };

  window.pagEnviarComprovativo = async function (ev) {
    if (ev) ev.preventDefault();
    const atleta = obterAtletaAtual();
    const mes = document.getElementById("pagMesInput")?.value || mesAtualISO();
    const referencia = (document.getElementById("pagRefInput")?.value || "").trim() || "Comprovativo anexado";

    const lista = lerStorage();
    const id = `${atleta.email}_${mes}`;
    const registo = {
      id,
      email: atleta.email,
      nome: atleta.nome,
      mes,
      referencia,
      arquivoNome: comprovativoNomeAtual || "comprovativo",
      arquivoDataUrl: comprovativoBase64Atual || "",
      estado: "Em Análise",
      atualizadoEm: new Date().toISOString()
    };

    const idx = lista.findIndex((x) => x.id === id);
    if (idx >= 0) lista[idx] = registo;
    else lista.unshift(registo);

    guardarStorage(lista);
    await sincronizarServidor(registo);

    comprovativoBase64Atual = "";
    comprovativoNomeAtual = "";
    await renderPagamentosUI();
  };

  window.pagAlterarEstado = async function (id, novoEstado) {
    const lista = lerStorage();
    const item = lista.find((x) => x.id === id);
    if (!item) return;
    item.estado = novoEstado;
    item.atualizadoEm = new Date().toISOString();
    guardarStorage(lista);
    await sincronizarServidor(item);
    await renderPagamentosUI();
  };

  window.pagVerComprovativo = function (id) {
    const lista = lerStorage();
    const item = lista.find((x) => x.id === id);
    if (!item || !item.arquivoDataUrl) return;
    const win = window.open("", "_blank", "noopener");
    if (!win) return;
    if (item.arquivoDataUrl.startsWith("data:image/")) {
      win.document.write(`<title>Comprovativo — ${item.nome}</title><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${item.arquivoDataUrl}" style="max-width:100%;max-height:100vh;border-radius:8px;" /></body>`);
    } else {
      win.document.write(`<title>Comprovativo — ${item.nome}</title><body style="margin:0;background:#0f172a;"><iframe src="${item.arquivoDataUrl}" style="width:100%;height:100vh;border:0;"></iframe></body>`);
    }
  };

  window.renderPagamentosUI = async function () {
    const box = document.getElementById("pagamentosModulo");
    const alvo = document.getElementById("conteudoPagamentos");
    if (!box || !alvo) return;

    const { isAdmin } = detectarContexto();
    const lista = await obterPagamentos();

    if (isAdmin) {
      const filtroEstado = document.getElementById("filtroEstadoPagamentos")?.value || "TODOS";
      const filtrados = lista.filter((p) => filtroEstado === "TODOS" || p.estado === filtroEstado);

      if (!filtrados.length) {
        alvo.innerHTML = `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">Nenhum comprovativo ou mensalidade registada para este filtro.</div>`;
        return;
      }

      alvo.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          ${filtrados.map((p) => {
            const ativo = p.estado === "Pago / Ativo";
            const analise = p.estado === "Em Análise";
            const corBadge = ativo
              ? "bg-emerald-500/20 text-emerald-300"
              : analise
              ? "bg-amber-500/20 text-amber-300"
              : "bg-rose-500/20 text-rose-300";

            return `
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <div class="font-bold text-white text-sm">${p.nome || p.email}</div>
                    <div class="text-slate-400">Mês: <strong class="text-slate-200">${p.mes}</strong> • Ref: <span class="text-slate-200">${p.referencia || "-"}</span></div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${corBadge}">${p.estado}</span>
                </div>
                <div class="flex flex-wrap gap-2 pt-1">
                  ${p.arquivoDataUrl ? `<button type="button" onclick="pagVerComprovativo('${p.id}')" class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold">Ver Comprovativo</button>` : `<span class="text-slate-500 self-center">Sem ficheiro anexado</span>`}
                  <button type="button" onclick="pagAlterarEstado('${p.id}', 'Pago / Ativo')" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">Aprovar Pagamento</button>
                  <button type="button" onclick="pagAlterarEstado('${p.id}', 'Pendente')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold">Marcar Pendente</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    } else {
      const atleta = obterAtletaAtual();
      const meus = lista.filter((p) => (p.email || "").toLowerCase() === atleta.email);
      const atualMes = meus.find((p) => p.mes === mesAtualISO()) || meus[0];
      const estadoAtual = atualMes ? atualMes.estado : "Pendente";

      const badgeClass =
        estadoAtual === "Pago / Ativo"
          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
          : estadoAtual === "Em Análise"
          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
          : "bg-rose-500/20 text-rose-300 border-rose-500/40";

      alvo.innerHTML = `
        <div class="space-y-4 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div>
              <div class="text-slate-400">Estado da Mensalidade (${atualMes ? atualMes.mes : mesAtualISO()})</div>
              <div class="text-base font-bold text-white mt-0.5">${atualMes ? atualMes.referencia : "A aguardar envio de comprovativo"}</div>
            </div>
            <span class="px-3 py-1 rounded-full border text-xs font-extrabold ${badgeClass}">${estadoAtual}</span>
          </div>

          <form onsubmit="pagEnviarComprovativo(event)" class="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div>
              <label class="block text-slate-400 mb-1">Mês de Referência</label>
              <input id="pagMesInput" type="month" value="${mesAtualISO()}" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Referência / Método</label>
              <input id="pagRefInput" type="text" placeholder="Ex.: Transferência / Vinti4 / Caixa" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Comprovativo (Imagem ou PDF)</label>
              <input type="file" accept="image/*,application/pdf" onchange="pagPrepararFicheiro(this)" class="w-full text-slate-300 text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-100 hover:file:bg-slate-700">
            </div>
            <div class="md:col-span-3 flex flex-wrap items-center justify-between gap-2 pt-1">
              <span id="pagFicheiroInfo" class="text-slate-400">Nenhum ficheiro selecionado</span>
              <button type="submit" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">
                Enviar Comprovativo
              </button>
            </div>
          </form>
        </div>
      `;
    }
  };

  const { isAdmin } = detectarContexto();
  const container = document.createElement("section");
  container.id = "pagamentosModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-amber-500/30 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-amber-400">${isAdmin ? "Gestão de Mensalidades & Comprovativos" : "Mensalidade & Comprovativo de Pagamento"}</h2>
        <p class="text-xs text-slate-400">${isAdmin ? "Confere comprovativos enviados pelos atletas e atualiza o estado das mensalidades." : "Envia o comprovativo da tua mensalidade e acompanha o estado da tua conta."}</p>
      </div>
      ${
        isAdmin
          ? `<div class="flex items-center gap-2">
               <select id="filtroEstadoPagamentos" onchange="renderPagamentosUI()" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
                 <option value="TODOS">Todos os estados</option>
                 <option value="Em Análise">Em Análise</option>
                 <option value="Pago / Ativo">Pago / Ativo</option>
                 <option value="Pendente">Pendente</option>
               </select>
               <button type="button" onclick="renderPagamentosUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
             </div>`
          : ""
      }
    </div>
    <div id="conteudoPagamentos"></div>
  `;

  const presencasEl = document.getElementById("presencasModulo");
  if (presencasEl && presencasEl.parentNode) {
    presencasEl.parentNode.insertBefore(container, presencasEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidadePagamentos() {
    const el = document.getElementById("pagamentosModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      renderPagamentosUI();
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
    const temAreaAutenticada = bodyText.includes("Sessão ativa como:") || bodyText.includes("Vídeos de Aulas Gravadas") || bodyText.includes("Configurar Sala de Videochamada");
    const nova = Boolean(temBotaoSair || temAreaAutenticada);
    if (nova !== sessaoAtiva) {
      sessaoAtiva = nova;
      aplicarVisibilidadePagamentos();
    }
  }

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button, a");
    if (btn && ["sair", "terminar sessão", "logout"].includes((btn.textContent || "").trim().toLowerCase())) {
      sessaoAtiva = false;
      aplicarVisibilidadePagamentos();
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
  aplicarVisibilidadePagamentos();
})();
