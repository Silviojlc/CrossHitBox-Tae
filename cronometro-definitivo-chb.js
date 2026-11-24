(function () {
  if (window.__chbCronometroDefinitivoAtivo) return;
  window.__chbCronometroDefinitivoAtivo = true;

  const CHAVES_MEMBROS = [
    "crosshitbox_membros_v1",
    "crosshitbox_inscricoes_v1",
    "crosshitbox_perfis_completos_v1",
    "crosshitbox_membros_ativos_v1",
    "chb_membros_v1"
  ];

  let inicioFaseMs = 0;
  let duracaoFaseSeg = 40;
  let segundosAtuais = 40;
  let emContagem = false;
  let roundAtual = 1;
  let faseTrabalho = true;

  function ehAdmin() {
    return (window.location.pathname || "").toLowerCase().includes("admin");
  }

  function tocarBip() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close().catch(() => {});
      }, 140);
    } catch {}
  }

  function formatarTempo(s) {
    const num = Math.max(0, Math.floor(Number(s) || 0));
    const min = String(Math.floor(num / 60)).padStart(2, "0");
    const seg = String(num % 60).padStart(2, "0");
    return `${min}:${seg}`;
  }

  function lerSegundosTreino() {
    const inp = document.getElementById("chbDefTreinoSeg");
    const v = inp ? parseInt(inp.value, 10) : 40;
    return Number.isFinite(v) && v > 0 ? v : 40;
  }

  function lerSegundosDescanso() {
    const inp = document.getElementById("chbDefDescansoSeg");
    const v = inp ? parseInt(inp.value, 10) : 20;
    return Number.isFinite(v) && v > 0 ? v : 20;
  }

  function lerTotalRounds() {
    const inp = document.getElementById("chbDefRoundsTotais");
    const v = inp ? parseInt(inp.value, 10) : 8;
    return Number.isFinite(v) && v > 0 ? v : 8;
  }

  function pintarEcra() {
    const elTempo = document.getElementById("chbDefRelogio");
    const elEstado = document.getElementById("chbDefEstado");
    if (elTempo) elTempo.textContent = formatarTempo(segundosAtuais);
    if (elEstado) {
      const faseTxt = faseTrabalho ? "TRABALHO" : "DESCANSO";
      const estadoTxt = emContagem ? "A CONTAR" : "PAUSADO";
      elEstado.textContent = `${estadoTxt} • ${faseTxt} • Round ${roundAtual} de ${lerTotalRounds()}`;
    }
  }

  function atualizarRelogioPorTempoReal() {
    if (!emContagem) {
      pintarEcra();
      return;
    }
    const decorrido = Math.floor((Date.now() - inicioFaseMs) / 1000);
    const restante = duracaoFaseSeg - decorrido;

    if (restante > 0) {
      segundosAtuais = restante;
      pintarEcra();
      return;
    }

    // Troca de fase ou round ao terminar o tempo
    tocarBip();
    if (faseTrabalho) {
      faseTrabalho = false;
      duracaoFaseSeg = lerSegundosDescanso();
      segundosAtuais = duracaoFaseSeg;
      inicioFaseMs = Date.now();
    } else {
      const total = lerTotalRounds();
      if (roundAtual < total) {
        roundAtual += 1;
        faseTrabalho = true;
        duracaoFaseSeg = lerSegundosTreino();
        segundosAtuais = duracaoFaseSeg;
        inicioFaseMs = Date.now();
      } else {
        emContagem = false;
        segundosAtuais = 0;
      }
    }
    pintarEcra();
  }

  window.chbDefIniciar = function () {
    tocarBip();
    if (!emContagem) {
      const base = segundosAtuais > 0 ? segundosAtuais : lerSegundosTreino();
      duracaoFaseSeg = base;
      segundosAtuais = base;
      inicioFaseMs = Date.now();
      emContagem = true;
    }
    atualizarRelogioPorTempoReal();
  };

  window.chbDefPausar = function () {
    if (emContagem) {
      atualizarRelogioPorTempoReal();
      emContagem = false;
    }
    pintarEcra();
  };

  window.chbDefZerar = function () {
    emContagem = false;
    faseTrabalho = true;
    roundAtual = 1;
    duracaoFaseSeg = lerSegundosTreino();
    segundosAtuais = duracaoFaseSeg;
    inicioFaseMs = Date.now();
    pintarEcra();
  };

  window.chbDefFullEcra = function () {
    const box = document.getElementById("chbCronometroDefinitivoBox");
    if (!box) return;
    if (!document.fullscreenElement && typeof box.requestFullscreen === "function") {
      box.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  };

  // CONTROLO DE INSCRITOS (INCLUINDO jorgeanamendes23@gmail.com) E APROVAÇÃO NO ADMIN
  function lerExcluidosSet() {
    try {
      const raw = localStorage.getItem("crosshitbox_membros_excluidos_v1") || "[]";
      const arr = JSON.parse(raw);
      return new Set((Array.isArray(arr) ? arr : []).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean));
    } catch {
      return new Set();
    }
  }

  function recolherMembros() {
    const excl = lerExcluidosSet();
    const mapa = new Map();

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.toLowerCase().includes("exclu")) continue;
      try {
        const val = JSON.parse(localStorage.getItem(k) || "null");
        const arr = Array.isArray(val) ? val : val && typeof val === "object" && Array.isArray(val.membros) ? val.membros : null;
        if (!arr) continue;
        arr.forEach((m) => {
          if (!m || typeof m !== "object") return;
          const nome = String(m.nome || m.name || m.atleta || "").trim();
          const email = String(m.email || m.correo || "").trim().toLowerCase();
          const idNorm = (email || nome || String(m.id || "")).trim().toLowerCase();
          if (!idNorm || excl.has(idNorm)) return;
          if (!nome && !email) return;
          const atual = mapa.get(idNorm) || {};
          mapa.set(idNorm, {
            id: m.id || atual.id || idNorm,
            nome: nome || atual.nome || (email ? email.split("@")[0] : "Atleta"),
            email: email || atual.email || "",
            telefone: m.telefone || m.contacto || atual.telefone || "",
            turno: m.turno || atual.turno || "Quartas-feiras",
            aprovado: Boolean(m.aprovado === true || atual.aprovado === true),
            ativo: Boolean(m.ativo === true || atual.ativo === true),
            status: m.status || atual.status || "pendente"
          });
        });
      } catch {}
    }

    const sessAtual = String(sessionStorage.getItem("chb_sessao_membro_autenticada_v1") || "").trim();
    if (sessAtual) {
      const norm = sessAtual.toLowerCase();
      if (!excl.has(norm) && !mapa.has(norm)) {
        mapa.set(norm, {
          id: norm,
          nome: sessAtual.includes("@") ? sessAtual.split("@")[0] : sessAtual,
          email: sessAtual.includes("@") ? sessAtual : "",
          telefone: "",
          turno: "Quartas-feiras",
          aprovado: false,
          ativo: false,
          status: "pendente"
        });
      }
    }

    return Array.from(mapa.values());
  }

  function estaAprovado(m) {
    if (!m) return false;
    const st = String(m.status || "").trim().toLowerCase();
    return m.aprovado === true || m.ativo === true || st === "ativo" || st === "aprovado";
  }

  function gravarListaMembros(lista) {
    CHAVES_MEMBROS.forEach((c) => {
      try {
        localStorage.setItem(c, JSON.stringify(lista));
      } catch {}
    });
  }

  window.chbAprovarMembroDireto = function (identificador) {
    const alvo = String(identificador || "").trim().toLowerCase();
    const lista = recolherMembros().map((m) => {
      const em = String(m.email || "").trim().toLowerCase();
      const nm = String(m.nome || "").trim().toLowerCase();
      if (!alvo || em === alvo || nm === alvo) {
        return { ...m, aprovado: true, ativo: true, status: "ativo" };
      }
      return m;
    });
    gravarListaMembros(lista);
    renderizarAprovacaoAdmin();
  };

  function renderizarAprovacaoAdmin() {
    const lista = recolherMembros();
    gravarListaMembros(lista);
    if (!ehAdmin()) return;

    const pendentes = lista.filter((u) => !estaAprovado(u));
    let box = document.getElementById("chbAprovacaoPendentesDefinitiva");
    if (!box) {
      box = document.createElement("section");
      box.id = "chbAprovacaoPendentesDefinitiva";
      box.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
      const mainEl = document.querySelector("main") || document.body;
      mainEl.insertBefore(box, mainEl.firstChild);
    }

    box.innerHTML = `
      <div class="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 space-y-2 text-xs">
        <div class="text-[10px] font-extrabold uppercase text-amber-400">Aprovação de Novos Inscritos</div>
        <div class="font-black text-white text-sm">Pendentes de Aprovação (${pendentes.length})</div>
        ${
          pendentes.length
            ? pendentes
                .map((p, idx) => {
                  const ref = String(p.email || p.nome || idx).replace(/'/g, "");
                  return `
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div>
                  <div class="font-bold text-white">${p.nome || "Novo Atleta"} <span class="text-amber-400">• ${p.turno || "Quartas-feiras"}</span></div>
                  <div class="text-[11px] text-slate-400">${p.email || "Sem e-mail"}</div>
                </div>
                <button type="button" onclick="chbAprovarMembroDireto('${ref}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">
                  Aprovar e Liberar Acesso
                </button>
              </div>
            `;
                })
                .join("")
            : `<div class="text-slate-400">Sem inscrições pendentes.</div>`
        }
      </div>
    `;
  }

  function bloquearNaoAprovadoNoMembro() {
    if (ehAdmin()) return;
    const sessAtual = String(sessionStorage.getItem("chb_sessao_membro_autenticada_v1") || "").trim().toLowerCase();
    if (!sessAtual) return;

    const lista = recolherMembros();
    const atleta = lista.find(
      (u) => String(u.email || "").trim().toLowerCase() === sessAtual || String(u.nome || "").trim().toLowerCase() === sessAtual
    );

    if (!atleta || !estaAprovado(atleta)) {
      if (!document.getElementById("chbBloqueioPendenteDefinitivo")) {
        const div = document.createElement("div");
        div.id = "chbBloqueioPendenteDefinitivo";
        div.style.cssText =
          "position:fixed;inset:0;z-index:99999;background:rgba(2,6,23,0.97);display:flex;align-items:center;justify-content:center;padding:20px;color:#f8fafc;text-align:center;";
        div.innerHTML = `
          <div style="max-width:450px;background:#0f172a;border:1px solid rgba(245,158,11,0.45);border-radius:16px;padding:24px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#fbbf24;margin-bottom:8px;">Acesso Pendente de Aprovação</div>
            <h2 style="font-size:20px;font-weight:900;margin:0 0 10px 0;">Aguarda Aprovação do Administrador</h2>
            <p style="font-size:13px;color:#cbd5e1;line-height:1.5;margin:0 0 18px 0;">
              A conta <strong>${sessAtual}</strong> está pendente de aprovação no painel do administrador.
            </p>
            <button type="button" onclick="sessionStorage.removeItem('chb_sessao_membro_autenticada_v1');window.location.reload();" style="padding:10px 18px;border-radius:10px;background:#f59e0b;color:#020617;font-weight:900;border:none;cursor:pointer;">
              Sair
            </button>
          </div>
        `;
        document.body.appendChild(div);
      }
    } else {
      const b = document.getElementById("chbBloqueioPendenteDefinitivo");
      if (b) b.remove();
    }
  }

  function montar() {
    if (!document.getElementById("chbCronometroDefinitivoBox")) {
      const sec = document.createElement("section");
      sec.id = "chbCronometroDefinitivoBox";
      sec.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
      sec.innerHTML = `
        <div class="bg-slate-900/95 border border-emerald-500/50 rounded-2xl p-4 space-y-3 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div id="chbDefEstado" class="text-[11px] font-extrabold uppercase text-emerald-400">PAUSADO • TRABALHO • Round 1 de 8</div>
              <div id="chbDefRelogio" class="text-4xl font-mono font-black text-white mt-0.5">00:40</div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" onclick="chbDefIniciar()" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">Iniciar</button>
              <button type="button" onclick="chbDefPausar()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">Pausar</button>
              <button type="button" onclick="chbDefZerar()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">Zerar</button>
              <button type="button" onclick="chbDefFullEcra()" class="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold">Full Ecrã</button>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 pt-1">
            <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
              <span class="block text-[10px] text-slate-400">Treino (s)</span>
              <input id="chbDefTreinoSeg" type="number" min="1" max="600" value="40" onchange="chbDefZerar()" class="w-full bg-transparent text-white font-bold outline-none">
            </label>
            <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
              <span class="block text-[10px] text-slate-400">Descanso (s)</span>
              <input id="chbDefDescansoSeg" type="number" min="1" max="600" value="20" class="w-full bg-transparent text-white font-bold outline-none">
            </label>
            <label class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-300">
              <span class="block text-[10px] text-slate-400">Rounds</span>
              <input id="chbDefRoundsTotais" type="number" min="1" max="99" value="8" onchange="pintarEcra()" class="w-full bg-transparent text-white font-bold outline-none">
            </label>
          </div>
        </div>
      `;
      const mainEl = document.querySelector("main") || document.body;
      mainEl.insertBefore(sec, mainEl.firstChild);
    }

    renderizarAprovacaoAdmin();
    bloquearNaoAprovadoNoMembro();
    pintarEcra();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(montar, 250));
  } else {
    setTimeout(montar, 250);
  }

  setInterval(atualizarRelogioPorTempoReal, 200);
})();
