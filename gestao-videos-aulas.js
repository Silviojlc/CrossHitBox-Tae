(function () {
  if (document.getElementById("gestaoVideosModulo")) return;

  const KEY_VIDEOS = "crosshitbox_videos_aulas_v1";
  let sessaoAtiva = false;

  function detectarAdmin() {
    const p = (window.location.pathname || "").toLowerCase();
    const txt = document.body ? (document.body.innerText || "") : "";
    return p.includes("admin") || txt.includes("Painel Administrativo") || txt.includes("Configurar Sala de Videochamada");
  }

  function lerCache() {
    try {
      const raw = localStorage.getItem(KEY_VIDEOS);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function gravarCache(lista) {
    try {
      localStorage.setItem(KEY_VIDEOS, JSON.stringify(Array.isArray(lista) ? lista : []));
    } catch {}
  }

  async function buscarVideosServidor() {
    try {
      const res = await fetch("/api/crosshitbox/videos-aulas?_=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.videos)) {
          gravarCache(data.videos);
          return data.videos;
        }
      }
    } catch {}
    return lerCache();
  }

  window.chbAdicionarVideoAula = async function (ev) {
    if (ev) ev.preventDefault();
    const titulo = (document.getElementById("vidTituloInput")?.value || "").trim();
    const link = (document.getElementById("vidLinkInput")?.value || "").trim();
    const turno = document.getElementById("vidTurnoSelect")?.value || "TODOS";
    const descricao = (document.getElementById("vidDescInput")?.value || "").trim();

    if (!titulo || !link) return;

    const novo = {
      id: "VID-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      titulo,
      link,
      turno,
      descricao,
      atualizado_em: new Date().toISOString()
    };

    try {
      const res = await fetch("/api/crosshitbox/videos-aulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novo)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.videos)) {
          gravarCache(data.videos);
        } else {
          const atual = lerCache();
          atual.unshift(novo);
          gravarCache(atual);
        }
      } else {
        const atual = lerCache();
        atual.unshift(novo);
        gravarCache(atual);
      }
    } catch {
      const atual = lerCache();
      atual.unshift(novo);
      gravarCache(atual);
    }

    if (document.getElementById("vidTituloInput")) document.getElementById("vidTituloInput").value = "";
    if (document.getElementById("vidLinkInput")) document.getElementById("vidLinkInput").value = "";
    if (document.getElementById("vidDescInput")) document.getElementById("vidDescInput").value = "";

    await window.renderGestaoVideosUI();
  };

  window.chbRemoverVideoAula = async function (id) {
    if (!id) return;

    const filtradaLocal = lerCache().filter((v) => String(v.id) !== String(id));
    gravarCache(filtradaLocal);

    try {
      const res = await fetch("/api/crosshitbox/videos-aulas/" + encodeURIComponent(id), {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.videos)) {
          gravarCache(data.videos);
        }
      }
    } catch {}

    await window.renderGestaoVideosUI();
  };

  window.renderGestaoVideosUI = async function () {
    const alvo = document.getElementById("conteudoGestaoVideos");
    if (!alvo) return;
    const isAdmin = detectarAdmin();
    const videos = await buscarVideosServidor();

    if (isAdmin) {
      alvo.innerHTML = `
        <div class="space-y-4 text-xs">
          <form onsubmit="chbAdicionarVideoAula(event)" class="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input id="vidTituloInput" type="text" required placeholder="Título da aula ou treino (ex: Choque HIIT 05:00)" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            <input id="vidLinkInput" type="url" required placeholder="Link do vídeo (YouTube / Drive / MP4)" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            <select id="vidTurnoSelect" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold">
              <option value="TODOS">Todos os Turnos</option>
              <option value="05:00 - Madrugada">05:00 - Madrugada</option>
              <option value="18:00 - Tarde">18:00 - Tarde</option>
            </select>
            <button type="submit" class="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-2">Adicionar e Guardar</button>
            <input id="vidDescInput" type="text" placeholder="Observações / foco do treino (opcional)" class="md:col-span-4 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200">
          </form>

          ${
            videos.length
              ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  ${videos.map((v) => `
                    <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div class="space-y-1">
                        <div class="flex items-center justify-between gap-2">
                          <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]">${v.turno || "TODOS"}</span>
                          <button type="button" onclick="chbRemoverVideoAula('${v.id}')" class="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]">Retirar Vídeo</button>
                        </div>
                        <div class="font-bold text-white text-sm pt-1">${v.titulo}</div>
                        ${v.descricao ? `<div class="text-slate-400">${v.descricao}</div>` : ""}
                        <a href="${v.link}" target="_blank" rel="noopener" class="inline-block text-sky-400 hover:underline break-all pt-1">${v.link}</a>
                      </div>
                    </div>
                  `).join("")}
                </div>`
              : `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400">Nenhum vídeo gravado de momento. Adiciona um novo link acima.</div>`
          }
        </div>
      `;
    } else {
      alvo.innerHTML = videos.length
        ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            ${videos.map((v) => `
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]">${v.turno || "TODOS"}</span>
                </div>
                <div class="font-bold text-white text-sm">${v.titulo}</div>
                ${v.descricao ? `<div class="text-slate-400">${v.descricao}</div>` : ""}
                <a href="${v.link}" target="_blank" rel="noopener" class="inline-block mt-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">Assistir Aula / Abrir Link</a>
              </div>
            `).join("")}
          </div>`
        : `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">Ainda não existem vídeos de aulas publicados neste momento.</div>`;
    }
  };

  const container = document.createElement("section");
  container.id = "gestaoVideosModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-sky-500/40 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-sky-400">${detectarAdmin() ? "Gestão Persistente de Vídeos de Aulas & Links" : "Vídeos de Aulas Gravadas & Links de Treino"}</h2>
        <p class="text-xs text-slate-400">${detectarAdmin() ? "Adiciona ou remove vídeos com gravação direta na base de dados para não voltarem ao saíres e voltares." : "Acede às gravações e links oficiais disponibilizados para o teu treino."}</p>
      </div>
      <button type="button" onclick="renderGestaoVideosUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Sincronizar</button>
    </div>
    <div id="conteudoGestaoVideos"></div>
  `;

  const refEl = document.getElementById("modoComandoModulo") || document.getElementById("relatorioNutricaoModulo") || document.body.firstChild;
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("gestaoVideosModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.renderGestaoVideosUI();
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
