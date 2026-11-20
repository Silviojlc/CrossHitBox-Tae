(function () {
  if (document.getElementById("layoutKosmoCHB")) return;

  let sessaoAtiva = false;
  let secaoAtiva = "dashboard";
  let verTudo = false;

  function isAdminPage() {
    const p = (window.location.pathname || "").toLowerCase();
    const t = document.body ? (document.body.innerText || "") : "";
    return p.includes("admin") || t.includes("Painel Administrativo") || t.includes("Configurar Sala de Videochamada");
  }

  function lerArray(key) {
    try {
      const r = localStorage.getItem(key);
      const a = r ? JSON.parse(r) : [];
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  }

  function obterUsuario() {
    const admin = isAdminPage();
    const bodyText = document.body ? (document.body.innerText || "") : "";
    const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0].toLowerCase() : (admin ? "berluscops@crosshitbox.cv" : "atleta@crosshitbox.cv");

    const perfis = lerArray("crosshitbox_perfis_completos_v1");
    const perfil = perfis.find((x) => (x.email || "").toLowerCase() === email) || {};

    let foto = perfil.foto_url || perfil.foto || perfil.avatar || "";
    if (!foto && admin) {
      foto = localStorage.getItem("crosshitbox_admin_foto_v1") || "";
    }

    return {
      admin,
      nome: admin ? (perfil.nome || "Admin • Treinador Silvio") : (perfil.nome || email.split("@")[0] || "Atleta"),
      email,
      subtitulo: admin ? "CrossHitBox Tae • Comando & Gestão" : (perfil.turno || "CrossHitBox Tae • Área do Atleta"),
      foto
    };
  }

  function menusDisponiveis(admin) {
    if (admin) {
      return [
        { id: "dashboard", titulo: "Dashboard Geral", desc: "Visão geral, foto, métricas, aula ao vivo e comando" },
        { id: "aulas_videos", titulo: "Aulas Online & Vídeos", desc: "Sala de videochamada, links e vídeos de aulas gravadas" },
        { id: "membros_turnos", titulo: "Membros & Turnos", desc: "Criar/editar/excluir turnos, gerir atletas e validações" },
        { id: "financeiro", titulo: "Mensalidades & Recibos", desc: "Comprovativos, aprovações, edição, reordenação e recibos" },
        { id: "avaliacao", titulo: "Avaliação, Fotos & Dossiê", desc: "Foto do atleta, fotos por parte do corpo, evolução e dossiê PDF" },
        { id: "operacao", titulo: "WOD, Radar & WhatsApp", desc: "WOD do dia, selos, risco de evasão, lembretes e alertas" }
      ];
    }
    return [
      { id: "dashboard", titulo: "Dashboard Geral", desc: "O teu resumo, foto, sequência, aula ao vivo e check-in" },
      { id: "aulas_videos", titulo: "Aulas Online & Vídeos", desc: "Entrar na aula ao vivo, assistir vídeos e usar cronómetro" },
      { id: "progresso", titulo: "Ficha, Fotos, Plano & Dossiê", desc: "Ficha clínica, fotos físicas, plano alimentar e dossiê PDF" },
      { id: "mensalidade", titulo: "Mensalidade & Conta", desc: "Estado do pagamento, envio de comprovativo e senha" }
    ];
  }

  function blocoPertenceSecao(texto, secId, admin) {
    if (secId === "dashboard") {
      if (admin) {
        return texto.includes("Iniciar Aula Online") || texto.includes("TOTAL DE ATLETAS") || texto.includes("Modo Comando ao Vivo");
      }
      return texto.includes("Atleta Autenticado") || texto.includes("Aula a decorrer agora") || texto.includes("Sequência de Fogo");
    }
    if (secId === "aulas_videos") {
      return texto.includes("Aula Online") || texto.includes("Configurar Sala de Videochamada") || texto.includes("Vídeos de Aulas") || texto.includes("Publicar Vídeo") || texto.includes("Cronómetro HIIT");
    }
    if (secId === "membros_turnos") {
      return texto.includes("Gestão de Turnos") || texto.includes("Validação de Inscrição") || texto.includes("Presenças & Assiduidade") || (texto.includes("Nome") && texto.includes("E-mail") && texto.includes("Turno"));
    }
    if (secId === "financeiro") {
      return texto.includes("Mensalidades & Comprovativos") || texto.includes("Controlo Total de Mensalidades");
    }
    if (secId === "avaliacao" || secId === "progresso") {
      return texto.includes("Ficha do Atleta") || texto.includes("Foto do Atleta & Avaliação Física") || texto.includes("Dossiê de Progresso") || texto.includes("Relatório de Performance") || texto.includes("Plano de Alimentação") || texto.includes("Evolução Corporal") || texto.includes("Relatórios Automáticos");
    }
    if (secId === "operacao") {
      return texto.includes("Treino do Dia (WOD)") || texto.includes("Radar de Risco") || texto.includes("Constância & Selos") || texto.includes("Lembretes de Aula") || texto.includes("Alertas de Patologias") || texto.includes("Relatório Mensal Consolidado") || texto.includes("Alterar Utilizador");
    }
    if (secId === "mensalidade") {
      return texto.includes("Mensalidade & Comprovativo") || texto.includes("Alterar Password");
    }
    return false;
  }

  function aplicarVisibilidadeLimpa() {
    const shell = document.getElementById("layoutKosmoCHB");
    if (!shell) return;
    const admin = isAdminPage();

    // Remove qualquer shell anterior para não conflitar
    const antigo = document.getElementById("workspaceUnificadoCHB");
    if (antigo) antigo.remove();

    const elementos = Array.from(document.querySelectorAll("section, main > div, body > div")).filter((el) => {
      if (!el || el.id === "layoutKosmoCHB" || el.id === "overlayBloqueioPagamentoCHB") return false;
      if (el.contains(shell)) return false;
      const t = (el.innerText || "").trim();
      if (!t || t.length < 25) return false;
      const r = el.getBoundingClientRect();
      return r.height > 40;
    });

    if (verTudo) {
      elementos.forEach((el) => el.style.removeProperty("display"));
      return;
    }

    elementos.forEach((el) => {
      if (el.id === "overlayBloqueioPagamentoCHB") {
        el.style.removeProperty("display");
        return;
      }
      const txt = el.innerText || "";
      const mostrar = blocoPertenceSecao(txt, secaoAtiva, admin);
      el.style.setProperty("display", mostrar ? "" : "none", "important");
    });
  }

  window.chbIrParaSecao = function (idSec) {
    secaoAtiva = idSec || "dashboard";
    verTudo = false;
    window.chbRenderLayoutKosmo();
    aplicarVisibilidadeLimpa();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.chbToggleVerTudo = function () {
    verTudo = !verTudo;
    window.chbRenderLayoutKosmo();
    aplicarVisibilidadeLimpa();
  };

  window.chbTrocarFotoUsuario = function (inp) {
    const file = inp && inp.files && inp.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const url = String(ev.target.result || "");
      if (!url) return;
      const u = obterUsuario();
      if (u.admin) {
        try { localStorage.setItem("crosshitbox_admin_foto_v1", url); } catch {}
      }
      const perfis = lerArray("crosshitbox_perfis_completos_v1");
      const idx = perfis.findIndex((p) => (p.email || "").toLowerCase() === u.email);
      if (idx >= 0) perfis[idx].foto_url = url;
      else perfis.unshift({ email: u.email, nome: u.nome, foto_url: url });
      try { localStorage.setItem("crosshitbox_perfis_completos_v1", JSON.stringify(perfis)); } catch {}
      window.chbRenderLayoutKosmo();
    };
    reader.readAsDataURL(file);
  };

  window.chbEntrarAulaDireta = function () {
    const btns = Array.from(document.querySelectorAll("button, a"));
    const btn = btns.find((b) => {
      const t = (b.textContent || "").trim().toLowerCase();
      return t.includes("entrar na aula") || t.includes("iniciar aula") || t.includes("entrar / ocultar sala");
    });
    if (btn) {
      btn.click();
      return;
    }
    window.chbIrParaSecao("aulas_videos");
  };

  function garantirCSS() {
    if (document.getElementById("chbKosmoStyleCSS")) return;
    const st = document.createElement("style");
    st.id = "chbKosmoStyleCSS";
    st.textContent = `
      @media (min-width: 1024px) {
        body.chb-kosmo-mode {
          padding-left: 268px !important;
        }
        #chbKosmoSidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 268px;
          overflow-y: auto;
          z-index: 40;
        }
      }
      @media (max-width: 1023px) {
        body.chb-kosmo-mode {
          padding-left: 0 !important;
        }
        #chbKosmoSidebar {
          position: relative;
          width: 100%;
          z-index: 30;
        }
      }
      .barra-mover-bloco-chb {
        display: none !important;
      }
    `;
    document.head.appendChild(st);
  }

  window.chbRenderLayoutKosmo = function () {
    let shell = document.getElementById("layoutKosmoCHB");
    if (!shell) {
      shell = document.createElement("div");
      shell.id = "layoutKosmoCHB";
      document.body.insertBefore(shell, document.body.firstChild);
    }

    if (!sessaoAtiva) {
      shell.style.display = "none";
      document.body.classList.remove("chb-kosmo-mode");
      return;
    }

    garantirCSS();
    shell.style.display = "";
    document.body.classList.add("chb-kosmo-mode");

    const u = obterUsuario();
    const menus = menusDisponiveis(u.admin);
    const atualObj = menus.find((m) => m.id === secaoAtiva) || menus[0];

    const totalMembros = lerArray("crosshitbox_perfis_completos_v1").length;
    const totalTurnos = lerArray("crosshitbox_turnos_v1").length || 2;
    const totalVideos = lerArray("crosshitbox_videos_aulas_v1").length;

    shell.innerHTML = `
      <aside id="chbKosmoSidebar" class="bg-slate-950 border-r border-b lg:border-b-0 border-slate-800 p-4 flex flex-col justify-between gap-4 text-xs">
        <div class="space-y-4">
          <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center space-y-2">
            <div class="flex justify-center">
              ${
                u.foto
                  ? `<img src="${u.foto}" alt="${u.nome}" class="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500">`
                  : `<div class="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center text-xl font-black text-amber-400">${(u.nome || "C")[0].toUpperCase()}</div>`
              }
            </div>
            <div class="font-black text-white text-sm truncate">${u.nome}</div>
            <div class="text-[11px] text-slate-400 truncate">${u.subtitulo}</div>
            <label class="inline-block px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] cursor-pointer">
              Carregar / Trocar Foto
              <input type="file" accept="image/*" onchange="chbTrocarFotoUsuario(this)" class="hidden">
            </label>
          </div>

          <nav class="space-y-1">
            ${menus.map((m) => {
              const ativa = !verTudo && m.id === secaoAtiva;
              return `
                <button type="button" onclick="chbIrParaSecao('${m.id}')" class="w-full text-left px-3 py-2.5 rounded-xl font-bold transition ${
                  ativa ? "bg-amber-500 text-slate-950 shadow" : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }">
                  ${m.titulo}
                </button>
              `;
            }).join("")}
          </nav>
        </div>

        <div class="space-y-2 pt-3 border-t border-slate-800">
          <button type="button" onclick="chbEntrarAulaDireta()" class="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">
            Entrar na Aula Online
          </button>
          <button type="button" onclick="chbIrParaSecao('aulas_videos')" class="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold">
            Ver Vídeos de Aulas
          </button>
          <button type="button" onclick="chbToggleVerTudo()" class="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-[11px]">
            ${verTudo ? "Voltar a 1 Espaço por Vez" : "Mostrar Tudo na Página"}
          </button>
        </div>
      </aside>

      <div class="max-w-6xl mx-auto px-3 sm:px-6 pt-4 pb-2">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            ${
              u.foto
                ? `<img src="${u.foto}" alt="${u.nome}" class="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500 shrink-0">`
                : `<div class="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-amber-500/60 flex items-center justify-center text-lg font-black text-amber-400 shrink-0">${(u.nome || "C")[0].toUpperCase()}</div>`
            }
            <div>
              <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">${verTudo ? "Vista Completa" : atualObj.titulo}</div>
              <h1 class="text-lg sm:text-xl font-black text-white">${u.nome}</h1>
              <p class="text-xs text-slate-400">${atualObj.desc}</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center text-xs shrink-0">
            <div class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <div class="text-[10px] text-slate-400 uppercase">${u.admin ? "Membros" : "Acesso"}</div>
              <div class="text-base font-black text-white">${u.admin ? totalMembros : "Ativo"}</div>
            </div>
            <div class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <div class="text-[10px] text-slate-400 uppercase">Turnos</div>
              <div class="text-base font-black text-amber-400">${totalTurnos}</div>
            </div>
            <div class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <div class="text-[10px] text-slate-400 uppercase">Vídeos</div>
              <div class="text-base font-black text-emerald-400">${totalVideos}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  function verificarSessao() {
    const bodyText = document.body ? (document.body.innerText || "") : "";
    const temSair = Array.from(document.querySelectorAll("button, a")).some((b) => {
      const t = (b.textContent || "").trim().toLowerCase();
      return (t === "sair" || t === "terminar sessão" || t === "logout") && b.offsetParent !== null;
    });
    const temArea =
      bodyText.includes("Sessão ativa como:") ||
      bodyText.includes("Atleta Autenticado") ||
      bodyText.includes("Configurar Sala de Videochamada");
    const ativa = Boolean(temSair || temArea);
    if (ativa !== sessaoAtiva) {
      sessaoAtiva = ativa;
      window.chbRenderLayoutKosmo();
      aplicarVisibilidadeLimpa();
    } else if (sessaoAtiva) {
      aplicarVisibilidadeLimpa();
    }
  }

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button, a");
    if (btn && ["sair", "terminar sessão", "logout"].includes((btn.textContent || "").trim().toLowerCase())) {
      sessaoAtiva = false;
      secaoAtiva = "dashboard";
      verTudo = false;
      window.chbRenderLayoutKosmo();
      return;
    }
    setTimeout(verificarSessao, 150);
    setTimeout(verificarSessao, 500);
  });

  document.addEventListener("submit", () => {
    setTimeout(verificarSessao, 250);
    setTimeout(verificarSessao, 700);
  });

  setInterval(verificarSessao, 700);
  setTimeout(verificarSessao, 300);
})();
