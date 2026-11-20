(function () {
  if (document.getElementById("workspaceUnificadoCHB")) return;

  let sessaoAtiva = false;
  let abaAtual = "DASHBOARD";
  let modoVerTudo = false;

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

  function obterIdentidadeAtual() {
    const isAdmin = detectarAdmin();
    const bodyText = document.body ? (document.body.innerText || "") : "";
    const matchEmail = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = matchEmail ? matchEmail[0].toLowerCase() : (isAdmin ? "berluscops@crosshitbox.cv" : "atleta@crosshitbox.cv");

    const perfis = lerArray("crosshitbox_perfis_completos_v1");
    const perfil = perfis.find((p) => (p.email || "").toLowerCase() === email) || {};

    let foto = perfil.foto_url || perfil.foto || perfil.avatar || "";
    if (!foto && isAdmin) {
      foto = localStorage.getItem("crosshitbox_admin_foto_v1") || "";
    }

    const nome = isAdmin
      ? (perfil.nome || "Admin • Treinador Silvio")
      : (perfil.nome || email.split("@")[0] || "Atleta");

    const subtitulo = isAdmin
      ? "Comando CrossHitBox Tae • Ginásio Kosmo"
      : `${perfil.turno || "Turno CrossHitBox Tae"} • ${email}`;

    return { isAdmin, nome, email, subtitulo, foto };
  }

  window.chbAtualizarFotoTopo = function (inputEl) {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const dataUrl = String(ev.target.result || "");
      if (!dataUrl) return;
      const id = obterIdentidadeAtual();
      if (id.isAdmin) {
        try { localStorage.setItem("crosshitbox_admin_foto_v1", dataUrl); } catch {}
      }
      const perfis = lerArray("crosshitbox_perfis_completos_v1");
      const idx = perfis.findIndex((p) => (p.email || "").toLowerCase() === id.email);
      if (idx >= 0) {
        perfis[idx].foto_url = dataUrl;
      } else {
        perfis.unshift({ email: id.email, nome: id.nome, foto_url: dataUrl });
      }
      try { localStorage.setItem("crosshitbox_perfis_completos_v1", JSON.stringify(perfis)); } catch {}
      window.chbRenderShellWorkspace();
    };
    reader.readAsDataURL(file);
  };

  window.chbEntrarAulaRapida = function () {
    const btns = Array.from(document.querySelectorAll("button, a"));
    const alvo = btns.find((b) => {
      const t = (b.textContent || "").trim().toLowerCase();
      return t.includes("entrar na aula") || t.includes("iniciar aula") || t.includes("entrar / ocultar sala");
    });
    if (alvo) {
      alvo.click();
      return;
    }
    window.chbSelecionarAba("AULAS_VIDEO");
  };

  function mapearSecoesPorAba(isAdmin) {
    if (isAdmin) {
      return [
        { id: "DASHBOARD", label: "Dashboard Geral", grupo: "VISÃO GERAL", match: (txt) => txt.includes("Iniciar Aula Online") || txt.includes("TOTAL DE ATLETAS") || txt.includes("Modo Comando ao Vivo") },
        { id: "AULAS_VIDEO", label: "Aulas Online & Vídeos", grupo: "AULAS & MÍDIA", match: (txt) => txt.includes("Configurar Sala de Videochamada") || txt.includes("Publicar Vídeo de Aula Gravada") || txt.includes("Gestão Persistente de Vídeos") },
        { id: "MEMBROS_TURNOS", label: "Membros & Turnos", grupo: "GESTÃO", match: (txt) => txt.includes("Gestão de Turnos") || txt.includes("Validação de Inscrição") || txt.includes("Presenças & Assiduidade") },
        { id: "FINANCEIRO", label: "Mensalidades & Recibos", grupo: "FINANCEIRO", match: (txt) => txt.includes("Controlo Total de Mensalidades") || txt.includes("Gestão de Mensalidades & Comprovativos") },
        { id: "AVALIACAO_DOSSIE", label: "Avaliação, Fotos & Dossiê", grupo: "AVALIAÇÃO", match: (txt) => txt.includes("Foto do Atleta & Avaliação Física") || txt.includes("Dossiê de Progresso") || txt.includes("Relatórios Automáticos") || txt.includes("Evolução Corporal") },
        { id: "WOD_COMUNIDADE", label: "WOD, Radar & WhatsApp", grupo: "OPERAÇÃO", match: (txt) => txt.includes("Treino do Dia (WOD)") || txt.includes("Radar de Risco de Evasão") || txt.includes("Constância & Selos") || txt.includes("Lembretes de Aula via WhatsApp") || txt.includes("Alertas de Patologias") || txt.includes("Cronómetro HIIT") || txt.includes("Relatório Mensal Consolidado") || txt.includes("Alterar Utilizador e Senha") }
      ];
    }

    return [
      { id: "DASHBOARD", label: "Dashboard Geral", grupo: "MEU ESPAÇO", match: (txt) => txt.includes("Atleta Autenticado") || txt.includes("Aula a decorrer agora") || txt.includes("Sequência de Fogo") },
      { id: "AULAS_VIDEO", label: "Aula Online & Vídeos", grupo: "TREINOS", match: (txt) => txt.includes("Aula Online por Videochamada") || txt.includes("Vídeos de Aulas Gravadas") || txt.includes("Cronómetro HIIT") },
      { id: "WOD_CHECKIN", label: "WOD, Ranking & Check-in", grupo: "ROTINA", match: (txt) => txt.includes("Treino do Dia (WOD)") || txt.includes("Meu Check-in") },
      { id: "AVALIACAO_PLANO", label: "Ficha, Fotos, Plano & Dossiê", grupo: "PROGRESSO", match: (txt) => txt.includes("Ficha do Atleta") || txt.includes("Foto do Atleta & Avaliação Física") || txt.includes("Dossiê de Progresso") || txt.includes("Relatório de Performance") || txt.includes("Evolução Corporal") },
      { id: "MENSALIDADE", label: "Mensalidade & Conta", grupo: "CONTA", match: (txt) => txt.includes("Mensalidade & Comprovativo") || txt.includes("Alterar Password") }
    ];
  }

  function aplicarFiltroVisualSecoes() {
    const shell = document.getElementById("workspaceUnificadoCHB");
    if (!shell) return;
    const isAdmin = detectarAdmin();
    const abas = mapearSecoesPorAba(isAdmin);
    const abaAtivaObj = abas.find((a) => a.id === abaAtual) || abas[0];

    const seccoes = Array.from(document.querySelectorAll("section, main > div, body > div")).filter((el) => {
      if (!el || el.id === "workspaceUnificadoCHB" || el.id === "overlayBloqueioPagamentoCHB") return false;
      if (el.contains(shell)) return false;
      const t = (el.innerText || "").trim();
      if (!t || t.length < 25) return false;
      const rect = el.getBoundingClientRect();
      return rect.height > 40;
    });

    if (modoVerTudo) {
      seccoes.forEach((el) => {
        el.style.removeProperty("display");
      });
      return;
    }

    seccoes.forEach((el) => {
      const txt = el.innerText || "";
      // Mantem bloqueio de pagamento intacto quando existir
      if (el.id === "overlayBloqueioPagamentoCHB") {
        el.style.removeProperty("display");
        return;
      }
      const bateComAba = abaAtivaObj && abaAtivaObj.match ? abaAtivaObj.match(txt) : false;
      if (abaAtual === "DASHBOARD") {
        // No Dashboard Geral, mostra resumo/destaques sem empilhar formulários extensos
        const eBlocoPesado = txt.includes("Alterar Utilizador e Senha") || txt.includes("Exportar CSV");
        el.style.setProperty("display", !eBlocoPesado && (bateComAba || txt.includes("TOTAL DE ATLETAS") || txt.includes("Aula Ao Vivo")) ? "" : "none", "important");
      } else {
        el.style.setProperty("display", bateComAba ? "" : "none", "important");
      }
    });
  }

  window.chbSelecionarAba = function (novaAba) {
    abaAtual = novaAba || "DASHBOARD";
    modoVerTudo = false;
    window.chbRenderShellWorkspace();
    aplicarFiltroVisualSecoes();
    const topo = document.getElementById("workspaceUnificadoCHB");
    if (topo) topo.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.chbAlternarVerTudo = function () {
    modoVerTudo = !modoVerTudo;
    window.chbRenderShellWorkspace();
    aplicarFiltroVisualSecoes();
  };

  function injetarEstilosResponsivos() {
    if (document.getElementById("chbEstilosResponsivosTV")) return;
    const style = document.createElement("style");
    style.id = "chbEstilosResponsivosTV";
    style.textContent = `
      @media (min-width: 1024px) {
        body.chb-shell-ativo {
          padding-left: 260px !important;
        }
        #chbSidebarFixa {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 260px;
          z-index: 40;
          overflow-y: auto;
        }
      }
      @media (max-width: 1023px) {
        body.chb-shell-ativo {
          padding-left: 0 !important;
        }
        #chbSidebarFixa {
          position: relative;
          width: 100%;
          z-index: 30;
        }
      }
      @media (min-width: 1600px) {
        body.chb-shell-ativo {
          font-size: 16px;
        }
      }
      /* Esconde barras antigas redundantes de posição dentro do shell novo para manter limpeza */
      .barra-mover-bloco-chb {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  window.chbRenderShellWorkspace = function () {
    const __ativo = document.activeElement;
    if (__ativo && ["INPUT","TEXTAREA","SELECT"].includes(__ativo.tagName) && document.hasFocus()) return;
    const shell = document.getElementById("workspaceUnificadoCHB");
    if (!shell) return;
    injetarEstilosResponsivos();

    const id = obterIdentidadeAtual();
    const abas = mapearSecoesPorAba(id.isAdmin);
    const totalMembros = lerArray("crosshitbox_perfis_completos_v1").length;
    const totalTurnos = lerArray("crosshitbox_turnos_v1").length || 2;
    const totalVideos = lerArray("crosshitbox_videos_aulas_v1").length;

    document.body.classList.add("chb-shell-ativo");

    shell.innerHTML = `
      <aside id="chbSidebarFixa" class="bg-slate-950/98 border-r border-b lg:border-b-0 border-slate-800 p-4 flex flex-col justify-between gap-4 text-xs">
        <div class="space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-800">
            ${
              id.foto
                ? `<img src="${id.foto}" alt="${id.nome}" class="w-12 h-12 rounded-xl object-cover border-2 border-amber-500 shrink-0">`
                : `<div class="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center font-black text-base text-amber-400 shrink-0">${(id.nome || "C")[0].toUpperCase()}</div>`
            }
            <div class="min-w-0">
              <div class="font-black text-white text-sm truncate">${id.nome}</div>
              <div class="text-[11px] text-slate-400 truncate">${id.subtitulo}</div>
              <label class="inline-block mt-1 text-[10px] text-amber-400 hover:underline cursor-pointer">
                Alterar Foto
                <input type="file" accept="image/*" onchange="chbAtualizarFotoTopo(this)" class="hidden">
              </label>
            </div>
          </div>

          <nav class="space-y-1">
            ${abas.map((ab) => {
              const ativa = !modoVerTudo && abaAtual === ab.id;
              return `
                <button type="button" onclick="chbSelecionarAba('${ab.id}')" class="w-full text-left px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between ${
                  ativa
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }">
                  <span>${ab.label}</span>
                  <span class="text-[10px] opacity-75">${ab.grupo.split(" ")[0]}</span>
                </button>
              `;
            }).join("")}
          </nav>
        </div>

        <div class="space-y-2 pt-3 border-t border-slate-800">
          <button type="button" onclick="chbEntrarAulaRapida()" class="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-center">
            Entrar na Aula Online
          </button>
          <button type="button" onclick="chbSelecionarAba('AULAS_VIDEO')" class="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-center">
            Ver Vídeos de Aulas
          </button>
          <button type="button" onclick="chbAlternarVerTudo()" class="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-[11px] text-center border border-slate-800">
            ${modoVerTudo ? "Modo Organizado (Por Secção)" : "Ver Todos os Blocos"}
          </button>
        </div>
      </aside>

      <div class="max-w-6xl mx-auto px-3 sm:px-5 pt-4 pb-2">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            ${
              id.foto
                ? `<img src="${id.foto}" alt="${id.nome}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-amber-500 shrink-0">`
                : `<div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border-2 border-amber-500/60 flex items-center justify-center font-black text-xl text-amber-400 shrink-0">${(id.nome || "C")[0].toUpperCase()}</div>`
            }
            <div>
              <div class="text-[11px] uppercase tracking-wider font-extrabold text-amber-400">
                ${modoVerTudo ? "Vista Completa" : (abas.find((x) => x.id === abaAtual)?.label || "Dashboard Geral")}
              </div>
              <h1 class="text-lg sm:text-xl font-black text-white leading-tight">${id.nome}</h1>
              <p class="text-xs text-slate-400">${id.subtitulo}</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 sm:gap-3 text-center text-xs">
            <div class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <div class="text-[10px] text-slate-400 uppercase">${id.isAdmin ? "Atletas" : "Turnos"}</div>
              <div class="text-base sm:text-lg font-black text-white">${id.isAdmin ? totalMembros : totalTurnos}</div>
            </div>
            <div class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <div class="text-[10px] text-slate-400 uppercase">Turnos</div>
              <div class="text-base sm:text-lg font-black text-amber-400">${totalTurnos}</div>
            </div>
            <div class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <div class="text-[10px] text-slate-400 uppercase">Vídeos</div>
              <div class="text-base sm:text-lg font-black text-emerald-400">${totalVideos}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  function garantirShellNoTopo() {
    let shell = document.getElementById("workspaceUnificadoCHB");
    if (!shell) {
      shell = document.createElement("div");
      shell.id = "workspaceUnificadoCHB";
      shell.style.display = "none";
      document.body.insertBefore(shell, document.body.firstChild);
    }

    if (sessaoAtiva) {
      shell.style.display = "";
      window.chbRenderShellWorkspace();
      aplicarFiltroVisualSecoes();
    } else {
      shell.style.display = "none";
      document.body.classList.remove("chb-shell-ativo");
      const allSec = Array.from(document.querySelectorAll("section, main > div, body > div"));
      allSec.forEach((el) => {
        if (el && el.id !== "workspaceUnificadoCHB") {
          el.style.removeProperty("display");
        }
      });
    }
  }

  function avaliarSessao() {
    const bodyText = document.body ? (document.body.innerText || "") : "";
    const temBotaoSair = Array.from(document.querySelectorAll("button, a")).some((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      return (t === "sair" || t === "terminar sessão" || t === "logout") && btn.offsetParent !== null;
    });
    const temAreaAutenticada =
      bodyText.includes("Sessão ativa como:") ||
      bodyText.includes("Atleta Autenticado") ||
      bodyText.includes("Configurar Sala de Videochamada");
    const nova = Boolean(temBotaoSair || temAreaAutenticada);
    if (nova !== sessaoAtiva) {
      sessaoAtiva = nova;
      garantirShellNoTopo();
    } else if (sessaoAtiva) {
      aplicarFiltroVisualSecoes();
    }
  }

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button, a");
    if (btn && ["sair", "terminar sessão", "logout"].includes((btn.textContent || "").trim().toLowerCase())) {
      sessaoAtiva = false;
      abaAtual = "DASHBOARD";
      modoVerTudo = false;
      garantirShellNoTopo();
      return;
    }
    setTimeout(avaliarSessao, 150);
    setTimeout(avaliarSessao, 500);
  });

  document.addEventListener("submit", () => {
    setTimeout(avaliarSessao, 250);
    setTimeout(avaliarSessao, 700);
  });

  setInterval(avaliarSessao, 700);
  setTimeout(avaliarSessao, 300);
})();
