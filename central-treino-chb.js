(function () {
  if (window.__chbCentralTreino) return;
  window.__chbCentralTreino = true;

  const KEY_TREINOS = "crosshitbox_central_treino_v1";
  const KEY_VIDEOS_TREINOS = "crosshitbox_videos_programas_v1";

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

  const ITENS_CORRIDA_VIDEO = [
    {
      id: "run-tecnica-aquecimento",
      titulo: "Aquecimento Dinâmico & Técnica de Corrida / Caminhada",
      duracao: 15,
      estilo: "Corrida & Caminhada (Adidas Running)",
      blocos: "Mobilidade de tornozelos/anca, cadência de passada e respiração contínua"
    }
  ];

  let wakeLockSentinela = null;
  let telaSempreAtiva = true;

  async function ativarWakeLockSePossivel() {
    if (!telaSempreAtiva) return;
    try {
      if ("wakeLock" in navigator && navigator.wakeLock && typeof navigator.wakeLock.request === "function") {
        if (!wakeLockSentinela) {
          wakeLockSentinela = await navigator.wakeLock.request("screen");
          wakeLockSentinela.addEventListener("release", () => {
            wakeLockSentinela = null;
          });
        }
      }
    } catch {}
  }

  function libertarWakeLock() {
    try {
      if (wakeLockSentinela && typeof wakeLockSentinela.release === "function") {
        wakeLockSentinela.release();
      }
    } catch {}
    wakeLockSentinela = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const st = lerEstado();
      if (st.videoAbertoId && telaSempreAtiva) {
        ativarWakeLockSePossivel();
      }
    }
  });

  function ehAdmin() {
    return (window.location.pathname || "").toLowerCase().includes("admin");
  }

  function lerVideosTreinos() {
    try {
      const raw = localStorage.getItem(KEY_VIDEOS_TREINOS);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        return {
          mapa: parsed.mapa && typeof parsed.mapa === "object" ? parsed.mapa : {},
          extras: Array.isArray(parsed.extras) ? parsed.extras : []
        };
      }
    } catch {}
    return { mapa: {}, extras: [] };
  }

  function guardarVideosTreinos(dados) {
    try {
      localStorage.setItem(KEY_VIDEOS_TREINOS, JSON.stringify(dados));
    } catch {}
  }

  function converterParaEmbed(urlRaw) {
    const url = String(urlRaw || "").trim();
    if (!url) return null;

    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?.*?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    if (ytMatch && ytMatch[1]) {
      return { tipo: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`, original: url };
    }

    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return { tipo: "iframe", src: `https://drive.google.com/file/d/${driveMatch[1]}/preview`, original: url };
    }

    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || url.startsWith("data:video/")) {
      return { tipo: "video", src: url, original: url };
    }

    return { tipo: "link", src: url, original: url };
  }

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
          abaInterna: parsed.abaInterna || "cardio_fiton",
          videoAbertoId: parsed.videoAbertoId || "",
          videoAbertoTitulo: parsed.videoAbertoTitulo || ""
        };
      }
    } catch {}
    return {
      programaAtivo: PROGRAMAS_NTC[0].id,
      sessoesConcluidas: [],
      corridas: [],
      aulasFeitas: [],
      filtroDuracao: "todas",
      abaInterna: "cardio_fiton",
      videoAbertoId: "",
      videoAbertoTitulo: ""
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

  window.chbAbrirVideoTreino = function (itemId, titulo) {
    const st = lerEstado();
    st.videoAbertoId = itemId;
    st.videoAbertoTitulo = titulo || "Vídeo do Treino";
    guardarEstado(st);
    ativarWakeLockSePossivel();
    renderizarCentralTreino();
    const player = document.getElementById("chbPlayerVideoTreinoBox");
    if (player && typeof player.scrollIntoView === "function") {
      player.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  window.chbFecharVideoTreino = function () {
    const st = lerEstado();
    st.videoAbertoId = "";
    st.videoAbertoTitulo = "";
    guardarEstado(st);
    libertarWakeLock();
    if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
    renderizarCentralTreino();
  };

  window.chbAlternarFullEcranVideo = function () {
    const stage = document.getElementById("chbVideoStageFull");
    if (!stage) return;
    ativarWakeLockSePossivel();
    if (!document.fullscreenElement) {
      if (typeof stage.requestFullscreen === "function") {
        stage.requestFullscreen().catch(() => {});
      }
    } else if (typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  };

  window.chbAlternarTelaSempreAtiva = function () {
    telaSempreAtiva = !telaSempreAtiva;
    if (telaSempreAtiva) {
      ativarWakeLockSePossivel();
    } else {
      libertarWakeLock();
    }
    renderizarCentralTreino();
  };

  window.chbGuardarVideoAssociado = function (ev) {
    if (ev) ev.preventDefault();
    const selEl = document.getElementById("chbVidDestinoId");
    const urlEl = document.getElementById("chbVidUrlInput");
    const destId = selEl ? selEl.value : "";
    const urlVal = urlEl ? urlEl.value.trim() : "";
    if (!destId) return;

    const dados = lerVideosTreinos();
    if (urlVal) {
      dados.mapa[destId] = urlVal;
    } else {
      delete dados.mapa[destId];
    }
    guardarVideosTreinos(dados);
    if (urlEl) urlEl.value = "";
    renderizarCentralTreino();
  };

  window.chbAdicionarAulaVideoExtra = function (ev) {
    if (ev) ev.preventDefault();
    const titEl = document.getElementById("chbExtraTitulo");
    const catEl = document.getElementById("chbExtraCategoria");
    const durEl = document.getElementById("chbExtraDuracao");
    const urlEl = document.getElementById("chbExtraUrl");

    const titulo = (titEl && titEl.value.trim()) || "";
    const categoria = (catEl && catEl.value) || "Cardio em Casa / FitOn";
    const duracao = Math.max(5, parseInt((durEl && durEl.value) || "20", 10) || 20);
    const url = (urlEl && urlEl.value.trim()) || "";
    if (!titulo || !url) return;

    const novoId = "extra-" + Date.now();
    const dados = lerVideosTreinos();
    dados.extras.unshift({
      id: novoId,
      titulo,
      duracao,
      intensidade: "Guiado por Vídeo",
      estilo: categoria,
      blocos: "Aula em vídeo adicionada pelo treinador"
    });
    dados.mapa[novoId] = url;
    guardarVideosTreinos(dados);

    if (titEl) titEl.value = "";
    if (urlEl) urlEl.value = "";
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
      ativarWakeLockSePossivel();
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
    renderizarCentralTreino();
  };

  function renderizarPlayerVideo(st, dadosVideos) {
    if (!st.videoAbertoId) return "";
    const urlSalva = dadosVideos.mapa[st.videoAbertoId] || "";
    const embed = converterParaEmbed(urlSalva);

    let conteudoPlayer = "";
    if (!embed) {
      const buscaYt = `https://www.youtube.com/results?search_query=${encodeURIComponent("CrossHitBox Tae " + st.videoAbertoTitulo)}`;
      conteudoPlayer = `
        <div class="rounded-xl overflow-hidden border border-slate-800 bg-black space-y-2 p-2">
          <video src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" controls playsinline class="w-full max-h-[65vh] rounded-lg bg-black"></video>
          <div class="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-300">
            <span>Reprodução integrada no programa • Usa Full Ecrã para expandir</span>
            <a href="${buscaYt}" target="_blank" rel="noopener" class="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">
              Ver Mais no YouTube
            </a>
          </div>
        </div>
      `;
    } else if (embed.tipo === "iframe") {
      conteudoPlayer = `
        <div class="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-black">
          <iframe src="${embed.src}" title="${st.videoAbertoTitulo}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>
        </div>
      `;
    } else if (embed.tipo === "video") {
      conteudoPlayer = `
        <div class="rounded-xl overflow-hidden border border-slate-800 bg-black">
          <video src="${embed.src}" controls class="w-full max-h-[75vh]"></video>
        </div>
      `;
    } else {
      conteudoPlayer = `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <span class="text-slate-300 truncate">${embed.original}</span>
          <a href="${embed.original}" target="_blank" rel="noopener" class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black shrink-0">Abrir Vídeo</a>
        </div>
      `;
    }

    return `
      <div id="chbPlayerVideoTreinoBox" class="bg-slate-950 border border-amber-500/50 rounded-2xl p-4 space-y-3">
        <div id="chbVideoStageFull" class="space-y-3 bg-slate-950 p-1 rounded-xl">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="text-[10px] font-extrabold uppercase text-amber-400">Vídeo do Treino Selecionado • Não Fecha Automaticamente</div>
              <div class="font-black text-white text-sm">${st.videoAbertoTitulo}</div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="chbAlternarTelaSempreAtiva()" class="px-3 py-1.5 rounded-lg ${
                telaSempreAtiva ? "bg-emerald-600/25 text-emerald-300 border border-emerald-500/40" : "bg-slate-800 text-slate-300"
              } font-bold">
                ${telaSempreAtiva ? "Ecrã Sem Apagar: Ativo" : "Ecrã Sem Apagar: Desligado"}
              </button>
              <button type="button" onclick="chbAlternarFullEcranVideo()" class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-black">
                Full Ecrã
              </button>
              <button type="button" onclick="chbFecharVideoTreino()" class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold">
                Fechar Vídeo
              </button>
            </div>
          </div>
          ${conteudoPlayer}
        </div>
      </div>
    `;
  }

  function renderizarGestorVideosAdmin(dadosVideos) {
    if (!ehAdmin()) return "";

    const todasOpcoes = [
      ...AULAS_CARDIO_FITON.map((a) => ({ id: a.id, label: `[Cardio/FitOn] ${a.titulo}` })),
      ...PROGRAMAS_NTC.map((p) => ({ id: p.id, label: `[Programa NTC] ${p.nome}` })),
      ...ITENS_CORRIDA_VIDEO.map((r) => ({ id: r.id, label: `[Corrida/Caminhada] ${r.titulo}` })),
      ...dadosVideos.extras.map((e) => ({ id: e.id, label: `[${e.estilo || "Extra"}] ${e.titulo}` }))
    ];

    const totalComVideo = Object.keys(dadosVideos.mapa).filter((k) => Boolean(dadosVideos.mapa[k])).length;

    return `
      <div class="bg-slate-950 border border-sky-500/35 rounded-2xl p-4 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <div class="text-[10px] font-extrabold uppercase text-sky-400">Gestão de Vídeos dos Programas (Admin)</div>
            <div class="font-black text-white text-sm">Associar Vídeos a Todos os Treinos &amp; Programas</div>
          </div>
          <span class="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 font-bold text-[11px]">${totalComVideo} vídeo(s) associado(s)</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form onsubmit="chbGuardarVideoAssociado(event)" class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div class="font-bold text-white">1. Vincular Vídeo a um Treino / Programa Existente</div>
            <div>
              <label class="block text-[11px] text-slate-300 mb-1">Escolher Treino ou Programa</label>
              <select id="chbVidDestinoId" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white">
                ${todasOpcoes.map((op) => `<option value="${op.id}">${op.label}${dadosVideos.mapa[op.id] ? " ✓ (Com vídeo)" : ""}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-slate-300 mb-1">Link do Vídeo (YouTube, Google Drive ou MP4)</label>
              <input id="chbVidUrlInput" type="url" placeholder="https://www.youtube.com/watch?v=..." class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white">
            </div>
            <button type="submit" class="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black">
              Guardar Vídeo no Treino
            </button>
          </form>

          <form onsubmit="chbAdicionarAulaVideoExtra(event)" class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div class="font-bold text-white">2. Criar Nova Aula em Vídeo no Catálogo</div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input id="chbExtraTitulo" type="text" required placeholder="Título do treino" class="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white">
              <input id="chbExtraDuracao" type="number" min="5" max="120" value="25" placeholder="Min" class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select id="chbExtraCategoria" class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white">
                <option value="CrossHitBox Tae">CrossHitBox Tae</option>
                <option value="Cardio em Casa / FitOn">Cardio em Casa / FitOn</option>
                <option value="Força & Mobilidade NTC">Força &amp; Mobilidade NTC</option>
                <option value="Corrida & Caminhada (Adidas Running)">Corrida &amp; Caminhada (Adidas Running)</option>
              </select>
              <input id="chbExtraUrl" type="url" required placeholder="Link YouTube / Drive / MP4" class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white">
            </div>
            <button type="submit" class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">
              Publicar Nova Aula com Vídeo
            </button>
          </form>
        </div>
      </div>
    `;
  }

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
    const dadosVideos = lerVideosTreinos();
    const todasAulas = [...dadosVideos.extras, ...AULAS_CARDIO_FITON];

    const totalKm = st.corridas.reduce((acc, r) => acc + (parseFloat(r.distancia) || 0), 0);
    const totalKcalRun = st.corridas.reduce((acc, r) => acc + (parseInt(r.calorias, 10) || 0), 0);
    const totalMinCardio = st.aulasFeitas.reduce((acc, a) => acc + (parseInt(a.duracao, 10) || 0), 0);
    const totalKcalCardio = st.aulasFeitas.reduce((acc, a) => acc + (parseInt(a.calorias, 10) || 0), 0);

    const mTimer = String(Math.floor(timerSegundos / 60)).padStart(2, "0");
    const sTimer = String(timerSegundos % 60).padStart(2, "0");

    const listaCrossHitBox = todasAulas.filter((a) => {
      const est = String(a.estilo || "").toLowerCase();
      const tit = String(a.titulo || "").toLowerCase();
      return est.includes("crosshitbox") || tit.includes("crosshitbox");
    });

    const aulasCardioFiltradas = todasAulas.filter((a) => {
      const est = String(a.estilo || "").toLowerCase();
      if (est.includes("corrida") || est.includes("caminhada") || est.includes("adidas")) return false;
      if (st.filtroDuracao === "todas") return true;
      return String(a.duracao) === String(st.filtroDuracao);
    });

    const videosCorrida = [
      ...ITENS_CORRIDA_VIDEO,
      ...todasAulas.filter((a) => {
        const est = String(a.estilo || "").toLowerCase();
        const tit = String(a.titulo || "").toLowerCase();
        return est.includes("corrida") || est.includes("caminhada") || est.includes("adidas") || tit.includes("corrida") || tit.includes("caminhada");
      })
    ];

    let corpoAba = "";

    if (st.abaInterna === "crosshitbox_videos") {
      corpoAba = `
        <div class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="font-black text-white text-sm">Vídeos Oficiais — CROSSHITBOX TAE</div>
            <span class="text-[11px] text-amber-400 font-bold">Exclusivo CROSSHITBOX TAE</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${
              listaCrossHitBox.length
                ? listaCrossHitBox
                    .map((a) => {
                      const temVideo = Boolean(dadosVideos.mapa[a.id]);
                      const tituloLimpo = String(a.titulo || "").replace(/'/g, "");
                      return `
                      <div class="bg-slate-950 border border-amber-500/35 rounded-xl p-4 flex flex-col justify-between gap-3">
                        <div class="space-y-1.5">
                          <div class="flex items-center justify-between gap-2">
                            <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">CROSSHITBOX TAE</span>
                            <span class="text-slate-300 font-bold text-[11px]">${a.duracao} min • ${temVideo ? "Vídeo Oficial Ativo" : "Vídeo Disponível"}</span>
                          </div>
                          <div class="font-black text-white text-sm">${a.titulo}</div>
                          <p class="text-slate-400 text-[11px]">${a.blocos || "Sessão híbrida CrossHitBox Tae"}</p>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                          <button type="button" onclick="chbAbrirVideoTreino('${a.id}', '${tituloLimpo}')" class="py-2 px-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black">
                            Assistir Vídeo
                          </button>
                          <button type="button" onclick="chbConcluirAulaCardio('${a.id}', '${tituloLimpo}', ${a.duracao}, ${a.duracao * 10})" class="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black">
                            Concluir (+${a.duracao}m)
                          </button>
                        </div>
                      </div>
                    `;
                    })
                    .join("")
                : `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400">Ainda não há aulas marcadas como CrossHitBox Tae. Usa o formulário acima com a categoria "CrossHitBox Tae".</div>`
            }
          </div>
        </div>
      `;
    } else if (st.abaInterna === "programas_ntc") {
      corpoAba = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          ${PROGRAMAS_NTC.map((p) => {
            const feitos = st.sessoesConcluidas.filter((x) => x.programaId === p.id).length;
            const ativo = st.programaAtivo === p.id;
            const temVideo = Boolean(dadosVideos.mapa[p.id]);
            const nomeLimpo = String(p.nome || "").replace(/'/g, "");
            return `
              <div class="bg-slate-950 border ${ativo ? "border-amber-500" : "border-slate-800"} rounded-xl p-4 flex flex-col justify-between gap-3">
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-extrabold uppercase text-amber-400">${p.nivel}</span>
                    <span class="text-[10px] text-sky-300 font-bold">${temVideo ? "Vídeo Vinculado" : "Vídeo Guiado"}</span>
                  </div>
                  <div class="font-black text-white text-sm">${p.nome}</div>
                  <div class="text-[11px] text-sky-300 font-semibold">${p.foco}</div>
                  <p class="text-slate-400 text-[11px]">${p.descricao}</p>
                  <div class="text-[11px] text-slate-300 font-bold pt-1">Progresso: ${feitos} / ${p.sessoes} sessões</div>
                </div>
                <div class="space-y-2">
                  <button type="button" onclick="chbAbrirVideoTreino('${p.id}', '${nomeLimpo}')" class="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black">
                    Assistir Vídeo do Programa
                  </button>
                  <div class="flex gap-2">
                    <button type="button" onclick="chbSelecionarProgramaNTC('${p.id}')" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">
                      ${ativo ? "Programa Ativo" : "Selecionar"}
                    </button>
                    <button type="button" onclick="chbConcluirSessaoNTC('${p.id}')" class="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">
                      +1 Sessão
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    } else if (st.abaInterna === "corrida_caminhada") {
      corpoAba = `
        <div class="space-y-4">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="font-black text-white text-sm">Vídeos de Corrida, Caminhada &amp; Técnica (Adidas Running)</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${videosCorrida
                .map((vc) => {
                  const temVideo = Boolean(dadosVideos.mapa[vc.id]);
                  const titLimpo = String(vc.titulo || "").replace(/'/g, "");
                  return `
                  <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <div class="font-bold text-white truncate">${vc.titulo}</div>
                      <div class="text-[11px] text-sky-300">${temVideo ? "Vídeo Oficial Vinculado" : "Vídeo de Apoio"}</div>
                    </div>
                    <button type="button" onclick="chbAbrirVideoTreino('${vc.id}', '${titLimpo}')" class="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black shrink-0">
                      Assistir Vídeo
                    </button>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>

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
        </div>
      `;
    } else {
      corpoAba = `
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
            ${aulasCardioFiltradas
              .map((a) => {
                const temVideo = Boolean(dadosVideos.mapa[a.id]);
                const tituloLimpo = String(a.titulo || "").replace(/'/g, "");
                return `
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold text-[10px]">${a.estilo}</span>
                    <span class="text-slate-300 font-bold text-[11px]">${a.duracao} min • ${temVideo ? "Vídeo Oficial Ativo" : "Vídeo Disponível"}</span>
                  </div>
                  <div class="font-black text-white text-sm">${a.titulo}</div>
                  <p class="text-slate-400 text-[11px]">${a.blocos}</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" onclick="chbAbrirVideoTreino('${a.id}', '${tituloLimpo}')" class="py-2 px-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black">
                    Assistir Vídeo
                  </button>
                  <button type="button" onclick="chbConcluirAulaCardio('${a.id}', '${tituloLimpo}', ${a.duracao}, ${a.duracao * 10})" class="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black">
                    Concluir (+${a.duracao}m)
                  </button>
                </div>
              </div>
            `;
              })
              .join("")}
          </div>
        </div>
      `;
    }

    sec.innerHTML = `
      <div class="bg-slate-900/95 border border-amber-500/35 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5 text-xs">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
              CrossHitBox Tae • Nike Training Club • Adidas Running • FitOn &amp; Cardio em Casa
            </div>
            <h2 class="text-lg sm:text-xl font-black text-white mt-0.5">
              Central Completa de Treino, Vídeos, Corrida, Caminhada &amp; Cardio em Casa
            </h2>
            <p class="text-slate-400 mt-0.5">
              Assiste aos vídeos de cada treino e programa em full ecrã, acompanha o cronómetro e regista o teu progresso.
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

        ${renderizarGestorVideosAdmin(dadosVideos)}
        ${renderizarPlayerVideo(st, dadosVideos)}

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
          <button type="button" onclick="chbTreinoAba('cardio_fiton')" class="px-3.5 py-2 rounded-xl font-bold ${
            st.abaInterna === "cardio_fiton" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }">
            Cardio em Casa &amp; FitOn (Com Vídeos)
          </button>
          <button type="button" onclick="chbTreinoAba('crosshitbox_videos')" class="px-3.5 py-2 rounded-xl font-bold ${
            st.abaInterna === "crosshitbox_videos" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }">
            CROSSHITBOX TAE Vídeos
          </button>
          <button type="button" onclick="chbTreinoAba('programas_ntc')" class="px-3.5 py-2 rounded-xl font-bold ${
            st.abaInterna === "programas_ntc" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }">
            Programas &amp; Força NTC (Com Vídeos)
          </button>
          <button type="button" onclick="chbTreinoAba('corrida_caminhada')" class="px-3.5 py-2 rounded-xl font-bold ${
            st.abaInterna === "corrida_caminhada" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }">
            Corrida &amp; Caminhada (Adidas Running)
          </button>
        </div>

        ${corpoAba}
      </div>
    `;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(renderizarCentralTreino, 350));
  } else {
    setTimeout(renderizarCentralTreino, 350);
  }
})();
