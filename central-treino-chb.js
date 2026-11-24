(function () {
  if (window.__chbCentralTreino) return;
  window.__chbCentralTreino = true;

  const KEY_TREINOS = "crosshitbox_central_treino_v1";

  const PROGRAMAS_NTC = [
    {
      id: "ntc-base-tae",
      nome: "Base & Condicionamento Tae (4 Semanas)",
      foco: "Resistência aeróbia + base atlética",
      nivel: "Todos os níveis",
      sessoes: 12,
      descricao: "Combina blocos de resistência contínua, coordenação de socos/joelhadas e estabilidade articular."
    },
    {
      id: "ntc-forca-potencia",
      nome: "Força Funcional & Potência Explosiva",
      foco: "Força muscular, potência e controlo",
      nivel: "Intermédio / Avançado",
      sessoes: 16,
      descricao: "Foco em padrões multiarticulares, velocidade de execução e transferência para treinos intensos."
    },
    {
      id: "ntc-mobilidade-core",
      nome: "Mobilidade, Core & Recuperação Ativa",
      foco: "Amplitude, postura e recuperação",
      nivel: "Iniciante / Todos",
      sessoes: 8,
      descricao: "Sessões de baixo impacto para soltar anca, ombros e coluna e preparar o corpo para o próximo ciclo."
    }
  ];

  const AULAS_CARDIO_FITON = [
    {
      id: "fit-hiit-20",
      titulo: "HIIT Cardio em Casa — Sem Equipamento (20 min)",
      duracao: 20,
      intensidade: "Alta",
      estilo: "Cardio em Casa / FitOn",
      blocos: "40s trabalho / 20s descanso • Burpees, agachamentos com salto, alpinistas, polichinelos"
    },
    {
      id: "fit-tae-box-30",
      titulo: "Cardio Boxe & Tae Flow (30 min)",
      duracao: 30,
      intensidade: "Média-Alta",
      estilo: "FitOn & CrossHitBox Tae",
      blocos: "Combinações de jab-direto, joelhadas, deslocamentos laterais e rounds de 3 min"
    },
    {
      id: "fit-queima-15",
      titulo: "Queima Rápida & Core Metabólico (15 min)",
      duracao: 15,
      intensidade: "Alta",
      estilo: "Treino em Casa Express",
      blocos: "Circuito contínuo focado em frequência cardíaca elevada e abdómen"
    },
    {
      id: "fit-baixo-impacto-25",
      titulo: "Cardio Baixo Impacto & Ritmo Constante (25 min)",
      duracao: 25,
      intensidade: "Moderada",
      estilo: "FitOn Low-Impact",
      blocos: "Ideal para articulações sensíveis, dias de recuperação ativa ou início de rotina"
    }
  ];

  function lerEstado() {
    try {
      const raw = localStorage.getItem(KEY_TREINOS);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        return {
          programaAtivo: parsed.programaAtivo || PROGRAMAS_NTC[0].id,
          sessoesConcluidas: Array.isArray(parsed.sessoesConcluidas) ? parsed.sessoesConcluidas : [],
          corridas: Array.isArray(parsed.corridas) ? parsed.corridas : [],
          aulasFeitas: Array.isArray(parsed.aulasFeitas) ? parsed.aulasFeitas : [],
          filtroDuracao: parsed.filtroDuracao || "todas",
          abaInterna: parsed.abaInterna || "corrida_caminhada"
        };
      }
    } catch {}
    return {
      programaAtivo: PROGRAMAS_NTC[0].id,
      sessoesConcluidas: [],
      corridas: [],
      aulasFeitas: [],
      filtroDuracao: "todas",
      abaInterna: "corrida_caminhada"
    };
  }

  function guardarEstado(st) {
    try {
      localStorage.setItem(KEY_TREINOS, JSON.stringify(st));
    } catch {}
  }

  let timerInterval = null;
  let timerSegundos = 0;
  let timerRodando = false;

  window.chbTreinoAba = function (aba) {
    const st = lerEstado();
    st.abaInterna = aba;
    guardarEstado(st);
    renderizarCentralTreino();
  };

  window.chbTreinoFiltroDuracao = function (dur) {
    const st = lerEstado();
    st.filtroDuracao = dur;
    guardarEstado(st);
    renderizarCentralTreino();
  };

  window.chbSelecionarProgramaNTC = function (idProg) {
    const st = lerEstado();
    st.programaAtivo = idProg;
    guardarEstado(st);
    renderizarCentralTreino();
  };

  window.chbConcluirSessaoNTC = function (idProg) {
    const st = lerEstado();
    st.sessoesConcluidas.push({
      programaId: idProg,
      data: new Date().toISOString().slice(0, 10)
    });
    guardarEstado(st);
    renderizarCentralTreino();
  };

  window.chbRegistarCorridaCaminhada = function (ev) {
    if (ev) ev.preventDefault();
    const tipoEl = document.getElementById("chbRunTipo");
    const distEl = document.getElementById("chbRunDistancia");
    const minEl = document.getElementById("chbRunMinutos");
    const notaEl = document.getElementById("chbRunNota");

    const tipo = (tipoEl && tipoEl.value) || "Corrida";
    const distancia = Math.max(0.1, parseFloat((distEl && distEl.value) || "3") || 3);
    const minutos = Math.max(1, parseFloat((minEl && minEl.value) || "25") || 25);
    const nota = ((notaEl && notaEl.value) || "").trim();

    const ritmoNum = minutos / distancia;
    const ritmoMin = Math.floor(ritmoNum);
    const ritmoSeg = Math.round((ritmoNum - ritmoMin) * 60);
    const ritmoFormatado = `${ritmoMin}'${String(ritmoSeg).padStart(2, "0")}" /km`;
    const fatorKcal = tipo === "Caminhada" ? 52 : 72;
    const calorias = Math.round(distancia * fatorKcal);

    const st = lerEstado();
    st.corridas.unshift({
      id: Date.now(),
      tipo,
      distancia: distancia.toFixed(2),
      minutos: minutos.toFixed(0),
      ritmo: ritmoFormatado,
      calorias,
      nota,
      data: new Date().toISOString().slice(0, 10)
    });
    st.corridas = st.corridas.slice(0, 25);
    guardarEstado(st);

    if (distEl) distEl.value = "";
    if (minEl) minEl.value = "";
    if (notaEl) notaEl.value = "";
    renderizarCentralTreino();
  };

  window.chbConcluirAulaCardio = function (aulaId, titulo, duracao, caloriasEst) {
    const st = lerEstado();
    st.aulasFeitas.unshift({
      id: Date.now(),
      aulaId,
      titulo,
      duracao,
      calorias: caloriasEst || duracao * 9,
      data: new Date().toISOString().slice(0, 10)
    });
    st.aulasFeitas = st.aulasFeitas.slice(0, 25);
    guardarEstado(st);
    renderizarCentralTreino();
  };

  window.chbTimerTreinoToggle = function () {
    const displayEl = document.getElementById("chbTimerDisplay");
    if (timerRodando) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRodando = false;
    } else {
      timerRodando = true;
      timerInterval = setInterval(() => {
        timerSegundos += 1;
        const m = String(Math.floor(timerSegundos / 60)).padStart(2, "0");
        const s = String(timerSegundos % 60).padStart(2, "0");
        if (displayEl) displayEl.textContent = `${m}:${s}`;
      }, 1000);
    }
    renderizarCentralTreino();
  };

  window.chbTimerTreinoReset = function () {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRodando = false;
    timerSegundos = 0;
    guardarEstado(lerEstado());
    renderizarCentralTreino();
  };

  function renderizarCentralTreino() {
    if (!document.body) return;
    let sec = document.getElementById("chbCentralTreinoSecao");
    if (!sec) {
      sec = document.createElement("section");
      sec.id = "chbCentralTreinoSecao";
      sec.className = "max-w-6xl mx-auto my-5 px-3 sm:px-6";
      const mainEl = document.querySelector("main");
      if (mainEl) {
        mainEl.appendChild(sec);
      } else {
        document.body.appendChild(sec);
      }
    }

    const st = lerEstado();
    const totalKm = st.corridas.reduce((acc, r) => acc + (parseFloat(r.distancia) || 0), 0);
    const totalKcalRun = st.corridas.reduce((acc, r) => acc + (parseInt(r.calorias, 10) || 0), 0);
    const totalMinCardio = st.aulasFeitas.reduce((acc, a) => acc + (parseInt(a.duracao, 10) || 0), 0);
    const totalKcalCardio = st.aulasFeitas.reduce((acc, a) => acc + (parseInt(a.calorias, 10) || 0), 0);

    const mTimer = String(Math.floor(timerSegundos / 60)).padStart(2, "0");
    const sTimer = String(timerSegundos % 60).padStart(2, "0");

    const aulasFiltradas = AULAS_CARDIO_FITON.filter((a) => {
      if (st.filtroDuracao === "todas") return true;
      return String(a.duracao) === String(st.filtroDuracao);
    });

    sec.innerHTML = `
      <div class="bg-slate-900/95 border border-amber-500/35 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5 text-xs">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
              CrossHitBox Tae • Nike Training Club • Adidas Running • FitOn &amp; Cardio em Casa
            </div>
            <h2 class="text-lg sm:text-xl font-black text-white mt-0.5">
              Central Completa de Treino, Corrida, Caminhada &amp; Cardio em Casa
            </h2>
            <p class="text-slate-400 mt-0.5">
              Programas guiados, registo de corrida e caminhada com ritmo e calorias, e aulas cardio em casa com cronómetro.
            </p>
          </div>

          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 shrink-0">
            <div>
              <div class="text-[10px] uppercase text-slate-400 font-bold">Cronómetro de Sessão</div>
              <div id="chbTimerDisplay" class="text-base font-black text-emerald-400">${mTimer}:${sTimer}</div>
            </div>
            <button type="button" onclick="chbTimerTreinoToggle()" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">
              ${timerRodando ? "Pausar" : "Iniciar"}
            </button>
            <button type="button" onclick="chbTimerTreinoReset()" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold">
              Zerar
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-[10px] uppercase text-slate-400">Corrida &amp; Caminhada</div>
            <div class="text-lg font-black text-white mt-0.5">${totalKm.toFixed(1)} km</div>
            <div class="text-[11px] text-slate-400">${st.corridas.length} registo(s)</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-[10px] uppercase text-slate-400">Aulas Cardio / FitOn</div>
            <div class="text-lg font-black text-amber-400 mt-0.5">${st.aulasFeitas.length}</div>
            <div class="text-[11px] text-slate-400">${totalMinCardio} min acumulados</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-[10px] uppercase text-slate-400">Programas NTC</div>
            <div class="text-lg font-black text-sky-400 mt-0.5">${st.sessoesConcluidas.length}</div>
            <div class="text-[11px] text-slate-400">sessões concluídas</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="text-[10px] uppercase text-slate-400">Calorias Estimadas</div>
            <div class="text-lg font-black text-emerald-400 mt-0.5">${totalKcalRun + totalKcalCardio} kcal</div>
            <div class="text-[11px] text-slate-400">total registado</div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="chbTreinoAba('corrida_caminhada')" class="px-3.5 py-2 rounded-xl font-bold ${
            st.abaInterna === "corrida_caminhada" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }">
            Corrida &amp; Caminhada (Adidas Running)
          </button>
          <button type="button" onclick="chbTreinoAba('cardio_fiton')" class="px-3.5 py-2 rounded-xl font-bold ${
            st.abaInterna === "cardio_fiton" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }">
            Cardio em Casa &amp; FitOn
          </button>
          <button type="button" onclick="chbTreinoAba('programas_ntc')" class="px-3.5 py-2 rounded-xl font-bold ${
            st.abaInterna === "programas_ntc" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }">
            Programas &amp; Força (Nike Training Club)
          </button>
        </div>

        ${
          st.abaInterna === "corrida_caminhada"
            ? `
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <form onsubmit="chbRegistarCorridaCaminhada(event)" class="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div class="font-black text-white text-sm">Registar Corrida ou Caminhada</div>
              <div>
                <label class="block text-[11px] font-bold text-slate-300 mb-1">Modalidade</label>
                <select id="chbRunTipo" class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white">
                  <option value="Corrida">Corrida (Rua / Trilha / Passadeira)</option>
                  <option value="Caminhada">Caminhada Ativa / Marcha</option>
                  <option value="Intervalado">Treino Intervalado / Tiros</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-bold text-slate-300 mb-1">Distância (km)</label>
                  <input id="chbRunDistancia" type="number" step="0.05" min="0.1" required placeholder="ex: 4.5" class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-300 mb-1">Tempo (min)</label>
                  <input id="chbRunMinutos" type="number" step="1" min="1" required placeholder="ex: 30" class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white">
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-300 mb-1">Percurso / Observação</label>
                <input id="chbRunNota" type="text" placeholder="ex: Prainha até Quebra Canela" class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white">
              </div>
              <button type="submit" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">
                Guardar Sessão de Corrida / Caminhada
              </button>
            </form>

            <div class="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div class="font-black text-white text-sm">Histórico de Corrida &amp; Caminhada</div>
              ${
                st.corridas.length
                  ? st.corridas
                      .map(
                        (r) => `
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <div>
                      <div class="font-bold text-white">${r.tipo} • ${r.distancia} km em ${r.minutos} min</div>
                      <div class="text-[11px] text-slate-400">Ritmo: <span class="text-amber-400 font-bold">${r.ritmo}</span> • ${r.calorias} kcal • ${r.data}${r.nota ? " • " + r.nota : ""}</div>
                    </div>
                  </div>
                `
                      )
                      .join("")
                  : `<div class="text-slate-400 py-4">Ainda não há corridas ou caminhadas registadas. Regista a primeira ao lado.</div>`
              }
            </div>
          </div>
        `
            : st.abaInterna === "cardio_fiton"
            ? `
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="font-black text-white text-sm">Aulas Cardio em Casa &amp; Estilo FitOn</div>
              <div class="flex flex-wrap gap-1.5">
                ${["todas", "15", "20", "25", "30"]
                  .map(
                    (d) => `
                  <button type="button" onclick="chbTreinoFiltroDuracao('${d}')" class="px-2.5 py-1 rounded-lg font-bold ${
                    st.filtroDuracao === d ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                  }">${d === "todas" ? "Todas as Durações" : d + " min"}</button>
                `
                  )
                  .join("")}
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${aulasFiltradas
                .map(
                  (a) => `
                <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold text-[10px]">${a.estilo}</span>
                      <span class="text-slate-300 font-bold text-[11px]">${a.duracao} min • Intensidade ${a.intensidade}</span>
                    </div>
                    <div class="font-black text-white text-sm">${a.titulo}</div>
                    <p class="text-slate-400 text-[11px]">${a.blocos}</p>
                  </div>
                  <button type="button" onclick="chbConcluirAulaCardio('${a.id}', '${a.titulo.replace(/'/g, "")}', ${a.duracao}, ${a.duracao * 10})" class="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black">
                    Concluir Aula Cardio (+${a.duracao} min)
                  </button>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            ${PROGRAMAS_NTC.map((p) => {
              const feitos = st.sessoesConcluidas.filter((x) => x.programaId === p.id).length;
              const ativo = st.programaAtivo === p.id;
              return `
                <div class="bg-slate-950 border ${ativo ? "border-amber-500" : "border-slate-800"} rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div class="space-y-1.5">
                    <div class="text-[10px] font-extrabold uppercase text-amber-400">${p.nivel}</div>
                    <div class="font-black text-white text-sm">${p.nome}</div>
                    <div class="text-[11px] text-sky-300 font-semibold">${p.foco}</div>
                    <p class="text-slate-400 text-[11px]">${p.descricao}</p>
                    <div class="text-[11px] text-slate-300 font-bold pt-1">Progresso: ${feitos} / ${p.sessoes} sessões</div>
                  </div>
                  <div class="flex gap-2">
                    <button type="button" onclick="chbSelecionarProgramaNTC('${p.id}')" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">
                      ${ativo ? "Programa Ativo" : "Selecionar"}
                    </button>
                    <button type="button" onclick="chbConcluirSessaoNTC('${p.id}')" class="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">
                      +1 Sessão
                    </button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `
        }
      </div>
    `;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(renderizarCentralTreino, 350));
  } else {
    setTimeout(renderizarCentralTreino, 350);
  }
})();
