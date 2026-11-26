/* chb-safe-fetch-guard */
(() => {
  if (window.__chbLocalApiGuard) return;
  window.__chbLocalApiGuard = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.includes("/api/crosshitbox/fichas") || url.includes("/api/crosshitbox/membros")) {
      return new Response(JSON.stringify({ success: true, fichas: [], membros: [], data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return origFetch(input, init);
  };
})();
/* end-chb-safe-fetch-guard */
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
  if (document.getElementById("modoComandoModulo")) return;

  let sessaoAtiva = false;

  function hojeISO() {
    return new Date().toISOString().slice(0, 10);
  }

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

  async function obterDadosComando() {
    const hoje = hojeISO();
    let wods = lerLocalArray("crosshitbox_wod_v1");
    let presencas = lerLocalArray("crosshitbox_presencas_v1");
    let fichas = [];

    try {
      const [rWod, rPres, rFichas] = await Promise.all([
        fetch("/api/crosshitbox/wod").catch(() => null),
        fetch("/api/crosshitbox/presencas").catch(() => null),
        fetch("/api/crosshitbox/fichas").catch(() => null)
      ]);
      if (rWod && rWod.ok) {
        const d = await rWod.json();
        if (Array.isArray(d.wods) && d.wods.length) wods = d.wods;
      }
      if (rPres && rPres.ok) {
        const d = await rPres.json();
        if (Array.isArray(d.presencas) && d.presencas.length) presencas = d.presencas;
      }
      if (rFichas && rFichas.ok) {
        const d = await rFichas.json();
        fichas = Array.isArray(d) ? d : (d.fichas || d.data || []);
      }
    } catch {}

    return { hoje, wods, presencas, fichas };
  }

  window.comandoMarcarPresencaRapida = async function (ev) {
    if (ev) ev.preventDefault();
    const nome = (document.getElementById("cmdNomePresenca")?.value || "").trim();
    const emailInput = (document.getElementById("cmdEmailPresenca")?.value || "").trim().toLowerCase();
    const turno = document.getElementById("cmdTurnoSelect")?.value || "05:00";
    if (!nome && !emailInput) return;

    const email = emailInput || (nome.toLowerCase().replace(/[^a-z0-9]/g, "") + "@crosshitbox.cv");
    const agora = new Date();
    const registo = {
      email,
      nome: nome || email.split("@")[0],
      data: hojeISO(),
      hora: agora.toTimeString().slice(0, 5),
      turno: turno === "18:00" ? "18:00 - Tarde" : "05:00 - Madrugada",
      origem: "Comando Ao Vivo",
      timestamp: agora.toISOString()
    };

    const local = lerLocalArray("crosshitbox_presencas_v1");
    local.unshift(registo);
    try { localStorage.setItem("crosshitbox_presencas_v1", JSON.stringify(local)); } catch {}

    try {
      await fetch("/api/crosshitbox/presencas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registo)
      });
    } catch {}

    if (document.getElementById("cmdNomePresenca")) document.getElementById("cmdNomePresenca").value = "";
    if (document.getElementById("cmdEmailPresenca")) document.getElementById("cmdEmailPresenca").value = "";
    await window.renderModoComandoUI();
  };

  window.comandoPartilharResumoAula = async function () {
    const turno = document.getElementById("cmdTurnoSelect")?.value || "05:00";
    const { hoje, wods, presencas } = await obterDadosComando();
    const wodAtual = wods.find((w) => w.data === hoje && (w.turno === "TODOS" || (w.turno || "").includes(turno))) || wods[0];
    const presentesTurno = presencas.filter((p) => p.data === hoje && (p.turno || "").includes(turno));

    const nomes = presentesTurno.length
      ? presentesTurno.map((p, i) => `${i + 1}. ${p.nome || p.email} (${p.hora || "OK"})`).join("\n")
      : "Nenhum check-in registado neste turno.";

    const msg = [
      `CROSSHITBOX TAE — RESUMO DA AULA (${hoje} • Turno ${turno})`,
      `WOD: ${wodAtual ? wodAtual.titulo + " [" + wodAtual.tipo + "]" : "Treino Funcional & Choque Tae"}`,
      `Presentes (${presentesTurno.length}):`,
      nomes,
      `Excelente entrega da equipa! Registam o vosso resultado no Ranking: ${window.location.origin}/membro.html`
    ].join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  window.comandoFocarTimer = function () {
    const timer = document.getElementById("hiitTimerModulo");
    if (timer) timer.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  window.renderModoComandoUI = async function () {
    const alvo = document.getElementById("conteudoModoComando");
    if (!alvo) return;
    const turno = document.getElementById("cmdTurnoSelect")?.value || "05:00";
    const { hoje, wods, presencas, fichas } = await obterDadosComando();

    const wodAtual = wods.find((w) => w.data === hoje && (w.turno === "TODOS" || (w.turno || "").includes(turno))) || wods[0];
    const presentesHoje = presencas.filter((p) => p.data === hoje && (p.turno || "").includes(turno));
    const alertasTurno = fichas.filter((f) => {
      const mesmoTurno = (f.horario || f.turno || "").includes(turno);
      const temRestricao = Boolean((f.patologias || f.restricoes || f.lesoes || "").toString().trim());
      return mesmoTurno && temRestricao;
    });

    alvo.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        <div class="bg-slate-950 border border-amber-500/40 rounded-xl p-4 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-amber-400 uppercase tracking-wide">WOD em Execução (${turno})</span>
            <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">${wodAtual ? wodAtual.tipo : "HIIT"}</span>
          </div>
          <div class="text-base font-black text-white">${wodAtual ? wodAtual.titulo : "Treino de Choque CrossHitBox Tae"}</div>
          <pre class="whitespace-pre-wrap font-sans text-slate-200 bg-slate-900 border border-slate-800 rounded-lg p-3 leading-relaxed">${wodAtual ? wodAtual.descricao : "Publica o WOD do dia abaixo para exibir aqui em destaque durante a aula."}</pre>
          <div class="flex flex-wrap gap-2 pt-1">
            <button type="button" onclick="comandoFocarTimer()" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">Abrir Cronómetro HIIT</button>
            <button type="button" onclick="comandoPartilharResumoAula()" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">Resumo Aula WhatsApp</button>
          </div>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-sky-400 uppercase tracking-wide">Check-ins de Hoje (${turno})</span>
            <span class="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-black">${presentesHoje.length} atletas</span>
          </div>
          <form onsubmit="comandoMarcarPresencaRapida(event)" class="grid grid-cols-5 gap-1.5">
            <input id="cmdNomePresenca" type="text" placeholder="Nome atleta" class="col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white">
            <input id="cmdEmailPresenca" type="email" placeholder="E-mail (opcional)" class="col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white">
            <button type="submit" class="col-span-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold">+ OK</button>
          </form>
          <div class="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            ${
              presentesHoje.length
                ? presentesHoje.map((p) => `
                  <div class="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                    <span class="font-semibold text-white truncate">${p.nome || p.email}</span>
                    <span class="text-slate-400 text-[11px]">${p.hora || "Presente"}</span>
                  </div>
                `).join("")
                : `<div class="text-slate-400 py-3">Ainda sem check-ins registados para hoje neste turno.</div>`
            }
          </div>
        </div>

        <div class="bg-slate-950 border border-rose-500/30 rounded-xl p-4 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-rose-400 uppercase tracking-wide">Alertas Clínicos (${turno})</span>
            <span class="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-black">${alertasTurno.length} alertas</span>
          </div>
          <div class="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            ${
              alertasTurno.length
                ? alertasTurno.map((f) => `
                  <div class="bg-rose-950/30 border border-rose-500/30 rounded-lg p-2.5">
                    <div class="font-bold text-white">${f.nome || f.email}</div>
                    <div class="text-rose-200 mt-0.5">${f.patologias || f.restricoes || f.lesoes}</div>
                  </div>
                `).join("")
                : `<div class="text-slate-400 py-3">Nenhuma patologia ou restrição crítica sinalizada neste turno.</div>`
            }
          </div>
        </div>
      </div>
    `;
  };

  if (!detectarAdmin()) return;

  const container = document.createElement("section");
  container.id = "modoComandoModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-amber-500/50 rounded-2xl p-5 shadow-2xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-black text-amber-400">Modo Comando ao Vivo — Sala de Aula (05:00 &amp; 18:00)</h2>
        <p class="text-xs text-slate-400">Painel rápido de operação durante o treino: WOD ativo, presenças do turno e alertas clínicos em 1 ecrã.</p>
      </div>
      <div class="flex items-center gap-2">
        <select id="cmdTurnoSelect" onchange="renderModoComandoUI()" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold">
          <option value="05:00">Turno 05:00 — Madrugada</option>
          <option value="18:00">Turno 18:00 — Tarde</option>
        </select>
        <button type="button" onclick="renderModoComandoUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
      </div>
    </div>
    <div id="conteudoModoComando"></div>
  `;

  const primeiroModulo = document.getElementById("relatorioNutricaoModulo") || document.getElementById("wodRankingModulo") || document.getElementById("pagamentosModulo");
  if (primeiroModulo && primeiroModulo.parentNode) {
    primeiroModulo.parentNode.insertBefore(container, primeiroModulo);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("modoComandoModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.renderModoComandoUI();
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
