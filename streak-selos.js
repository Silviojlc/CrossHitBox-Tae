(function () {
  if (document.getElementById("streakSelosModulo")) return;

  let sessaoAtiva = false;

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

  function lerLocalArray(key) {
    try {
      const raw = localStorage.getItem(key);
      const p = raw ? JSON.parse(raw) : [];
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }

  function calcularMetricasAtleta(email, presencas, wods, evolucoes) {
    const em = (email || "").toLowerCase();
    const pAtleta = presencas.filter((p) => (p.email || "").toLowerCase() === em);
    const wAtleta = wods.filter((w) => (w.email || "").toLowerCase() === em);
    const eAtleta = evolucoes.filter((e) => (e.email || "").toLowerCase() === em);

    const datasUnicas = Array.from(new Set(pAtleta.map((p) => p.data).filter(Boolean))).sort();
    let streakDias = 0;
    if (datasUnicas.length > 0) {
      streakDias = 1;
      for (let i = datasUnicas.length - 1; i > 0; i--) {
        const dAtual = new Date(datasUnicas[i] + "T12:00:00Z").getTime();
        const dAnt = new Date(datasUnicas[i - 1] + "T12:00:00Z").getTime();
        const diffDias = Math.round((dAtual - dAnt) / 86400000);
        if (diffDias <= 3) streakDias += 1;
        else break;
      }
    }

    const selos = [];
    if (pAtleta.length >= 1) selos.push("Primeiro Check-in");
    if (pAtleta.length >= 5) selos.push("5+ Treinos Concluídos");
    if (pAtleta.length >= 15) selos.push("Tropa de Choque (15+ Treinos)");
    if (wAtleta.length >= 1) selos.push("Atleta de WOD");
    if (eAtleta.length >= 1) selos.push("Evolução Monitorizada");
    if (!selos.length) selos.push("Iniciante em Ascensão");

    return {
      email: em,
      totalTreinos: pAtleta.length,
      totalWods: wAtleta.length,
      streakDias,
      selos
    };
  }

  async function obterDadosBase() {
    let presencas = lerLocalArray("crosshitbox_presencas_v1");
    let wods = lerLocalArray("crosshitbox_wod_resultados_v1");
    let evolucoes = lerLocalArray("crosshitbox_evolucao_v1");

    try {
      const [rP, rW, rE] = await Promise.all([
        fetch("/api/crosshitbox/presencas").catch(() => null),
        fetch("/api/crosshitbox/wod").catch(() => null),
        fetch("/api/crosshitbox/evolucao").catch(() => null)
      ]);
      if (rP && rP.ok) {
        const d = await rP.json();
        if (Array.isArray(d.presencas) && d.presencas.length) presencas = d.presencas;
      }
      if (rW && rW.ok) {
        const d = await rW.json();
        if (Array.isArray(d.resultados) && d.resultados.length) wods = d.resultados;
      }
      if (rE && rE.ok) {
        const d = await rE.json();
        if (Array.isArray(d.evolucoes) && d.evolucoes.length) evolucoes = d.evolucoes;
      }
    } catch {}

    return { presencas, wods, evolucoes };
  }

  window.renderStreakSelosUI = async function () {
    const alvo = document.getElementById("conteudoStreakSelos");
    if (!alvo) return;
    const { isAdmin } = detectarContexto();
    const { presencas, wods, evolucoes } = await obterDadosBase();

    if (isAdmin) {
      const emails = Array.from(
        new Set(
          presencas.map((p) => (p.email || "").toLowerCase()).concat(wods.map((w) => (w.email || "").toLowerCase()))
        )
      ).filter(Boolean);

      const ranking = emails
        .map((em) => {
          const m = calcularMetricasAtleta(em, presencas, wods, evolucoes);
          const refNome =
            (presencas.find((p) => (p.email || "").toLowerCase() === em) || {}).nome ||
            (wods.find((w) => (w.email || "").toLowerCase() === em) || {}).nome ||
            em.split("@")[0];
          return Object.assign({ nome: refNome }, m);
        })
        .sort((a, b) => b.totalTreinos - a.totalTreinos);

      alvo.innerHTML = ranking.length
        ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            ${ranking.slice(0, 9).map((r) => `
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white text-sm">${r.nome}</span>
                  <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black">Sequência: ${r.streakDias}</span>
                </div>
                <div class="text-slate-400">Treinos: <strong class="text-white">${r.totalTreinos}</strong> • WODs: <strong class="text-emerald-300">${r.totalWods}</strong></div>
                <div class="flex flex-wrap gap-1">
                  ${r.selos.map((s) => `<span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-200 text-[11px] font-semibold">${s}</span>`).join("")}
                </div>
              </div>
            `).join("")}
          </div>`
        : `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">Sem dados suficientes para calcular sequências de constância ainda.</div>`;
    } else {
      const atleta = obterAtletaAtual();
      const m = calcularMetricasAtleta(atleta.email, presencas, wods, evolucoes);

      alvo.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div class="bg-slate-950 border border-amber-500/40 rounded-xl p-4 flex flex-col justify-between">
            <div class="text-slate-400">Sequência de Consistência</div>
            <div class="text-2xl font-black text-amber-400 my-1">${m.streakDias} ${m.streakDias === 1 ? "ciclo" : "ciclos"} ativos</div>
            <div class="text-slate-400">Total de presenças registadas: <strong class="text-white">${m.totalTreinos}</strong></div>
          </div>
          <div class="md:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <div class="font-bold text-white text-sm">Selos de Conquista — CrossHitBox Tae</div>
            <div class="flex flex-wrap gap-2">
              ${m.selos.map((s) => `<span class="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">${s}</span>`).join("")}
            </div>
          </div>
        </div>
      `;
    }
  };

  const { isAdmin } = detectarContexto();
  const container = document.createElement("section");
  container.id = "streakSelosModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-amber-500/35 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-amber-400">${isAdmin ? "Constância & Selos da Comunidade Tae" : "A Minha Sequência de Fogo & Selos"}</h2>
        <p class="text-xs text-slate-400">${isAdmin ? "Acompanha o ritmo de treinos, WODs e conquistas de cada atleta." : "A tua regularidade transforma-se em conquistas reais dentro do CrossHitBox Tae."}</p>
      </div>
      <button type="button" onclick="renderStreakSelosUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
    </div>
    <div id="conteudoStreakSelos"></div>
  `;

  const refEl = document.getElementById("modoComandoModulo") || document.getElementById("relatorioNutricaoModulo") || document.getElementById("wodRankingModulo");
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("streakSelosModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.renderStreakSelosUI();
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
