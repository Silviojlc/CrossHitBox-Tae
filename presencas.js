(function () {
  if (document.getElementById("presencasModulo")) return;

  const STORAGE_KEY = "crosshitbox_presencas_v1";
  let sessaoAtiva = false;

  function hojeISO() {
    return new Date().toISOString().slice(0, 10);
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

  function detectarContextoPagina() {
    const caminho = (window.location.pathname || "").toLowerCase();
    const txt = document.body ? (document.body.innerText || "") : "";
    const isAdmin = caminho.includes("admin") || txt.includes("Painel Administrativo") || txt.includes("Configurar Sala de Videochamada");
    const isMembro = caminho.includes("membro") || txt.includes("ÁREA DO ATLETA") || txt.includes("Vídeos de Aulas Gravadas");
    return { isAdmin, isMembro };
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

  async function sincronizarComServidor(registo) {
    try {
      await fetch("/api/crosshitbox/presencas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registo)
      });
    } catch {}
  }

  async function obterListaPresencas() {
    let lista = lerStorage();
    try {
      const res = await fetch("/api/crosshitbox/presencas");
      if (res.ok) {
        const data = await res.json();
        const remoto = Array.isArray(data) ? data : (data.presencas || data.data || []);
        if (Array.isArray(remoto) && remoto.length) {
          const mapa = new Map();
          for (const item of lista.concat(remoto)) {
            const chave = `${(item.email || "").toLowerCase()}_${item.data || ""}_${item.origem || ""}`;
            mapa.set(chave, item);
          }
          lista = Array.from(mapa.values());
          guardarStorage(lista);
        }
      }
    } catch {}
    return lista.sort((a, b) => (b.timestamp || b.data || "").localeCompare(a.timestamp || a.data || ""));
  }

  window.registrarCheckinCrossHitBox = async function (origem = "Check-in Manual") {
    const atleta = obterAtletaAtual();
    const dataHoje = hojeISO();
    const lista = lerStorage();

    const jaFezHoje = lista.some(
      (r) => (r.email || "").toLowerCase() === atleta.email && r.data === dataHoje && r.origem === origem
    );

    if (!jaFezHoje) {
      const novo = {
        email: atleta.email,
        nome: atleta.nome,
        data: dataHoje,
        hora: new Date().toTimeString().slice(0, 5),
        timestamp: new Date().toISOString(),
        origem,
        turno: (document.body.innerText || "").includes("18:00") ? "18:00 - Tarde" : "05:00 - Madrugada"
      };
      lista.unshift(novo);
      guardarStorage(lista);
      await sincronizarComServidor(novo);
    }

    await renderPresencasUI();
  };

  window.renderPresencasUI = async function () {
    const box = document.getElementById("presencasModulo");
    if (!box) return;

    const { isAdmin } = detectarContextoPagina();
    const lista = await obterListaPresencas();
    const mesAtual = hojeISO().slice(0, 7);

    if (isAdmin) {
      const filtroTurno = document.getElementById("filtroTurnoPresencas")?.value || "TODOS";
      const filtrados = lista.filter((r) => {
        if (filtroTurno === "TODOS") return true;
        return (r.turno || "").includes(filtroTurno);
      });

      const porAtleta = new Map();
      for (const item of filtrados) {
        const key = (item.email || item.nome || "atleta").toLowerCase();
        const atual = porAtleta.get(key) || {
          nome: item.nome || item.email,
          email: item.email,
          turno: item.turno || "05:00 - Madrugada",
          totalMes: 0,
          ultimaData: item.data || ""
        };
        if ((item.data || "").startsWith(mesAtual)) atual.totalMes += 1;
        if ((item.data || "") > atual.ultimaData) atual.ultimaData = item.data || "";
        porAtleta.set(key, atual);
      }

      const resumo = Array.from(porAtleta.values());
      const alvo = document.getElementById("conteudoPresencas");
      if (!alvo) return;

      if (!resumo.length) {
        alvo.innerHTML = `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">Ainda não existem check-ins registados para o filtro selecionado.</div>`;
        return;
      }

      const hojeMs = new Date(hojeISO() + "T00:00:00").getTime();

      alvo.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          ${resumo.map((a) => {
            const ultimoMs = a.ultimaData ? new Date(a.ultimaData + "T00:00:00").getTime() : hojeMs;
            const diasAusente = Math.max(0, Math.floor((hojeMs - ultimoMs) / 86400000));
            const alertaFalta = diasAusente >= 5;
            return `
              <div class="bg-slate-950 border ${alertaFalta ? "border-amber-500/50" : "border-slate-800"} rounded-xl p-3.5 space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-bold text-white text-sm">${a.nome}</span>
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${alertaFalta ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}">
                    ${a.totalMes} este mês
                  </span>
                </div>
                <div class="text-slate-400">Turno: <span class="text-slate-200">${a.turno}</span></div>
                <div class="${alertaFalta ? "text-amber-300 font-semibold" : "text-slate-400"}">
                  Última presença: ${a.ultimaData || "Sem registo"} ${alertaFalta ? `(${diasAusente}d sem treino)` : ""}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    } else {
      const atleta = obterAtletaAtual();
      const minhasPresencas = lista.filter((r) => (r.email || "").toLowerCase() === atleta.email);
      const doMes = minhasPresencas.filter((r) => (r.data || "").startsWith(mesAtual));
      const metaMensal = 20;
      const pct = Math.min(100, Math.round((doMes.length / metaMensal) * 100));

      const alvo = document.getElementById("conteudoPresencas");
      if (!alvo) return;

      alvo.innerHTML = `
        <div class="space-y-4 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div>
              <div class="text-slate-400">Consistência no mês (${mesAtual})</div>
              <div class="text-xl font-black text-white mt-0.5">${doMes.length} / ${metaMensal} treinos (${pct}%)</div>
            </div>
            <button type="button" onclick="registrarCheckinCrossHitBox('Check-in Manual')" class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs">
              Fazer Check-in de Hoje
            </button>
          </div>
          <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 transition-all" style="width: ${pct}%"></div>
          </div>
          <div class="space-y-1.5">
            <div class="text-slate-400 font-semibold">Histórico recente</div>
            ${
              minhasPresencas.slice(0, 6).map((p) => `
                <div class="flex items-center justify-between bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2 text-slate-300">
                  <span>${p.data} • ${p.hora || ""}</span>
                  <span class="text-emerald-400 font-semibold">${p.origem || "Presença"}</span>
                </div>
              `).join("") || `<div class="text-slate-500">Ainda não tens check-ins registados. Clica em "Fazer Check-in de Hoje".</div>`
            }
          </div>
        </div>
      `;
    }
  };

  const { isAdmin } = detectarContextoPagina();
  const container = document.createElement("section");
  container.id = "presencasModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-sky-500/30 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-sky-400">${isAdmin ? "Presenças & Assiduidade dos Atletas" : "Meu Check-in & Histórico de Treinos"}</h2>
        <p class="text-xs text-slate-400">${isAdmin ? "Acompanha a frequência mensal e identifica atletas ausentes há 5+ dias." : "Regista a tua presença diária e acompanha a tua evolução mensal."}</p>
      </div>
      ${
        isAdmin
          ? `<div class="flex items-center gap-2">
               <select id="filtroTurnoPresencas" onchange="renderPresencasUI()" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
                 <option value="TODOS">Todos os turnos</option>
                 <option value="05:00">Turno 05:00</option>
                 <option value="18:00">Turno 18:00</option>
               </select>
               <button type="button" onclick="renderPresencasUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
             </div>`
          : ""
      }
    </div>
    <div id="conteudoPresencas"></div>
  `;

  const alertasEl = document.getElementById("alertasClinicosModulo");
  const hiitEl = document.getElementById("hiitTimerModulo");
  if (alertasEl && alertasEl.parentNode) {
    alertasEl.parentNode.insertBefore(container, alertasEl);
  } else if (hiitEl && hiitEl.parentNode) {
    hiitEl.parentNode.insertBefore(container, hiitEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidadePresencas() {
    const el = document.getElementById("presencasModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      renderPresencasUI();
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
      aplicarVisibilidadePresencas();
    }
  }

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button, a");
    if (btn) {
      const txt = (btn.textContent || "").trim().toLowerCase();
      if (txt === "sair" || txt === "terminar sessão" || txt === "logout") {
        sessaoAtiva = false;
        aplicarVisibilidadePresencas();
        return;
      }
      if (!detectarContextoPagina().isAdmin && sessaoAtiva) {
        if (txt.includes("aula") || txt.includes("vídeo") || txt.includes("video") || txt.includes("entrar na sala") || txt.includes("assistir")) {
          window.registrarCheckinCrossHitBox("Acesso a Aula / Vídeo");
        }
      }
    }
    setTimeout(avaliarSessao, 150);
    setTimeout(avaliarSessao, 500);
  });

  document.addEventListener("submit", () => {
    setTimeout(avaliarSessao, 200);
    setTimeout(avaliarSessao, 600);
  });

  setInterval(avaliarSessao, 500);
  aplicarVisibilidadePresencas();
})();
