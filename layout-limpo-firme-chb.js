(function () {
  if (window.__chbLayoutLimpoFirme) return;
  window.__chbLayoutLimpoFirme = true;

  let abaAtual = "dashboard";
  let verTudo = false;
  let jaInicializou = false;

  function ehAdmin() {
    const p = (window.location.pathname || "").toLowerCase();
    const t = document.body ? (document.body.innerText || "") : "";
    return p.includes("admin") || t.includes("Painel Administrativo") || t.includes("Configurar Sala de Videochamada");
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

  function obterDadosUsuario(admin) {
    const perfis = lerArray("crosshitbox_perfis_completos_v1");
    let foto = "";
    let nome = admin ? "Admin • Treinador Silvio" : "Atleta • CrossHitBox Tae";
    let subtitulo = admin ? "CrossHitBox Tae • Gestão & Comando" : "CrossHitBox Tae • Área do Atleta";

    if (admin) {
      foto = localStorage.getItem("crosshitbox_admin_foto_v1") || "";
    } else {
      const comFoto = perfis.find((p) => p && (p.foto_url || p.foto || p.avatar));
      if (comFoto) {
        foto = comFoto.foto_url || comFoto.foto || comFoto.avatar || "";
        nome = comFoto.nome || nome;
        subtitulo = comFoto.turno ? `${comFoto.turno} • ${comFoto.email || ""}` : subtitulo;
      }
    }

    return { admin, nome, subtitulo, foto };
  }

  function listasAbas(admin) {
    if (admin) {
      return [
        { id: "dashboard", label: "Dashboard Geral", desc: "Foto, visão geral, aula ao vivo e comando" },
        { id: "aulas_videos", label: "Aulas Online & Vídeos", desc: "Sala de videochamada e vídeos de aulas gravadas" },
        { id: "membros_turnos", label: "Membros & Turnos", desc: "Turnos, atletas, inscrições e presenças" },
        { id: "financeiro", label: "Mensalidades & Recibos", desc: "Comprovativos, validações, edição e recibos" },
        { id: "avaliacao", label: "Avaliação, Fotos & Dossiê", desc: "Foto do atleta, fotos físicas, evolução e dossiê" },
        { id: "operacao", label: "WOD, Radar & WhatsApp", desc: "WOD, selos, evasão, lembretes e alertas" }
      ];
    }
    return [
      { id: "dashboard", label: "Dashboard Geral", desc: "Resumo, foto, sequência, aula ao vivo e check-in" },
      { id: "aulas_videos", label: "Aula Online & Vídeos", desc: "Entrar na aula ao vivo, vídeos e cronómetro" },
      { id: "progresso", label: "Ficha, Fotos, Plano & Dossiê", desc: "Ficha, fotos por parte do corpo, plano e dossiê" },
      { id: "mensalidade", label: "Mensalidade & Conta", desc: "Estado do pagamento, comprovativo e senha" }
    ];
  }

  function correspondeSecao(texto, aba, admin) {
    if (aba === "dashboard") {
      if (admin) {
        return texto.includes("Iniciar Aula Online") || texto.includes("TOTAL DE ATLETAS") || texto.includes("Modo Comando ao Vivo");
      }
      return texto.includes("Atleta Autenticado") || texto.includes("Aula a decorrer agora") || texto.includes("Sequência de Fogo");
    }
    if (aba === "aulas_videos") {
      return texto.includes("Aula Online") || texto.includes("Configurar Sala de Videochamada") || texto.includes("Vídeos de Aulas") || texto.includes("Publicar Vídeo") || texto.includes("Cronómetro HIIT");
    }
    if (aba === "membros_turnos") {
      return texto.includes("Gestão de Turnos") || texto.includes("Validação de Inscrição") || texto.includes("Presenças & Assiduidade") || (texto.includes("Nome") && texto.includes("E-mail") && texto.includes("Turno"));
    }
    if (aba === "financeiro") {
      return texto.includes("Mensalidades & Comprovativos") || texto.includes("Controlo Total de Mensalidades");
    }
    if (aba === "avaliacao" || aba === "progresso") {
      return texto.includes("Ficha do Atleta") || texto.includes("Foto do Atleta & Avaliação Física") || texto.includes("Dossiê de Progresso") || texto.includes("Relatório de Performance") || texto.includes("Plano de Alimentação") || texto.includes("Evolução Corporal") || texto.includes("Relatórios Automáticos");
    }
    if (aba === "operacao") {
      return texto.includes("Treino do Dia (WOD)") || texto.includes("Radar de Risco") || texto.includes("Constância & Selos") || texto.includes("Lembretes de Aula") || texto.includes("Alertas de Patologias") || texto.includes("Relatório Mensal Consolidado") || texto.includes("Alterar Utilizador");
    }
    if (aba === "mensalidade") {
      return texto.includes("Mensalidade & Comprovativo") || texto.includes("Alterar Password");
    }
    return true;
  }

  function aplicarFiltroUmaVez() {
    const shell = document.getElementById("layoutLimpoFirmeCHB");
    if (!shell) return;
    const admin = ehAdmin();

    const blocos = Array.from(document.querySelectorAll("section, main > div, body > div")).filter((el) => {
      if (!el || el.id === "layoutLimpoFirmeCHB" || el.id === "overlayBloqueioPagamentoCHB") return false;
      if (el.contains(shell)) return false;
      const t = (el.innerText || "").trim();
      return t.length >= 25;
    });

    if (verTudo) {
      blocos.forEach((el) => {
        el.style.display = "";
      });
      return;
    }

    blocos.forEach((el) => {
      if (el.id === "overlayBloqueioPagamentoCHB") {
        el.style.display = "";
        return;
      }
      const txt = el.innerText || "";
      el.style.display = correspondeSecao(txt, abaAtual, admin) ? "" : "none";
    });
  }

  function injetarCSS() {
    if (document.getElementById("chbLayoutLimpoCSS")) return;
    const style = document.createElement("style");
    style.id = "chbLayoutLimpoCSS";
    style.textContent = `
      @media (min-width: 1024px) {
        body.chb-layout-firme {
          padding-left: 266px !important;
        }
        #chbMenuLateralFirme {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 266px;
          overflow-y: auto;
          z-index: 40;
        }
      }
      @media (max-width: 1023px) {
        body.chb-layout-firme {
          padding-left: 0 !important;
        }
        #chbMenuLateralFirme {
          position: relative;
          width: 100%;
          z-index: 30;
        }
      }
      .barra-mover-bloco-chb {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  window.chbEscolherAbaFirme = function (novaAba) {
    abaAtual = novaAba || "dashboard";
    verTudo = false;
    renderizarUmaVez();
    aplicarFiltroUmaVez();
  };

  window.chbAlternarVerTudoFirme = function () {
    verTudo = !verTudo;
    renderizarUmaVez();
    aplicarFiltroUmaVez();
  };

  window.chbFotoTopoFirme = function (inp) {
    const file = inp && inp.files && inp.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const url = String(ev.target.result || "");
      if (!url) return;
      const admin = ehAdmin();
      if (admin) {
        try { localStorage.setItem("crosshitbox_admin_foto_v1", url); } catch {}
      } else {
        const perfis = lerArray("crosshitbox_perfis_completos_v1");
        if (perfis.length > 0) {
          perfis[0].foto_url = url;
          try { localStorage.setItem("crosshitbox_perfis_completos_v1", JSON.stringify(perfis)); } catch {}
        }
      }
      renderizarUmaVez();
    };
    reader.readAsDataURL(file);
  };

  window.chbEntrarAulaFirme = function () {
    const btns = Array.from(document.querySelectorAll("button, a"));
    const btn = btns.find((b) => {
      const t = (b.textContent || "").trim().toLowerCase();
      return t.includes("entrar na aula") || t.includes("iniciar aula") || t.includes("entrar / ocultar sala");
    });
    if (btn) {
      btn.click();
      return;
    }
    window.chbEscolherAbaFirme("aulas_videos");
  };

  function renderizarUmaVez() {
    injetarCSS();
    document.body.classList.add("chb-layout-firme");

    let shell = document.getElementById("layoutLimpoFirmeCHB");
    if (!shell) {
      shell = document.createElement("div");
      shell.id = "layoutLimpoFirmeCHB";
      document.body.insertBefore(shell, document.body.firstChild);
    }

    const admin = ehAdmin();
    const u = obterDadosUsuario(admin);
    const abas = listasAbas(admin);
    const atual = abas.find((x) => x.id === abaAtual) || abas[0];

    const totalMembros = lerArray("crosshitbox_perfis_completos_v1").length;
    const totalTurnos = lerArray("crosshitbox_turnos_v1").length || 2;
    const totalVideos = lerArray("crosshitbox_videos_aulas_v1").length;

    shell.innerHTML = `
      <aside id="chbMenuLateralFirme" class="bg-slate-950 border-r border-b lg:border-b-0 border-slate-800 p-4 flex flex-col justify-between gap-4 text-xs">
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
              <input type="file" accept="image/*" onchange="chbFotoTopoFirme(this)" class="hidden">
            </label>
          </div>

          <nav class="space-y-1">
            ${abas.map((ab) => {
              const ativa = !verTudo && ab.id === abaAtual;
              return `
                <button type="button" onclick="chbEscolherAbaFirme('${ab.id}')" class="w-full text-left px-3 py-2.5 rounded-xl font-bold transition ${
                  ativa ? "bg-amber-500 text-slate-950 shadow" : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }">
                  ${ab.label}
                </button>
              `;
            }).join("")}
          </nav>
        </div>

        <div class="space-y-2 pt-3 border-t border-slate-800">
          <button type="button" onclick="chbEntrarAulaFirme()" class="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">
            Entrar na Aula Online
          </button>
          <button type="button" onclick="chbEscolherAbaFirme('aulas_videos')" class="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold">
            Ver Vídeos de Aulas
          </button>
          <button type="button" onclick="chbAlternarVerTudoFirme()" class="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-[11px]">
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
              <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">${verTudo ? "Vista Completa" : atual.label}</div>
              <h1 class="text-lg sm:text-xl font-black text-white">${u.nome}</h1>
              <p class="text-xs text-slate-400">${atual.desc}</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center text-xs shrink-0">
            <div class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <div class="text-[10px] text-slate-400 uppercase">${admin ? "Atletas" : "Acesso"}</div>
              <div class="text-base font-black text-white">${admin ? totalMembros : "Ativo"}</div>
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
  }

  function iniciarUmaVez() {
    if (jaInicializou) return;
    jaInicializou = true;
    renderizarUmaVez();
    setTimeout(aplicarFiltroUmaVez, 350);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(iniciarUmaVez, 250));
  } else {
    setTimeout(iniciarUmaVez, 250);
  }
})();
