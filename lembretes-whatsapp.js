(function () {
  if (document.getElementById("lembretesWhatsappModulo")) return;

  let sessaoAtiva = false;
  let janelaWhatsapp = null;

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

  function abrirNaMesmaSessao(telefoneLimpo, texto) {
    const modoApp = document.getElementById("waModoAppCheck")?.checked;
    const base = modoApp ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    const params = new URLSearchParams();
    if (telefoneLimpo) params.set("phone", telefoneLimpo);
    params.set("text", texto);
    const url = `${base}?${params.toString()}`;

    try {
      if (janelaWhatsapp && !janelaWhatsapp.closed) {
        janelaWhatsapp.location.href = url;
        janelaWhatsapp.focus();
        return;
      }
      janelaWhatsapp = window.open(url, "chb_whatsapp_janela");
      if (janelaWhatsapp) janelaWhatsapp.focus();
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }

  window.chbEnviarLembreteAula = function (nome, telefone, turno) {
    const msgPadrao =
      (document.getElementById("waMensagemModelo")?.value || "").trim() ||
      "Lembrete CrossHitBox Tae: a nossa aula do turno {TURNO} começa em breve! Prepara o equipamento e mantém o foco.";
    const texto = msgPadrao
      .replace(/\{NOME\}/gi, nome || "Atleta")
      .replace(/\{TURNO\}/gi, turno || "05:00 / 18:00");
    abrirNaMesmaSessao(limparTelefoneCV(telefone), texto);
  };

  window.chbEnviarLembreteTurno = async function () {
    const turnoAlvo = document.getElementById("waTurnoFiltro")?.value || "TODOS";
    let perfis = lerArray("crosshitbox_perfis_completos_v1");

    try {
      const r = await fetch("/api/crosshitbox/perfis-completos").catch(() => null);
      if (r && r.ok) {
        const d = await r.json();
        if (Array.isArray(d.perfis) && d.perfis.length) perfis = d.perfis;
      }
    } catch {}

    const alvos = perfis.filter((p) => {
      if (turnoAlvo === "TODOS") return true;
      return (p.turno || p.horario || "").includes(turnoAlvo);
    });

    const msgPadrao =
      (document.getElementById("waMensagemModelo")?.value || "").trim() ||
      "Lembrete CrossHitBox Tae: a nossa aula do turno {TURNO} começa em breve! Prepara o equipamento e mantém o foco.";

    if (!alvos.length) {
      abrirNaMesmaSessao("", msgPadrao.replace(/\{NOME\}/gi, "Equipa").replace(/\{TURNO\}/gi, turnoAlvo));
      return;
    }

    const primeiro = alvos[0];
    abrirNaMesmaSessao(
      limparTelefoneCV(primeiro.telefone),
      msgPadrao.replace(/\{NOME\}/gi, primeiro.nome || "Atleta").replace(/\{TURNO\}/gi, primeiro.turno || turnoAlvo)
    );
  };

  window.renderLembretesWhatsappUI = async function () {
    const alvo = document.getElementById("conteudoLembretesWA");
    if (!alvo) return;
    const turnoFiltro = document.getElementById("waTurnoFiltro")?.value || "TODOS";

    let perfis = lerArray("crosshitbox_perfis_completos_v1");
    try {
      const r = await fetch("/api/crosshitbox/perfis-completos").catch(() => null);
      if (r && r.ok) {
        const d = await r.json();
        if (Array.isArray(d.perfis) && d.perfis.length) perfis = d.perfis;
      }
    } catch {}

    const lista = perfis.filter((p) => {
      if (turnoFiltro === "TODOS") return true;
      return (p.turno || p.horario || "").includes(turnoFiltro);
    });

    alvo.innerHTML = `
      <div class="space-y-4 text-xs">
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label class="text-slate-300 font-semibold">Mensagem de Lembrete (usa {NOME} e {TURNO})</label>
            <label class="flex items-center gap-2 text-emerald-300 font-semibold cursor-pointer">
              <input id="waModoAppCheck" type="checkbox" class="accent-emerald-500">
              <span>Preferir link api.whatsapp.com (abre App/Sessão direta)</span>
            </label>
          </div>
          <textarea id="waMensagemModelo" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">Olá {NOME}! Lembrete CrossHitBox Tae ({TURNO}): a aula começa em breve. Contamos contigo!</textarea>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="chbEnviarLembreteTurno()" class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">Abrir na Mesma Janela do WhatsApp</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${
            lista.length
              ? lista.map((p) => `
                  <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="font-bold text-white truncate">${p.nome || p.email}</div>
                      <div class="text-slate-400 truncate">${p.turno || "Turno não definido"} • ${p.telefone || "Sem nº"}</div>
                    </div>
                    <button type="button" onclick="chbEnviarLembreteAula('${(p.nome || "Atleta").replace(/'/g, "")}','${p.telefone || ""}','${(p.turno || "").replace(/'/g, "")}')" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shrink-0">Enviar</button>
                  </div>
                `).join("")
              : `<div class="col-span-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400">Nenhum atleta encontrado para o filtro selecionado.</div>`
          }
        </div>
      </div>
    `;
  };

  if (!detectarAdmin()) return;

  const container = document.createElement("section");
  container.id = "lembretesWhatsappModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-emerald-400">Lembretes de Aula via WhatsApp (Sessão Reutilizada)</h2>
        <p class="text-xs text-slate-400">Reutiliza sempre a mesma janela do WhatsApp para não multiplicar abas nem exigir novo login a cada envio.</p>
      </div>
      <div class="flex items-center gap-2">
        <select id="waTurnoFiltro" onchange="renderLembretesWhatsappUI()" class="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-semibold">
          <option value="TODOS">Todos os Turnos</option>
          <option value="05:00">Turno 05:00</option>
          <option value="18:00">Turno 18:00</option>
        </select>
        <button type="button" onclick="renderLembretesWhatsappUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
      </div>
    </div>
    <div id="conteudoLembretesWA"></div>
  `;

  const refEl = document.getElementById("radarEvasaoModulo") || document.getElementById("modoComandoModulo") || document.body.firstChild;
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("lembretesWhatsappModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.renderLembretesWhatsappUI();
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
