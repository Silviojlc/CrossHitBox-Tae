(function () {
  if (document.getElementById("gestaoTurnosMembrosModulo")) return;

  const KEY_TURNOS = "crosshitbox_turnos_v1";
  const KEY_EXCLUIDOS = "crosshitbox_membros_excluidos_v1";
  const KEY_PERFIS = "crosshitbox_perfis_completos_v1";
  let sessaoAtiva = false;

  const TURNOS_INICIAIS = [
    { id: "TRN-0500", nome: "Madrugada / Choque", horario: "05:00", dias: "Seg a Sex", vagas: 30, notas: "Turno matinal de alta intensidade", ativo: true },
    { id: "TRN-1800", nome: "Tarde / Performance", horario: "18:00", dias: "Seg a Sex", vagas: 30, notas: "Turno principal da tarde", ativo: true }
  ];

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

  async function carregarTurnos() {
    let turnos = lerArray(KEY_TURNOS);
    if (!turnos.length) {
      turnos = TURNOS_INICIAIS.slice();
      gravarArray(KEY_TURNOS, turnos);
    }
    try {
      const r = await fetch("/api/crosshitbox/turnos?_=" + Date.now(), { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.turnos) && d.turnos.length) {
          turnos = d.turnos;
          gravarArray(KEY_TURNOS, turnos);
        }
      }
    } catch {}
    return turnos;
  }

  async function carregarExcluidos() {
    const excl = new Set(lerArray(KEY_EXCLUIDOS).map((e) => String(e).toLowerCase()));
    try {
      const r = await fetch("/api/crosshitbox/membros-excluidos?_=" + Date.now(), { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.excluidos)) {
          d.excluidos.forEach((e) => excl.add(String(e).toLowerCase()));
          gravarArray(KEY_EXCLUIDOS, Array.from(excl));
        }
      }
    } catch {}
    return excl;
  }

  async function carregarMembrosLimpos() {
    const excluidos = await carregarExcluidos();
    let membros = lerArray(KEY_PERFIS);
    try {
      const r = await fetch("/api/crosshitbox/perfis-completos?_=" + Date.now(), { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.perfis) && d.perfis.length) {
          membros = d.perfis;
        }
      }
    } catch {}

    const limpos = membros.filter((m) => {
      const em = (m.email || "").toString().trim().toLowerCase();
      return em && !excluidos.has(em);
    });
    gravarArray(KEY_PERFIS, limpos);
    return limpos;
  }

  window.chbSalvarTurno = async function (ev) {
    if (ev) ev.preventDefault();
    const idEdit = (document.getElementById("trnIdEdit")?.value || "").trim();
    const nome = (document.getElementById("trnNomeInput")?.value || "").trim();
    const horario = (document.getElementById("trnHorarioInput")?.value || "").trim();
    const dias = (document.getElementById("trnDiasInput")?.value || "Seg a Sex").trim();
    const vagas = Number(document.getElementById("trnVagasInput")?.value || 25);
    const notas = (document.getElementById("trnNotasInput")?.value || "").trim();

    if (!nome || !horario) return;

    const turnoObj = {
      id: idEdit || ("TRN-" + Date.now()),
      nome,
      horario,
      dias,
      vagas: Number.isFinite(vagas) && vagas > 0 ? vagas : 25,
      notas,
      ativo: true,
      atualizado_em: new Date().toISOString()
    };

    const atuais = await carregarTurnos();
    const idx = atuais.findIndex((t) => String(t.id) === String(turnoObj.id));
    if (idx >= 0) atuais[idx] = turnoObj;
    else atuais.unshift(turnoObj);
    gravarArray(KEY_TURNOS, atuais);

    try {
      const r = await fetch("/api/crosshitbox/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(turnoObj)
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.turnos)) gravarArray(KEY_TURNOS, d.turnos);
      }
    } catch {}

    window.chbLimparFormTurno();
    await window.renderGestaoTurnosMembrosUI();
  };

  window.chbPrepararEditarTurno = async function (id) {
    const turnos = await carregarTurnos();
    const t = turnos.find((x) => String(x.id) === String(id));
    if (!t) return;
    if (document.getElementById("trnIdEdit")) document.getElementById("trnIdEdit").value = t.id;
    if (document.getElementById("trnNomeInput")) document.getElementById("trnNomeInput").value = t.nome || "";
    if (document.getElementById("trnHorarioInput")) document.getElementById("trnHorarioInput").value = t.horario || "";
    if (document.getElementById("trnDiasInput")) document.getElementById("trnDiasInput").value = t.dias || "Seg a Sex";
    if (document.getElementById("trnVagasInput")) document.getElementById("trnVagasInput").value = t.vagas || 25;
    if (document.getElementById("trnNotasInput")) document.getElementById("trnNotasInput").value = t.notas || "";
    if (document.getElementById("trnBtnSubmit")) document.getElementById("trnBtnSubmit").textContent = "Guardar Alteração";
  };

  window.chbLimparFormTurno = function () {
    if (document.getElementById("trnIdEdit")) document.getElementById("trnIdEdit").value = "";
    if (document.getElementById("trnNomeInput")) document.getElementById("trnNomeInput").value = "";
    if (document.getElementById("trnHorarioInput")) document.getElementById("trnHorarioInput").value = "";
    if (document.getElementById("trnDiasInput")) document.getElementById("trnDiasInput").value = "Seg a Sex";
    if (document.getElementById("trnVagasInput")) document.getElementById("trnVagasInput").value = "25";
    if (document.getElementById("trnNotasInput")) document.getElementById("trnNotasInput").value = "";
    if (document.getElementById("trnBtnSubmit")) document.getElementById("trnBtnSubmit").textContent = "Criar Turno";
  };

  window.chbExcluirTurno = async function (id) {
    if (!id) return;
    const filtrados = (await carregarTurnos()).filter((t) => String(t.id) !== String(id));
    gravarArray(KEY_TURNOS, filtrados);

    try {
      const r = await fetch("/api/crosshitbox/turnos/" + encodeURIComponent(id), { method: "DELETE" });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.turnos)) gravarArray(KEY_TURNOS, d.turnos);
      }
    } catch {}

    await window.renderGestaoTurnosMembrosUI();
  };

  window.chbAlterarTurnoMembro = async function (email, novoTurnoRotulo) {
    const em = (email || "").toLowerCase();
    if (!em || !novoTurnoRotulo) return;

    const membros = await carregarMembrosLimpos();
    const idx = membros.findIndex((m) => (m.email || "").toLowerCase() === em);
    if (idx >= 0) {
      membros[idx].turno = novoTurnoRotulo;
      membros[idx].horario = novoTurnoRotulo;
      gravarArray(KEY_PERFIS, membros);
      try {
        await fetch("/api/crosshitbox/perfis-completos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(membros[idx])
        });
      } catch {}
    }
    await window.renderGestaoTurnosMembrosUI();
  };

  window.chbExcluirMembroDefinitivo = async function (email) {
    const em = (email || "").toString().trim().toLowerCase();
    if (!em) return;

    const exclSet = new Set(lerArray(KEY_EXCLUIDOS).map((x) => String(x).toLowerCase()));
    exclSet.add(em);
    gravarArray(KEY_EXCLUIDOS, Array.from(exclSet));

    const restam = lerArray(KEY_PERFIS).filter((m) => (m.email || "").toLowerCase() !== em);
    gravarArray(KEY_PERFIS, restam);

    // Limpa também qualquer referência em caches locais comuns
    for (const k of ["crosshitbox_presencas_v1", "crosshitbox_pagamentos_v1", "crosshitbox_relatorios_perf_v1"]) {
      const arr = lerArray(k).filter((item) => (item.email || "").toLowerCase() !== em);
      gravarArray(k, arr);
    }

    try {
      await fetch("/api/crosshitbox/membros/" + encodeURIComponent(em), { method: "DELETE" });
    } catch {}

    await window.renderGestaoTurnosMembrosUI();
  };

  window.renderGestaoTurnosMembrosUI = async function () {
    const alvo = document.getElementById("conteudoTurnosMembros");
    if (!alvo) return;
    if (!detectarAdmin()) return;

    const [turnos, membros] = await Promise.all([carregarTurnos(), carregarMembrosLimpos()]);

    alvo.innerHTML = `
      <div class="space-y-6 text-xs">
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-amber-400 uppercase tracking-wide">Criar / Editar Turno de Aula</span>
            <button type="button" onclick="chbLimparFormTurno()" class="text-slate-400 hover:text-white underline">Limpar campos</button>
          </div>
          <form onsubmit="chbSalvarTurno(event)" class="grid grid-cols-1 md:grid-cols-6 gap-2.5">
            <input id="trnIdEdit" type="hidden">
            <input id="trnNomeInput" type="text" required placeholder="Nome do turno (ex: Choque Manhã)" class="md:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            <input id="trnHorarioInput" type="text" required placeholder="Hora (ex: 06:30 ou 19:00)" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            <input id="trnDiasInput" type="text" placeholder="Dias (ex: Seg a Sex)" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            <input id="trnVagasInput" type="number" min="1" max="200" placeholder="Vagas" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            <button id="trnBtnSubmit" type="submit" class="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-2">Criar Turno</button>
            <input id="trnNotasInput" type="text" placeholder="Observações do turno (opcional)" class="md:col-span-6 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200">
          </form>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            ${
              turnos.length
                ? turnos.map((t) => `
                    <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
                      <div>
                        <div class="flex items-center justify-between gap-2">
                          <span class="font-black text-white text-sm">${t.horario} — ${t.nome}</span>
                          <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]">${t.vagas || 25} vagas</span>
                        </div>
                        <div class="text-slate-400 mt-1">${t.dias || "Seg a Sex"}${t.notas ? " • " + t.notas : ""}</div>
                      </div>
                      <div class="flex items-center gap-2 pt-1 border-t border-slate-800">
                        <button type="button" onclick="chbPrepararEditarTurno('${t.id}')" class="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold">Editar</button>
                        <button type="button" onclick="chbExcluirTurno('${t.id}')" class="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold">Excluir Turno</button>
                      </div>
                    </div>
                  `).join("")
                : `<div class="text-slate-400">Nenhum turno registado. Cria um novo turno acima.</div>`
            }
          </div>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-sky-400 uppercase tracking-wide">Membros Ativos — Alterar Turno ou Excluir Definitivamente (${membros.length})</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${
              membros.length
                ? membros.map((m) => {
                    const em = (m.email || "").toLowerCase();
                    const turnoAtual = m.turno || m.horario || "";
                    return `
                      <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
                        <div class="flex items-center justify-between gap-2">
                          <div class="min-w-0">
                            <div class="font-bold text-white text-sm truncate">${m.nome || em}</div>
                            <div class="text-slate-400 truncate">${em}${m.nif ? " • NIF: " + m.nif : ""}</div>
                          </div>
                          <button type="button" onclick="chbExcluirMembroDefinitivo('${em}')" class="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0">Excluir Membro</button>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-slate-400 shrink-0">Turno:</span>
                          <select onchange="chbAlterarTurnoMembro('${em}', this.value)" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-semibold">
                            <option value="">Selecionar turno...</option>
                            ${turnos.map((tr) => {
                              const rotulo = `${tr.horario} - ${tr.nome}`;
                              return `<option value="${rotulo}" ${turnoAtual === rotulo || turnoAtual.includes(tr.horario) ? "selected" : ""}>${rotulo}</option>`;
                            }).join("")}
                          </select>
                        </div>
                      </div>
                    `;
                  }).join("")
                : `<div class="col-span-full text-slate-400">Nenhum membro ativo na lista.</div>`
            }
          </div>
        </div>
      </div>
    `;
  };

  if (!detectarAdmin()) return;

  const container = document.createElement("section");
  container.id = "gestaoTurnosMembrosModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-amber-500/40 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-amber-400">Gestão de Turnos (Criar, Editar, Alterar, Excluir) &amp; Remoção de Membros</h2>
        <p class="text-xs text-slate-400">Cria novos horários de aula, edita ou apaga turnos, muda o turno de atletas e remove membros de forma definitiva.</p>
      </div>
      <button type="button" onclick="renderGestaoTurnosMembrosUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
    </div>
    <div id="conteudoTurnosMembros"></div>
  `;

  const refEl = document.getElementById("modoComandoModulo") || document.body.firstChild;
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("gestaoTurnosMembrosModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.renderGestaoTurnosMembrosUI();
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
