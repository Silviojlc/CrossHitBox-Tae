(function () {
  if (document.getElementById("dossierProgressoTaeModulo")) return;

  let sessaoAtiva = false;

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

  function limparTelefoneCV(raw) {
    const d = (raw || "").toString().replace(/\D+/g, "");
    if (!d) return "";
    return d.length === 7 ? "238" + d : d;
  }

  function obterAtletaAtual() {
    const inputs = Array.from(document.querySelectorAll("input"));
    for (const inp of inputs) {
      const v = (inp.value || "").trim();
      if (v.includes("@")) return { email: v.toLowerCase(), nome: v.split("@")[0] };
    }
    const m = (document.body ? document.body.innerText : "").match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (m) return { email: m[0].toLowerCase(), nome: m[0].split("@")[0] };
    return { email: "atleta@crosshitbox.cv", nome: "Atleta" };
  }

  function montarDadosDossier(emailAlvo, objetivoEscolhido, periodoDias) {
    const em = (emailAlvo || "").toLowerCase();
    const dias = Number(periodoDias || 30);
    const limiteMs = Date.now() - dias * 86400000;

    const perfis = lerArray("crosshitbox_perfis_completos_v1");
    const perfil = perfis.find((x) => (x.email || "").toLowerCase() === em) || {};

    const presencas = lerArray("crosshitbox_presencas_v1").filter(
      (p) => (p.email || "").toLowerCase() === em && new Date(p.data || 0).getTime() >= limiteMs
    );
    const wods = lerArray("crosshitbox_wod_resultados_v1").filter(
      (w) => (w.email || "").toLowerCase() === em && new Date(w.data || 0).getTime() >= limiteMs
    );
    const evolucoes = lerArray("crosshitbox_evolucao_v1")
      .filter((e) => (e.email || "").toLowerCase() === em)
      .sort((a, b) => (a.data || "").localeCompare(b.data || ""));

    const relatorios = lerArray("crosshitbox_relatorios_perf_v1");
    const relAtleta = relatorios.find((r) => (r.email || "").toLowerCase() === em);

    const ultEvo = evolucoes[evolucoes.length - 1] || null;
    const priEvo = evolucoes[0] || null;
    const deltaPeso =
      ultEvo && priEvo && ultEvo.peso_kg && priEvo.peso_kg && evolucoes.length > 1
        ? `${(Number(ultEvo.peso_kg) - Number(priEvo.peso_kg)).toFixed(1)} kg`
        : "Sem variação comparativa";

    const obj = objetivoEscolhido || (relAtleta && relAtleta.objetivo) || localStorage.getItem("crosshitbox_objetivo_atleta_v1") || "CONDICIONAMENTO";
    const turno = perfil.turno || (relAtleta && relAtleta.turno) || "05:00 - Madrugada";
    const nome = perfil.nome || (relAtleta && relAtleta.nome) || em.split("@")[0];

    const planoAlimentar =
      (relAtleta && relAtleta.plano_alimentar) ||
      `Plano direcionado ao objetivo ${obj} no turno ${turno}: refeições equilibradas com proteína em todas as bases, hidratos ajustados à intensidade do treino e hidratação contínua ao longo do dia.`;

    const diretrizCoach =
      presencas.length >= (dias === 7 ? 3 : 10)
        ? "Ritmo de presença forte. Mantém a intensidade nos blocos de choque/HIIT, respeita o sono e segue o plano alimentar do teu objetivo."
        : "Aumenta a regularidade semanal no teu turno para consolidar adaptação cardiorrespiratória, força e composição corporal.";

    return {
      nome,
      email: em,
      telefone: perfil.telefone || "",
      nif: perfil.nif || "",
      turno,
      objetivo: obj,
      dias,
      dataEmissao: new Date().toISOString().slice(0, 10),
      totalTreinos: presencas.length,
      totalWods: wods.length,
      ultimoWod: wods[0] ? `${wods[0].resultado || "Registado"} (${wods[0].data || ""})` : "Sem registo recente",
      pesoAtual: ultEvo && ultEvo.peso_kg ? `${ultEvo.peso_kg} kg` : "Não registado",
      cinturaAtual: ultEvo && ultEvo.cintura_cm ? `${ultEvo.cintura_cm} cm` : "Não registado",
      deltaPeso,
      testeFisico: ultEvo && ultEvo.resultado_teste ? `${ultEvo.teste_fisico || "Teste"}: ${ultEvo.resultado_teste}` : "Pendente",
      planoAlimentar,
      diretrizCoach
    };
  }

  window.chbAbrirDossierPDF = function (emailForcado) {
    const atleta = emailForcado ? { email: emailForcado } : obterAtletaAtual();
    const obj = document.getElementById("dossierObjetivoSel")?.value || "";
    const dias = document.getElementById("dossierPeriodoSel")?.value || "30";
    const d = montarDadosDossier(atleta.email, obj, dias);

    const w = window.open("", "_blank", "width=860,height=740");
    if (!w) return;
    w.document.write(`
      <html>
      <head>
        <title>Dossiê de Progresso CrossHitBox Tae - ${d.nome}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; background: #fff; }
          .topo { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #ea580c; padding-bottom: 14px; margin-bottom: 20px; }
          .marca { font-size: 22px; font-weight: 900; color: #ea580c; letter-spacing: 0.5px; }
          .sub { font-size: 12px; color: #475569; margin-top: 4px; }
          .meta { text-align: right; font-size: 12px; color: #334155; }
          h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.6px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 20px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; font-size: 13px; }
          .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; background: #f8fafc; }
          .rotulo { font-size: 11px; color: #64748b; text-transform: uppercase; }
          .valor { font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 3px; }
          pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 12.5px; line-height: 1.5; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .rodape { margin-top: 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="topo">
          <div>
            <div class="marca">CROSSHITBOX TAE • DOSSIÊ DE PROGRESSO</div>
            <div class="sub">Comando Técnico &amp; Nutrição Desportiva • Coach Silvio Cabral</div>
          </div>
          <div class="meta">
            <div><strong>Data:</strong> ${d.dataEmissao}</div>
            <div><strong>Janela:</strong> Últimos ${d.dias} dias</div>
          </div>
        </div>

        <h2>1. Dados do Atleta &amp; Enquadramento</h2>
        <div class="grid">
          <div class="card"><div class="rotulo">Atleta</div><div class="valor">${d.nome}</div></div>
          <div class="card"><div class="rotulo">E-mail / NIF</div><div class="valor">${d.email}${d.nif ? " • NIF: " + d.nif : ""}</div></div>
          <div class="card"><div class="rotulo">Turno Principal</div><div class="valor">${d.turno}</div></div>
          <div class="card"><div class="rotulo">Objetivo Ativo</div><div class="valor">${d.objetivo}</div></div>
        </div>

        <h2>2. Indicadores de Performance &amp; Evolução</h2>
        <div class="grid">
          <div class="card"><div class="rotulo">Treinos Concluídos (${d.dias}d)</div><div class="valor">${d.totalTreinos} sessões</div></div>
          <div class="card"><div class="rotulo">WODs Registados (${d.dias}d)</div><div class="valor">${d.totalWods} (Último: ${d.ultimoWod})</div></div>
          <div class="card"><div class="rotulo">Peso / Variação</div><div class="valor">${d.pesoAtual} (${d.deltaPeso})</div></div>
          <div class="card"><div class="rotulo">Cintura / Teste Físico</div><div class="valor">${d.cinturaAtual} • ${d.testeFisico}</div></div>
        </div>

        <h2>3. Plano de Alimentação Direcionado ao Objetivo</h2>
        <pre>${d.planoAlimentar}</pre>

        <h2>4. Diretrizes do Treinador</h2>
        <pre>${d.diretrizCoach}</pre>

        <div class="rodape">CrossHitBox Tae • Plataforma Oficial de Treino e Acompanhamento • Emitido em ${d.dataEmissao}</div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    w.document.close();
  };

  window.chbEnviarDossierWhatsApp = function (emailForcado) {
    const atleta = emailForcado ? { email: emailForcado } : obterAtletaAtual();
    const obj = document.getElementById("dossierObjetivoSel")?.value || "";
    const dias = document.getElementById("dossierPeriodoSel")?.value || "30";
    const d = montarDadosDossier(atleta.email, obj, dias);

    const msg = [
      `CROSSHITBOX TAE — DOSSIÊ DE PROGRESSO (${d.dias} DIAS)`,
      `Atleta: ${d.nome} | Turno: ${d.turno} | Objetivo: ${d.objetivo}`,
      `Treinos: ${d.totalTreinos} | WODs: ${d.totalWods} | Peso: ${d.pesoAtual} (${d.deltaPeso}) | Cintura: ${d.cinturaAtual}`,
      `Diretriz: ${d.diretrizCoach}`,
      `Plano Alimentar: ${d.planoAlimentar.slice(0, 450)}`
    ].join("\n");

    const tel = limparTelefoneCV(d.telefone);
    const url = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  };

  window.renderDossierProgressoTaeUI = function () {
    const alvo = document.getElementById("conteudoDossierTae");
    if (!alvo) return;
    const isAdmin = detectarAdmin();
    const atleta = obterAtletaAtual();
    const d = montarDadosDossier(atleta.email, "", "30");

    alvo.innerHTML = `
      <div class="space-y-4 text-xs">
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            ${
              isAdmin
                ? `<input id="dossierEmailAdmin" type="email" value="${atleta.email}" placeholder="E-mail do atleta..." class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white">`
                : ""
            }
            <select id="dossierPeriodoSel" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-semibold">
              <option value="7">Resumo Semanal (7 dias)</option>
              <option value="30" selected>Dossiê Mensal (30 dias)</option>
            </select>
            <select id="dossierObjetivoSel" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-semibold">
              <option value="">Objetivo Atual (${d.objetivo})</option>
              <option value="EMAGRECIMENTO">Emagrecimento &amp; Definição</option>
              <option value="HIPERTROFIA">Ganho de Massa &amp; Força</option>
              <option value="CONDICIONAMENTO">Condicionamento &amp; Performance Tae</option>
            </select>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="chbAbrirDossierPDF(document.getElementById('dossierEmailAdmin')?.value || '')" class="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">Gerar / Imprimir PDF</button>
            <button type="button" onclick="chbEnviarDossierWhatsApp(document.getElementById('dossierEmailAdmin')?.value || '')" class="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">Enviar por WhatsApp</button>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div class="text-slate-400">Treinos (30d)</div>
            <div class="text-lg font-black text-white mt-0.5">${d.totalTreinos}</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div class="text-slate-400">WODs Registados</div>
            <div class="text-lg font-black text-amber-400 mt-0.5">${d.totalWods}</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div class="text-slate-400">Peso / Variação</div>
            <div class="text-sm font-bold text-white mt-1">${d.pesoAtual} <span class="text-emerald-300">(${d.deltaPeso})</span></div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div class="text-slate-400">Cintura Atual</div>
            <div class="text-sm font-bold text-white mt-1">${d.cinturaAtual}</div>
          </div>
        </div>
      </div>
    `;
  };

  const container = document.createElement("section");
  container.id = "dossierProgressoTaeModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-amber-500/40 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-amber-400">Dossiê de Progresso &amp; Alimentação — CrossHitBox Tae</h2>
        <p class="text-xs text-slate-400">Gera o dossiê completo em PDF ou envia por WhatsApp com presenças, WODs, evolução física e plano alimentar do objetivo.</p>
      </div>
      <button type="button" onclick="renderDossierProgressoTaeUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar Dados</button>
    </div>
    <div id="conteudoDossierTae"></div>
  `;

  const refEl = document.getElementById("relatorioNutricaoModulo") || document.getElementById("modoComandoModulo") || document.body.firstChild;
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("dossierProgressoTaeModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.renderDossierProgressoTaeUI();
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
