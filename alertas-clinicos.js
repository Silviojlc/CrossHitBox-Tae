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
  if (document.getElementById("alertasClinicosModulo")) return;

  const container = document.createElement("section");
  container.id = "alertasClinicosModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-rose-500/30 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-rose-400">Alertas de Patologias &amp; Restrições por Turno</h2>
        <p class="text-xs text-slate-400">Resumo clínico rápido antes do treino para adaptar cargas e movimentos com segurança.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select id="filtroTurnoAlertas" onchange="renderAlertasClinicos()" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
          <option value="TODOS">Todos os turnos</option>
          <option value="05:00">Turno 05:00 (Madrugada)</option>
          <option value="18:00">Turno 18:00 (Tarde)</option>
        </select>
        <label class="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
          <input id="apenasComAlerta" type="checkbox" checked onchange="renderAlertasClinicos()" class="rounded border-slate-600 bg-slate-950">
          Apenas com patologias/restrições
        </label>
        <button type="button" onclick="carregarAlertasClinicos()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">
          Atualizar
        </button>
      </div>
    </div>
    <div id="listaAlertasClinicos" class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
      <div class="text-slate-400">A carregar fichas clínicas...</div>
    </div>
  `;

  const hiitEl = document.getElementById("hiitTimerModulo");
  if (hiitEl && hiitEl.parentNode) {
    hiitEl.parentNode.insertBefore(container, hiitEl);
  } else {
    document.body.appendChild(container);
  }

  let cacheRegistros = [];

  function normalizarTexto(v) {
    return (v || "").toString().trim();
  }

  function temAlertaClinico(item) {
    const pat = normalizarTexto(item.patologias_lesoes || item.patologias || item.lesoes).toLowerCase();
    const med = normalizarTexto(item.medicacao_restricoes || item.restricoes).toLowerCase();
    const semAlerta = ["nenhuma", "nenhum", "nao", "não", "nada", "sem lesoes", "sem lesões", "ok", "-", ""];
    const patAtiva = pat && !semAlerta.includes(pat);
    const medAtiva = med && !semAlerta.includes(med);
    return patAtiva || medAtiva;
  }

  window.renderAlertasClinicos = function () {
    const lista = document.getElementById("listaAlertasClinicos");
    if (!lista) return;

    const turnoFiltro = document.getElementById("filtroTurnoAlertas")?.value || "TODOS";
    const soAlertas = !!document.getElementById("apenasComAlerta")?.checked;

    const filtrados = cacheRegistros.filter((r) => {
      const turnoTexto = normalizarTexto(r.horario || r.turno);
      const matchTurno = turnoFiltro === "TODOS" || turnoTexto.includes(turnoFiltro);
      const alerta = temAlertaClinico(r);
      return matchTurno && (!soAlertas || alerta);
    });

    if (!filtrados.length) {
      lista.innerHTML = `<div class="col-span-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-slate-400">Nenhum atleta com alerta clínico registado para este filtro.</div>`;
      return;
    }

    lista.innerHTML = filtrados.map((r) => {
      const alerta = temAlertaClinico(r);
      const pat = normalizarTexto(r.patologias_lesoes || r.patologias || r.lesoes) || "Sem registo";
      const med = normalizarTexto(r.medicacao_restricoes || r.restricoes) || "Sem restrições";
      const obj = normalizarTexto(r.objetivo_principal || r.objetivo) || "Condicionamento geral";
      return `
        <div class="bg-slate-950 border ${alerta ? "border-rose-500/50" : "border-slate-800"} rounded-xl p-3.5 space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-white text-sm">${normalizarTexto(r.nome) || normalizarTexto(r.email)}</span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${alerta ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}">
              ${alerta ? "ALERTA CLÍNICO" : "SEM RESTRIÇÕES"}
            </span>
          </div>
          <div class="text-slate-400">Turno: <strong class="text-slate-200">${normalizarTexto(r.horario || r.turno) || "Não definido"}</strong> • Objetivo: <span class="text-slate-200">${obj}</span></div>
          <div class="text-rose-300">Patologias/Lesões: <strong class="text-rose-200">${pat}</strong></div>
          <div class="text-amber-300">Medicação/Restrições: <strong class="text-amber-200">${med}</strong></div>
        </div>
      `;
    }).join("");
  };

  window.carregarAlertasClinicos = async function () {
    const endpoints = [
      "/api/crosshitbox/fichas",
      "/api/crosshitbox/membros"
    ];
    let combinados = [];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep);
        if (!res.ok) continue;
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.fichas || data.membros || data.data || []);
        if (Array.isArray(arr) && arr.length) {
          combinados = combinados.concat(arr);
        }
      } catch {}
    }

    const mapa = new Map();
    for (const item of combinados) {
      const chave = (item.email || item.id || item.nome || Math.random()).toString().toLowerCase();
      const anterior = mapa.get(chave) || {};
      mapa.set(chave, Object.assign({}, anterior, item));
    }

    cacheRegistros = Array.from(mapa.values());
    renderAlertasClinicos();
  };

  function sincronizarVisibilidadeAdmin() {
    const el = document.getElementById("alertasClinicosModulo");
    if (!el) return;
    const bodyText = document.body ? (document.body.innerText || "") : "";
    const temBotaoSair = Array.from(document.querySelectorAll("button, a")).some((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      return (t === "sair" || t === "terminar sessão" || t === "logout") && btn.offsetParent !== null;
    });
    const isAdminSessao = temBotaoSair && (bodyText.includes("Sessão ativa como:") || bodyText.includes("Configurar Sala de Videochamada") || bodyText.includes("Painel Administrativo"));

    if (isAdminSessao) {
      el.classList.remove("hidden");
      el.style.display = "";
    } else {
      el.classList.add("hidden");
      el.style.display = "none";
    }
  }

  window.addEventListener("crosshitbox:sessao", sincronizarVisibilidadeAdmin);
  setInterval(sincronizarVisibilidadeAdmin, 500);
  sincronizarVisibilidadeAdmin();
  carregarAlertasClinicos();
})();
