(function () {
  if (document.getElementById("wodRankingModulo")) return;

  const KEY_WOD = "crosshitbox_wod_v1";
  const KEY_RES = "crosshitbox_wod_resultados_v1";
  let sessaoAtiva = false;

  function hojeISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function lerLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function guardarLocal(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr));
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

  async function obterDadosWod() {
    let wods = lerLocal(KEY_WOD);
    let resultados = lerLocal(KEY_RES);
    try {
      const res = await fetch("/api/crosshitbox/wod");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.wods) && data.wods.length) {
          wods = data.wods;
          guardarLocal(KEY_WOD, wods);
        }
        if (Array.isArray(data.resultados) && data.resultados.length) {
          resultados = data.resultados;
          guardarLocal(KEY_RES, resultados);
        }
      }
    } catch {}
    return { wods, resultados };
  }

  window.wodPublicarAdmin = async function (ev) {
    if (ev) ev.preventDefault();
    const data = document.getElementById("wodDataInput")?.value || hojeISO();
    const turno = document.getElementById("wodTurnoInput")?.value || "TODOS";
    const titulo = (document.getElementById("wodTituloInput")?.value || "").trim();
    const tipo = document.getElementById("wodTipoInput")?.value || "AMRAP";
    const descricao = (document.getElementById("wodDescricaoInput")?.value || "").trim();
    if (!titulo || !descricao) return;

    const id = `${data}_${turno}`;
    const registo = { id, data, turno, titulo, tipo, descricao, atualizadoEm: new Date().toISOString() };

    const wods = lerLocal(KEY_WOD);
    const idx = wods.findIndex((w) => w.id === id);
    if (idx >= 0) wods[idx] = registo;
    else wods.unshift(registo);
    guardarLocal(KEY_WOD, wods);

    try {
      await fetch("/api/crosshitbox/wod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registo)
      });
    } catch {}

    await renderWodUI();
  };

  window.wodSubmeterResultado = async function (ev) {
    if (ev) ev.preventDefault();
    const atleta = obterAtletaAtual();
    const data = hojeISO();
    const turno = document.getElementById("wodAtletaTurno")?.value || "05:00 - Madrugada";
    const resultado = (document.getElementById("wodResultadoInput")?.value || "").trim();
    const observacao = (document.getElementById("wodObsInput")?.value || "").trim();
    if (!resultado) return;

    const id = `${data}_${atleta.email}`;
    const registo = {
      id,
      data,
      turno,
      email: atleta.email,
      nome: atleta.nome,
      resultado,
      observacao,
      atualizadoEm: new Date().toISOString()
    };

    const lista = lerLocal(KEY_RES);
    const idx = lista.findIndex((r) => r.id === id);
    if (idx >= 0) lista[idx] = registo;
    else lista.unshift(registo);
    guardarLocal(KEY_RES, lista);

    try {
      await fetch("/api/crosshitbox/wod/resultado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registo)
      });
    } catch {}

    await renderWodUI();
  };

  window.renderWodUI = async function () {
    const alvo = document.getElementById("conteudoWodRanking");
    if (!alvo) return;
    const { isAdmin } = detectarContexto();
    const { wods, resultados } = await obterDadosWod();
    const hoje = hojeISO();
    const wodHoje = wods.find((w) => w.data === hoje) || wods[0];
    const resultadosHoje = resultados.filter((r) => r.data === (wodHoje ? wodHoje.data : hoje));

    if (isAdmin) {
      alvo.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <form onsubmit="wodPublicarAdmin(event)" class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="font-bold text-white text-sm">Publicar / Atualizar Treino do Dia (WOD)</div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-slate-400 mb-1">Data</label>
                <input id="wodDataInput" type="date" value="${hoje}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white">
              </div>
              <div>
                <label class="block text-slate-400 mb-1">Turno</label>
                <select id="wodTurnoInput" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white">
                  <option value="TODOS">Todos os turnos</option>
                  <option value="05:00">05:00 - Madrugada</option>
                  <option value="18:00">18:00 - Tarde</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-400 mb-1">Formato</label>
                <select id="wodTipoInput" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white">
                  <option value="AMRAP">AMRAP</option>
                  <option value="FOR TIME">FOR TIME</option>
                  <option value="EMOM">EMOM</option>
                  <option value="TABATA">TABATA</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Título do WOD</label>
              <input id="wodTituloInput" type="text" placeholder="Ex.: Inferno Metabólico Tae #14" value="${wodHoje ? wodHoje.titulo : ""}" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Exercícios, séries e metas</label>
              <textarea id="wodDescricaoInput" rows="3" placeholder="Ex.: 15 min AMRAP: 12 Burpees + 18 Kettlebell Swings + 24 Air Squats" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">${wodHoje ? wodHoje.descricao : ""}</textarea>
            </div>
            <button type="submit" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">Publicar WOD para Atletas</button>
          </form>

          <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-sm">Quadro de Resultados (${wodHoje ? wodHoje.data : hoje})</span>
              <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">${resultadosHoje.length} registos</span>
            </div>
            ${
              resultadosHoje.length
                ? resultadosHoje.map((r, i) => `
                  <div class="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2">
                    <div>
                      <span class="font-bold text-amber-400 mr-1.5">#${i + 1}</span>
                      <span class="font-semibold text-white">${r.nome || r.email}</span>
                      <span class="text-slate-400 ml-1">(${r.turno})</span>
                      ${r.observacao ? `<div class="text-slate-400 text-[11px]">${r.observacao}</div>` : ""}
                    </div>
                    <span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-extrabold">${r.resultado}</span>
                  </div>
                `).join("")
                : `<div class="text-slate-400 py-4">Ainda nenhum atleta submeteu o resultado do WOD de hoje.</div>`
            }
          </div>
        </div>
      `;
    } else {
      alvo.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            ${
              wodHoje
                ? `
                  <div class="flex items-center justify-between gap-2">
                    <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold">${wodHoje.tipo}</span>
                    <span class="text-slate-400">${wodHoje.data} • Turno: ${wodHoje.turno}</span>
                  </div>
                  <div class="text-base font-black text-white">${wodHoje.titulo}</div>
                  <pre class="whitespace-pre-wrap font-sans text-slate-200 bg-slate-900 border border-slate-800 rounded-lg p-3 leading-relaxed">${wodHoje.descricao}</pre>
                `
                : `<div class="text-slate-400">O treinador ainda não publicou o WOD de hoje. Usa o cronómetro HIIT abaixo para o teu treino livre!</div>`
            }
            <form onsubmit="wodSubmeterResultado(event)" class="space-y-2 pt-2 border-t border-slate-800">
              <div class="font-bold text-white">Registar o Meu Resultado</div>
              <div class="grid grid-cols-2 gap-2">
                <select id="wodAtletaTurno" class="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white">
                  <option value="05:00 - Madrugada">05:00 - Madrugada</option>
                  <option value="18:00 - Tarde">18:00 - Tarde</option>
                </select>
                <input id="wodResultadoInput" type="text" placeholder="Ex.: 7 rounds + 8 reps / 12:30" required class="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white">
              </div>
              <input id="wodObsInput" type="text" placeholder="Nota opcional (ex.: RX, carga usada, sensação)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white">
              <button type="submit" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">Guardar no Ranking</button>
            </form>
          </div>

          <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <div class="font-bold text-white text-sm mb-1">Ranking do Dia — CrossHitBox Tae</div>
            ${
              resultadosHoje.length
                ? resultadosHoje.map((r, i) => `
                  <div class="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                    <div>
                      <span class="font-black text-amber-400 mr-1.5">#${i + 1}</span>
                      <span class="font-bold text-white">${r.nome || r.email}</span>
                      <span class="text-slate-400 text-[11px] ml-1">• ${r.turno}</span>
                    </div>
                    <span class="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">${r.resultado}</span>
                  </div>
                `).join("")
                : `<div class="text-slate-400">Sê o primeiro atleta a registar o teu tempo/rounds de hoje!</div>`
            }
          </div>
        </div>
      `;
    }
  };

  const { isAdmin } = detectarContexto();
  const container = document.createElement("section");
  container.id = "wodRankingModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-amber-500/40 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-amber-400">${isAdmin ? "Treino do Dia (WOD) & Ranking dos Atletas" : "Treino do Dia (WOD) & Quadro de Resultados"}</h2>
        <p class="text-xs text-slate-400">${isAdmin ? "Publica o desafio diário da turma e acompanha os resultados por turno." : "Consulta o treino programado pelo treinador e regista a tua marca no ranking."}</p>
      </div>
      <button type="button" onclick="renderWodUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
    </div>
    <div id="conteudoWodRanking"></div>
  `;

  const primeiroModulo = document.getElementById("pagamentosModulo") || document.getElementById("presencasModulo") || document.getElementById("hiitTimerModulo");
  if (primeiroModulo && primeiroModulo.parentNode) {
    primeiroModulo.parentNode.insertBefore(container, primeiroModulo);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("wodRankingModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      renderWodUI();
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
