(function () {
  if (document.getElementById("evolucaoFisicaModulo")) return;

  const KEY_EVO = "crosshitbox_evolucao_v1";
  let sessaoAtiva = false;

  function hojeISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function lerLocal() {
    try {
      const raw = localStorage.getItem(KEY_EVO);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function guardarLocal(arr) {
    try {
      localStorage.setItem(KEY_EVO, JSON.stringify(arr));
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
      if (val.includes("@")) return { email: val.toLowerCase(), nome: val.split("@")[0] };
    }
    const matchEmail = (document.body.innerText || "").match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (matchEmail) return { email: matchEmail[0].toLowerCase(), nome: matchEmail[0].split("@")[0] };
    return { email: "atleta@crosshitbox.cv", nome: "Atleta" };
  }

  async function obterEvolucoes() {
    let lista = lerLocal();
    try {
      const res = await fetch("/api/crosshitbox/evolucao");
      if (res.ok) {
        const data = await res.json();
        const rem = Array.isArray(data) ? data : (data.evolucoes || data.data || []);
        if (Array.isArray(rem) && rem.length) {
          const mapa = new Map();
          for (const item of lista.concat(rem)) {
            const k = item.id || `${(item.email || "").toLowerCase()}_${item.data || ""}_${item.atualizadoEm || item.atualizado_em || ""}`;
            mapa.set(k, Object.assign({}, mapa.get(k) || {}, item));
          }
          lista = Array.from(mapa.values());
          guardarLocal(lista);
        }
      }
    } catch {}
    return lista.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }

  window.evoGuardarRegisto = async function (ev) {
    if (ev) ev.preventDefault();
    const atleta = obterAtletaAtual();
    const data = document.getElementById("evoDataInput")?.value || hojeISO();
    const pesoKg = parseFloat(document.getElementById("evoPesoInput")?.value || "") || null;
    const cinturaCm = parseFloat(document.getElementById("evoCinturaInput")?.value || "") || null;
    const testeFisico = (document.getElementById("evoTesteInput")?.value || "").trim();
    const resultadoTeste = (document.getElementById("evoResultadoInput")?.value || "").trim();
    const observacao = (document.getElementById("evoObsInput")?.value || "").trim();

    if (!pesoKg && !cinturaCm && !resultadoTeste) return;

    const id = `${atleta.email}_${data}_${Date.now()}`;
    const registo = {
      id,
      email: atleta.email,
      nome: atleta.nome,
      data,
      peso_kg: pesoKg,
      cintura_cm: cinturaCm,
      teste_fisico: testeFisico || "Avaliação Física",
      resultado_teste: resultadoTeste || "-",
      observacao,
      atualizado_em: new Date().toISOString()
    };

    const lista = lerLocal();
    lista.unshift(registo);
    guardarLocal(lista);

    try {
      await fetch("/api/crosshitbox/evolucao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registo)
      });
    } catch {}

    await renderEvolucaoUI();
  };

  window.renderEvolucaoUI = async function () {
    const alvo = document.getElementById("conteudoEvolucaoFisica");
    if (!alvo) return;
    const { isAdmin } = detectarContexto();
    const lista = await obterEvolucoes();

    if (isAdmin) {
      const filtro = (document.getElementById("evoFiltroAtleta")?.value || "").trim().toLowerCase();
      const filtrados = lista.filter((item) => {
        if (!filtro) return true;
        return ((item.nome || "") + " " + (item.email || "") + " " + (item.teste_fisico || "")).toLowerCase().includes(filtro);
      });

      alvo.innerHTML = filtrados.length
        ? `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            ${filtrados.map((r) => `
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white text-sm">${r.nome || r.email}</span>
                  <span class="text-slate-400">${r.data || ""}</span>
                </div>
                <div class="flex flex-wrap gap-2 text-slate-300">
                  ${r.peso_kg ? `<span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700">Peso: <strong>${r.peso_kg} kg</strong></span>` : ""}
                  ${r.cintura_cm ? `<span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700">Cintura: <strong>${r.cintura_cm} cm</strong></span>` : ""}
                </div>
                <div class="text-emerald-300">Teste (${r.teste_fisico || "Físico"}): <strong>${r.resultado_teste || "-"}</strong></div>
                ${r.observacao ? `<div class="text-slate-400">${r.observacao}</div>` : ""}
              </div>
            `).join("")}
          </div>
        `
        : `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">Nenhum registo de evolução física encontrado.</div>`;
    } else {
      const atleta = obterAtletaAtual();
      const meus = lista.filter((r) => (r.email || "").toLowerCase() === atleta.email);
      const ordenadosAsc = meus.slice().sort((a, b) => (a.data || "").localeCompare(b.data || ""));
      const inicial = ordenadosAsc[0];
      const atual = ordenadosAsc[ordenadosAsc.length - 1];

      let deltaPesoHtml = "";
      if (inicial && atual && inicial.peso_kg && atual.peso_kg && ordenadosAsc.length > 1) {
        const diff = (atual.peso_kg - inicial.peso_kg).toFixed(1);
        const sinal = diff > 0 ? `+${diff}` : diff;
        deltaPesoHtml = `<span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">Variação peso: ${sinal} kg</span>`;
      }

      alvo.innerHTML = `
        <div class="space-y-4 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div class="text-slate-300">
              Registos guardados: <strong class="text-white">${meus.length}</strong>
              ${atual && atual.peso_kg ? ` • Último peso: <strong class="text-white">${atual.peso_kg} kg</strong>` : ""}
              ${atual && atual.resultado_teste ? ` • Último teste: <strong class="text-emerald-300">${atual.resultado_teste}</strong>` : ""}
            </div>
            ${deltaPesoHtml}
          </div>

          <form onsubmit="evoGuardarRegisto(event)" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div>
              <label class="block text-slate-400 mb-1">Data</label>
              <input id="evoDataInput" type="date" value="${hojeISO()}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Peso (kg)</label>
              <input id="evoPesoInput" type="number" step="0.1" placeholder="Ex.: 78.5" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Cintura (cm)</label>
              <input id="evoCinturaInput" type="number" step="0.5" placeholder="Ex.: 82" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Teste Físico</label>
              <input id="evoTesteInput" type="text" placeholder="Ex.: Flexões 1m / Corrida 1km" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Marca / Resultado</label>
              <input id="evoResultadoInput" type="text" placeholder="Ex.: 45 reps / 04:20" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white">
            </div>
            <div class="sm:col-span-2 lg:col-span-4">
              <input id="evoObsInput" type="text" placeholder="Observação opcional (ex.: mais fôlego no turno das 05:00)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            </div>
            <div class="sm:col-span-2 lg:col-span-1 flex items-center">
              <button type="submit" class="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">Guardar</button>
            </div>
          </form>

          <div class="space-y-1.5">
            ${
              meus.slice(0, 6).map((r) => `
                <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2 text-slate-300">
                  <span><strong class="text-white">${r.data}</strong> • ${r.peso_kg ? r.peso_kg + " kg" : ""} ${r.cintura_cm ? "• " + r.cintura_cm + " cm" : ""}</span>
                  <span class="text-emerald-300 font-semibold">${r.teste_fisico || "Teste"}: ${r.resultado_teste || "-"}</span>
                </div>
              `).join("") || `<div class="text-slate-500">Ainda não tens avaliações físicas registadas.</div>`
            }
          </div>
        </div>
      `;
    }
  };

  const { isAdmin } = detectarContexto();
  const container = document.createElement("section");
  container.id = "evolucaoFisicaModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-emerald-500/30 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-emerald-400">${isAdmin ? "Evolução Corporal & Testes Físicos dos Atletas" : "Minha Evolução Corporal & Testes Físicos"}</h2>
        <p class="text-xs text-slate-400">${isAdmin ? "Acompanha medidas e testes de performance registados pelos atletas." : "Regista peso, medidas e marcas de testes para acompanhar a tua evolução."}</p>
      </div>
      ${
        isAdmin
          ? `<div class="flex items-center gap-2">
               <input id="evoFiltroAtleta" type="text" oninput="renderEvolucaoUI()" placeholder="Filtrar atleta..." class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
               <button type="button" onclick="renderEvolucaoUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
             </div>`
          : ""
      }
    </div>
    <div id="conteudoEvolucaoFisica"></div>
  `;

  const refEl = document.getElementById("wodRankingModulo") || document.getElementById("pagamentosModulo");
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("evolucaoFisicaModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      renderEvolucaoUI();
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
