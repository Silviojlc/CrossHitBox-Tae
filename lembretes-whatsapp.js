(function () {
  if (document.getElementById("lembretesWhatsappModulo")) return;

  let sessaoAtiva = false;
  let cacheMembros = [];

  function detectarAdmin() {
    const caminho = (window.location.pathname || "").toLowerCase();
    const txt = document.body ? (document.body.innerText || "") : "";
    return caminho.includes("admin") || txt.includes("Painel Administrativo") || txt.includes("Configurar Sala de Videochamada");
  }

  function limparTelefoneCV(raw) {
    const digitos = (raw || "").toString().replace(/\D+/g, "");
    if (!digitos) return "";
    if (digitos.length === 7) return "238" + digitos;
    return digitos;
  }

  function gerarTextoModelo() {
    const tipo = document.getElementById("waTipoModelo")?.value || "AULA";
    const turno = document.getElementById("waTurnoFiltro")?.value || "05:00";
    const linkMembro = window.location.origin + "/membro.html";

    if (tipo === "MENSALIDADE") {
      return `Olá! Passando para lembrar a mensalidade do CrossHitBox Tae (turno ${turno}). Podes enviar o comprovativo diretamente na tua Área do Atleta: ${linkMembro}`;
    }
    if (tipo === "WOD") {
      return `Bom treino, equipa CrossHitBox Tae! O WOD de hoje já está disponível e o ranking do turno ${turno} está aberto em: ${linkMembro}`;
    }
    return `Olá! Lembrete do treino CrossHitBox Tae (turno ${turno}). Entra na Área do Atleta, faz o teu check-in e prepara-te para o treino: ${linkMembro}`;
  }

  window.waAtualizarModeloTexto = function () {
    const area = document.getElementById("waMensagemTexto");
    if (area) area.value = gerarTextoModelo();
  };

  window.waCarregarMembros = async function () {
    let membros = [];
    try {
      const res = await fetch("/api/crosshitbox/membros");
      if (res.ok) {
        const data = await res.json();
        membros = Array.isArray(data) ? data : (data.membros || data.data || []);
      }
    } catch {}
    cacheMembros = membros;
    window.waRenderLista();
  };

  window.waRenderLista = function () {
    const alvo = document.getElementById("waListaDestinatarios");
    if (!alvo) return;
    const turno = document.getElementById("waTurnoFiltro")?.value || "TODOS";
    const textoBase = (document.getElementById("waMensagemTexto")?.value || gerarTextoModelo()).trim();

    const filtrados = cacheMembros.filter((m) => {
      if (turno === "TODOS") return true;
      return ((m.horario || m.turno || "")).includes(turno);
    });

    if (!filtrados.length) {
      alvo.innerHTML = `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <span class="text-xs text-slate-400">Nenhum atleta carregado para este turno. Podes abrir o WhatsApp com a mensagem pronta para colar no grupo do turno.</span>
          <a href="https://wa.me/?text=${encodeURIComponent(textoBase)}" target="_blank" rel="noopener" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs">
            Abrir WhatsApp (Mensagem Geral)
          </a>
        </div>
      `;
      return;
    }

    alvo.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
        ${filtrados.map((m) => {
          const nome = (m.nome || m.email || "Atleta").toString();
          const telFormatado = limparTelefoneCV(m.telefone || m.contacto || m.telemovel || "");
          const msgPersonalizada = textoBase.replace(/^Olá!?/i, `Olá ${nome}!`);
          const href = telFormatado
            ? `https://wa.me/${telFormatado}?text=${encodeURIComponent(msgPersonalizada)}`
            : `https://wa.me/?text=${encodeURIComponent(msgPersonalizada)}`;

          return `
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold text-white truncate">${nome}</div>
                <div class="text-slate-400 truncate">${m.horario || m.turno || "Turno"} • ${m.telefone || "Sem nº"}</div>
              </div>
              <a href="${href}" target="_blank" rel="noopener" class="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">
                WhatsApp
              </a>
            </div>
          `;
        }).join("")}
      </div>
    `;
  };

  if (!detectarAdmin()) return;

  const container = document.createElement("section");
  container.id = "lembretesWhatsappModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-emerald-500/30 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-emerald-400">Lembretes Rápidos via WhatsApp por Turno</h2>
        <p class="text-xs text-slate-400">Envia avisos de aula, WOD ou mensalidade com a mensagem pronta e link direto para a plataforma.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select id="waTurnoFiltro" onchange="waAtualizarModeloTexto(); waRenderLista();" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
          <option value="05:00">Turno 05:00</option>
          <option value="18:00">Turno 18:00</option>
          <option value="TODOS">Todos os turnos</option>
        </select>
        <select id="waTipoModelo" onchange="waAtualizarModeloTexto(); waRenderLista();" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
          <option value="AULA">Aviso de Aula / Treino</option>
          <option value="WOD">WOD &amp; Ranking do Dia</option>
          <option value="MENSALIDADE">Lembrete de Mensalidade</option>
        </select>
        <button type="button" onclick="waCarregarMembros()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar Lista</button>
      </div>
    </div>

    <div class="space-y-3">
      <div>
        <label class="block text-xs text-slate-400 mb-1">Mensagem de lembrete (editável)</label>
        <textarea id="waMensagemTexto" rows="2" oninput="waRenderLista()" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"></textarea>
      </div>
      <div id="waListaDestinatarios"></div>
    </div>
  `;

  const refEl = document.getElementById("evolucaoFisicaModulo") || document.getElementById("wodRankingModulo");
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  document.getElementById("waMensagemTexto").value = gerarTextoModelo();
  window.waCarregarMembros();

  function aplicarVisibilidade() {
    const el = document.getElementById("lembretesWhatsappModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.waRenderLista();
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
