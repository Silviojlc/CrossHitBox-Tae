(function () {
  if (document.getElementById("relatorioNutricaoModulo")) return;

  const KEY_REL = "crosshitbox_relatorios_perf_v1";
  const KEY_OBJ = "crosshitbox_objetivo_atleta_v1";
  let sessaoAtiva = false;

  const PLANOS_POR_OBJETIVO = {
    EMAGRECIMENTO: {
      titulo: "Plano Alimentar — Emagrecimento & Definição (CrossHitBox Tae)",
      estrategia: "Défice calórico moderado com alta densidade proteica e controlo de hidratos simples para queima de gordura sem perda de rendimento.",
      preTreino05: "Pré-treino 05:00 (leve, 20-30 min antes): 1 café sem açúcar + 1/2 banana ou 1 torrada integral pequena (ou treino em jejum com 400 ml de água).",
      preTreino18: "Pré-treino 18:00 (60-90 min antes): 1 iogurte natural + 1 fruta ou 2 ovos mexidos com 1 fatia de pão integral.",
      refeicoes: [
        "Pequeno-almoço / Pós-treino: 3 ovos (mexidos ou cozidos) + 1 fatia de pão integral ou batata-doce pequena + fruta da época (papaia/maçã).",
        "Almoço: 150-180g de proteína magra (peito de frango grelhado, atum ao natural ou peixe grelhado) + prato metade legumes/salada + 3-4 colheres de sopa de arroz ou feijão.",
        "Lanche da tarde: 1 iogurte natural/grego sem açúcar ou queijo fresco magro + 1 punhado pequeno de frutos secos.",
        "Jantar (leve): 150g de peixe, frango ou omelete de 3 ovos + legumes salteados ou sopa de legumes sem batata em excesso."
      ],
      hidratacao: "Meta diária: 35 ml por kg de peso corporal + 500 ml extra durante/após o WOD."
    },
    HIPERTROFIA: {
      titulo: "Plano Alimentar — Ganho de Massa & Força (CrossHitBox Tae)",
      estrategia: "Superávit energético limpo com distribuição regular de proteína a cada 3-4 horas e hidratos complexos antes e após o treino.",
      preTreino05: "Pré-treino 05:00: 1 banana madura + 1 colher de aveia ou mel + café (30 min antes).",
      preTreino18: "Pré-treino 18:00: Sanduíche integral de frango desfiado ou atum + 1 fruta (60-90 min antes).",
      refeicoes: [
        "Pequeno-almoço / Pós-treino: 3 a 4 ovos inteiros + 2 fatias de pão integral ou cuscuz/aveia + 1 banana.",
        "Almoço: 180-220g de carne magra, frango ou peixe + 5-6 colheres de sopa de arroz + feijão/lentilhas + salada com azeite.",
        "Lanche da tarde: Batido proteico (ou leite/iogurte) + aveia + 1 fruta ou pasta de amendoim.",
        "Jantar: 180g de proteína (peixe, frango ou ovos) + batata-doce/mandioca/arroz em porção moderada + legumes."
      ],
      hidratacao: "Meta diária: 35-40 ml por kg de peso + reposição hídrica pós-treino."
    },
    CONDICIONAMENTO: {
      titulo: "Plano Alimentar — Condicionamento & Performance Tae",
      estrategia: "Equilíbrio energético para suportar alta intensidade intervalada (HIIT/Tabata), acelerar a recuperação muscular e manter energia estável.",
      preTreino05: "Pré-treino 05:00: 1 fruta rápida (banana/maçã) + café preto ou água.",
      preTreino18: "Pré-treino 18:00: 1 iogurte natural com aveia e fruta (60 min antes).",
      refeicoes: [
        "Pequeno-almoço / Pós-treino: 2 a 3 ovos + 1 a 2 fatias de pão integral + fruta fresca.",
        "Almoço: 160-180g de peixe, frango ou carne magra + 4-5 colheres de arroz/feijão + legumes variados.",
        "Lanche da tarde: Queijo fresco ou ovos cozidos + fruta ou bolachas integrais.",
        "Jantar: 150-170g de proteína grelhada + legumes e pequena porção de hidrato complexo se o treino foi à noite."
      ],
      hidratacao: "Meta diária: 2,5 L a 3 L de água ao longo do dia."
    }
  };

  function lerLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function guardarLocal(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
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

  function limparTelefoneCV(raw) {
    const digitos = (raw || "").toString().replace(/\D+/g, "");
    if (!digitos) return "";
    return digitos.length === 7 ? "238" + digitos : digitos;
  }

  function montarPacoteLocal(atleta, periodo, objetivoKey) {
    const obj = PLANOS_POR_OBJETIVO[objetivoKey] ? objetivoKey : "CONDICIONAMENTO";
    const plano = PLANOS_POR_OBJETIVO[obj];
    const hoje = new Date();
    const diasJanela = periodo === "MENSAL" ? 30 : 7;
    const limiteMs = hoje.getTime() - diasJanela * 86400000;

    const presencas = lerLocal("crosshitbox_presencas_v1").filter(
      (p) => (p.email || "").toLowerCase() === atleta.email && new Date(p.data || 0).getTime() >= limiteMs
    );
    const wods = lerLocal("crosshitbox_wod_resultados_v1").filter(
      (w) => (w.email || "").toLowerCase() === atleta.email && new Date(w.data || 0).getTime() >= limiteMs
    );
    const evolucoes = lerLocal("crosshitbox_evolucao_v1")
      .filter((e) => (e.email || "").toLowerCase() === atleta.email)
      .sort((a, b) => (a.data || "").localeCompare(b.data || ""));

    const ultEvo = evolucoes[evolucoes.length - 1];
    const priEvo = evolucoes[0];
    let textoEvolucao = "Sem avaliações físicas registadas ainda.";
    if (ultEvo) {
      const deltaPeso =
        priEvo && priEvo.peso_kg && ultEvo.peso_kg && evolucoes.length > 1
          ? ` (variação total: ${(ultEvo.peso_kg - priEvo.peso_kg).toFixed(1)} kg)`
          : "";
      textoEvolucao = `Peso atual: ${ultEvo.peso_kg || "-"} kg${deltaPeso} | Cintura: ${ultEvo.cintura_cm || "-"} cm | Último teste (${ultEvo.teste_fisico || "Físico"}): ${ultEvo.resultado_teste || "-"}`;
    }

    const tituloPeriodo = periodo === "MENSAL" ? "RELATÓRIO MENSAL COMPLETO (30 DIAS)" : "RESUMO SEMANAL DE PERFORMANCE (7 DIAS)";
    const ref = periodo === "MENSAL" ? hoje.toISOString().slice(0, 7) : hoje.toISOString().slice(0, 10);

    const resumoTexto = [
      `CROSSHITBOX TAE — ${tituloPeriodo}`,
      `Atleta: ${atleta.nome} (${atleta.email})`,
      `Assiduidade (${diasJanela} dias): ${presencas.length} treinos concluídos`,
      `WODs registados no período: ${wods.length}${wods[0] ? ` (Último: ${wods[0].resultado})` : ""}`,
      `Evolução Física: ${textoEvolucao}`,
      `Recomendação do Treinador: ${
        presencas.length >= (periodo === "MENSAL" ? 12 : 3)
          ? "Excelente consistência! Mantém a intensidade nos intervalos HIIT e respeita a recuperação."
          : "Foco em aumentar a regularidade para pelo menos 3 treinos por semana para acelerar resultados."
      }`
    ].join("\n");

    const planoTexto = [
      `${plano.titulo}`,
      `Estratégia: ${plano.estrategia}`,
      `${plano.preTreino05}`,
      `${plano.preTreino18}`,
      `Estrutura Diária:`,
      ...plano.refeicoes.map((r, idx) => `${idx + 1}. ${r}`),
      `${plano.hidratacao}`,
      `Nota: Orientação alimentar desportiva de apoio ao treino; condições clínicas específicas devem ter acompanhamento individualizado.`
    ].join("\n");

    return {
      id: `${atleta.email}_${periodo}_${ref}`,
      email: atleta.email,
      nome: atleta.nome,
      turno: atleta.turno || "05:00 - Madrugada",
      objetivo: obj,
      periodo,
      referencia: ref,
      resumo_texto: resumoTexto,
      plano_alimentar: planoTexto,
      atualizado_em: new Date().toISOString()
    };
  }

  window.relNutriGerarAgora = async function (periodoForcado, emailForcado) {
    const { isAdmin } = detectarContexto();
    const periodo = periodoForcado || document.getElementById("rnPeriodoSelect")?.value || "SEMANAL";
    const objetivo = document.getElementById("rnObjetivoSelect")?.value || localStorage.getItem(KEY_OBJ) || "CONDICIONAMENTO";
    localStorage.setItem(KEY_OBJ, objetivo);

    if (isAdmin && !emailForcado) {
      try {
        const res = await fetch("/api/crosshitbox/relatorios-performance/executar-lote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ periodo, objetivoPadrao: objetivo })
        });
        if (res.ok) {
          await renderRelNutriUI();
          return;
        }
      } catch {}
    }

    const atleta = emailForcado ? { email: emailForcado, nome: emailForcado.split("@")[0] } : obterAtletaAtual();
    const pacote = montarPacoteLocal(atleta, periodo, objetivo);

    const lista = lerLocal(KEY_REL);
    const idx = lista.findIndex((r) => r.id === pacote.id);
    if (idx >= 0) lista[idx] = pacote;
    else lista.unshift(pacote);
    guardarLocal(KEY_REL, lista);

    try {
      await fetch("/api/crosshitbox/relatorios-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pacote)
      });
    } catch {}

    await renderRelNutriUI();
  };

  window.relNutriGuardarObjetivoAtleta = async function () {
    const objetivo = document.getElementById("rnObjetivoSelect")?.value || "CONDICIONAMENTO";
    localStorage.setItem(KEY_OBJ, objetivo);
    await window.relNutriGerarAgora("SEMANAL");
    await window.relNutriGerarAgora("MENSAL");
  };

  window.relNutriPartilharWhatsApp = function (idRelatorio, telefoneRaw) {
    const lista = lerLocal(KEY_REL);
    const rel = lista.find((r) => r.id === idRelatorio) || lista[0];
    if (!rel) return;
    const textoCompleto = `${rel.resumo_texto}\n\n---\n${rel.plano_alimentar}`;
    const tel = limparTelefoneCV(telefoneRaw || "");
    const url = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(textoCompleto)}`
      : `https://wa.me/?text=${encodeURIComponent(textoCompleto)}`;
    window.open(url, "_blank", "noopener");
  };

  window.renderRelNutriUI = async function () {
    const alvo = document.getElementById("conteudoRelNutri");
    if (!alvo) return;
    const { isAdmin } = detectarContexto();

    let relatorios = lerLocal(KEY_REL);
    try {
      const res = await fetch("/api/crosshitbox/relatorios-performance");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.relatorios) && data.relatorios.length) {
          relatorios = data.relatorios;
          guardarLocal(KEY_REL, relatorios);
        }
      }
    } catch {}

    if (isAdmin) {
      const filtro = (document.getElementById("rnFiltroAdmin")?.value || "").trim().toLowerCase();
      const filtrados = relatorios.filter((r) => {
        if (!filtro) return true;
        return ((r.nome || "") + " " + (r.email || "") + " " + (r.periodo || "") + " " + (r.objetivo || "")).toLowerCase().includes(filtro);
      });

      alvo.innerHTML = `
        <div class="space-y-3 text-xs">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-slate-300">
            <div>
              <strong>Automação Ativa (Modelo Híbrido):</strong> Resumo Semanal toda <strong>Segunda às 06:00</strong> + Relatório Mensal &amp; Plano Alimentar todo <strong>Dia 1 às 07:00</strong>.
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="relNutriGerarAgora('SEMANAL')" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">Gerar Lote Semanal Agora</button>
              <button type="button" onclick="relNutriGerarAgora('MENSAL')" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">Gerar Lote Mensal Agora</button>
            </div>
          </div>

          ${
            filtrados.length
              ? `<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  ${filtrados.slice(0, 12).map((r) => `
                    <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div class="flex items-center justify-between gap-2">
                        <div>
                          <span class="font-bold text-white text-sm">${r.nome || r.email}</span>
                          <span class="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">${r.periodo}</span>
                          <span class="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">${r.objetivo}</span>
                        </div>
                        <button type="button" onclick="relNutriPartilharWhatsApp('${r.id}', '${r.telefone || ""}')" class="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">
                          Enviar WhatsApp
                        </button>
                      </div>
                      <pre class="whitespace-pre-wrap font-sans bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 leading-relaxed">${r.resumo_texto}</pre>
                      <details class="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
                        <summary class="cursor-pointer font-bold text-emerald-300">Ver Plano Alimentar Direcionado</summary>
                        <pre class="whitespace-pre-wrap font-sans text-slate-300 mt-2 leading-relaxed">${r.plano_alimentar}</pre>
                      </details>
                    </div>
                  `).join("")}
                </div>`
              : `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400">Ainda não existem relatórios gerados. Clica em "Gerar Lote Semanal Agora" ou "Gerar Lote Mensal Agora".</div>`
          }
        </div>
      `;
    } else {
      const atleta = obterAtletaAtual();
      const objSalvo = localStorage.getItem(KEY_OBJ) || "CONDICIONAMENTO";
      let meus = relatorios.filter((r) => (r.email || "").toLowerCase() === atleta.email);
      if (!meus.length) {
        meus = [montarPacoteLocal(atleta, "SEMANAL", objSalvo), montarPacoteLocal(atleta, "MENSAL", objSalvo)];
        guardarLocal(KEY_REL, meus.concat(relatorios));
      }
      const maisRecente = meus[0];

      alvo.innerHTML = `
        <div class="space-y-4 text-xs">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <label class="text-slate-400 font-semibold">O Meu Objetivo:</label>
              <select id="rnObjetivoSelect" onchange="relNutriGuardarObjetivoAtleta()" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-semibold">
                <option value="EMAGRECIMENTO" ${objSalvo === "EMAGRECIMENTO" ? "selected" : ""}>Emagrecimento &amp; Definição</option>
                <option value="HIPERTROFIA" ${objSalvo === "HIPERTROFIA" ? "selected" : ""}>Ganho de Massa &amp; Força</option>
                <option value="CONDICIONAMENTO" ${objSalvo === "CONDICIONAMENTO" ? "selected" : ""}>Condicionamento &amp; Performance Tae</option>
              </select>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="relNutriGerarAgora('SEMANAL')" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">Atualizar Semanal</button>
              <button type="button" onclick="relNutriGerarAgora('MENSAL')" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">Atualizar Mensal Completo</button>
              <button type="button" onclick="relNutriPartilharWhatsApp('${maisRecente.id}')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold">Guardar no Meu WhatsApp</button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-amber-400 text-sm">Relatório de Performance (${maisRecente.periodo})</span>
                <span class="text-slate-400">${maisRecente.referencia}</span>
              </div>
              <pre class="whitespace-pre-wrap font-sans text-slate-200 bg-slate-900 border border-slate-800 rounded-lg p-3 leading-relaxed">${maisRecente.resumo_texto}</pre>
            </div>

            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div class="font-bold text-emerald-400 text-sm">Plano de Alimentação Direcionado</div>
              <pre class="whitespace-pre-wrap font-sans text-slate-200 bg-slate-900 border border-slate-800 rounded-lg p-3 leading-relaxed">${maisRecente.plano_alimentar}</pre>
            </div>
          </div>
        </div>
      `;
    }
  };

  const { isAdmin } = detectarContexto();
  const container = document.createElement("section");
  container.id = "relatorioNutricaoModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-amber-500/40 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-amber-400">${isAdmin ? "Relatórios Automáticos de Performance & Plano Alimentar" : "Meu Relatório de Performance & Plano Alimentar"}</h2>
        <p class="text-xs text-slate-400">${isAdmin ? "Geração automática semanal e mensal com plano nutricional por objetivo e envio direto aos atletas." : "Acompanha o teu resumo semanal/mensal e o plano alimentar ajustado ao teu objetivo e turno."}</p>
      </div>
      ${
        isAdmin
          ? `<div class="flex items-center gap-2">
               <input id="rnFiltroAdmin" type="text" oninput="renderRelNutriUI()" placeholder="Filtrar atleta ou período..." class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
               <button type="button" onclick="renderRelNutriUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
             </div>`
          : ""
      }
    </div>
    <div id="conteudoRelNutri"></div>
  `;

  const refEl = document.getElementById("relatorioMensalModulo") || document.getElementById("evolucaoFisicaModulo") || document.getElementById("wodRankingModulo");
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("relatorioNutricaoModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      renderRelNutriUI();
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
