(function () {
  if (document.getElementById("avaliacaoFotosFisicasModulo")) return;

  const KEY_PERFIS = "crosshitbox_perfis_completos_v1";
  const KEY_FOTOS_AVAL = "crosshitbox_fotos_avaliacao_v1";
  let sessaoAtiva = false;

  const PARTES_CORPO = [
    "Frente (Postura Geral)",
    "Costas (Postura Dorsal)",
    "Perfil Lateral (Direito / Esquerdo)",
    "Abdómen & Cintura",
    "Membros Superiores / Inferiores"
  ];

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

  function gravarArray(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.isArray(arr) ? arr : []));
    } catch {}
  }

  function obterEmailAtleta() {
    const txt = document.body ? (document.body.innerText || "") : "";
    const m = txt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (m) return m[0].toLowerCase();
    const inputs = Array.from(document.querySelectorAll("input"));
    for (const inp of inputs) {
      const v = (inp.value || "").trim().toLowerCase();
      if (v.includes("@")) return v;
    }
    return "atleta@crosshitbox.cv";
  }

  function comprimirImagemBase64(file, maxLargura = 900, qualidade = 0.75) {
    return new Promise((resolve) => {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
          let w = img.width || maxLargura;
          let h = img.height || maxLargura;
          if (w > maxLargura) {
            h = Math.round((h * maxLargura) / w);
            w = maxLargura;
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          try {
            resolve(canvas.toDataURL("image/jpeg", qualidade));
          } catch {
            resolve(String(ev.target.result || ""));
          }
        };
        img.onerror = () => resolve(String(ev.target.result || ""));
        img.src = String(ev.target.result || "");
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  async function carregarDadosAvaliacao(emailAlvo) {
    const em = (emailAlvo || obterEmailAtleta()).toLowerCase();
    let perfis = lerArray(KEY_PERFIS);
    let fotosLista = lerArray(KEY_FOTOS_AVAL);

    try {
      const [rP, rF] = await Promise.all([
        fetch("/api/crosshitbox/perfis-completos?_=" + Date.now(), { cache: "no-store" }).catch(() => null),
        fetch("/api/crosshitbox/fotos-avaliacao?email=" + encodeURIComponent(em) + "&_=" + Date.now(), { cache: "no-store" }).catch(() => null)
      ]);
      if (rP && rP.ok) {
        const d = await rP.json();
        if (Array.isArray(d.perfis) && d.perfis.length) {
          perfis = d.perfis;
          gravarArray(KEY_PERFIS, perfis);
        }
      }
      if (rF && rF.ok) {
        const d = await rF.json();
        if (Array.isArray(d.fotos)) {
          fotosLista = d.fotos;
          gravarArray(KEY_FOTOS_AVAL, fotosLista);
        }
      }
    } catch {}

    const perfil = perfis.find((x) => (x.email || "").toLowerCase() === em) || { email: em, nome: em.split("@")[0] };
    const fotoPerfil = perfil.foto_url || perfil.foto || perfil.avatar || "";
    const fotosAtleta = fotosLista.filter((f) => (f.email || "").toLowerCase() === em);

    return { email: em, perfil, fotoPerfil, fotosAtleta };
  }

  // Garante que qualquer bloco da ficha que mencione "Ficha do Atleta" exiba a foto de perfil se existir
  function sincronizarFotoNaFichaExistente(fotoPerfil, nomeAtleta) {
    if (!fotoPerfil) return;
    const seccoes = Array.from(document.querySelectorAll("section, div"));
    const fichaEl = seccoes.find((el) => {
      const t = (el.innerText || "");
      return t.includes("Ficha do Atleta") && el.offsetParent !== null;
    });
    if (!fichaEl) return;

    let imgTag = document.getElementById("fichaFotoPerfilSyncCHB");
    if (!imgTag) {
      imgTag = document.createElement("img");
      imgTag.id = "fichaFotoPerfilSyncCHB";
      imgTag.alt = "Foto do Atleta";
      imgTag.className = "w-20 h-20 rounded-2xl object-cover border-2 border-amber-500 shadow my-2";
      const cab = fichaEl.querySelector("h2, h3, p") || fichaEl.firstChild;
      if (cab && cab.parentNode) cab.parentNode.insertBefore(imgTag, cab.nextSibling);
    }
    if (imgTag.src !== fotoPerfil) imgTag.src = fotoPerfil;
    imgTag.title = nomeAtleta || "Atleta";
  }

  window.chbAtualizarFotoPerfilFicha = async function () {
    const inp = document.getElementById("avalFotoPerfilInput");
    const file = inp && inp.files && inp.files[0];
    if (!file) return;

    const email = (document.getElementById("avalEmailAlvoInput")?.value || obterEmailAtleta()).toLowerCase();
    const fotoBase64 = await comprimirImagemBase64(file, 600, 0.78);
    if (!fotoBase64) return;

    const perfis = lerArray(KEY_PERFIS);
    const idx = perfis.findIndex((p) => (p.email || "").toLowerCase() === email);
    const atualizado = Object.assign(idx >= 0 ? perfis[idx] : { email, nome: email.split("@")[0] }, {
      email,
      foto_url: fotoBase64,
      atualizado_em: new Date().toISOString()
    });
    if (idx >= 0) perfis[idx] = atualizado;
    else perfis.unshift(atualizado);
    gravarArray(KEY_PERFIS, perfis);

    try {
      await fetch("/api/crosshitbox/perfis-completos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(atualizado)
      });
    } catch {}

    await window.renderAvaliacaoFotosUI();
  };

  window.chbSalvarFotoParteCorpo = async function (ev) {
    if (ev) ev.preventDefault();
    const parte = document.getElementById("avalParteCorpoSelect")?.value || PARTES_CORPO[0];
    const obs = (document.getElementById("avalObsParteInput")?.value || "").trim();
    const file = document.getElementById("avalParteArquivoInput")?.files?.[0];
    if (!file) return;

    const email = (document.getElementById("avalEmailAlvoInput")?.value || obterEmailAtleta()).toLowerCase();
    const imagemBase64 = await comprimirImagemBase64(file, 960, 0.75);
    if (!imagemBase64) return;

    const registro = {
      id: "FAV-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      email,
      parte_corpo: parte,
      observacao: obs,
      imagem_url: imagemBase64,
      data: new Date().toISOString().slice(0, 10),
      criado_em: new Date().toISOString()
    };

    const lista = lerArray(KEY_FOTOS_AVAL);
    lista.unshift(registro);
    gravarArray(KEY_FOTOS_AVAL, lista);

    try {
      await fetch("/api/crosshitbox/fotos-avaliacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registro)
      });
    } catch {}

    if (document.getElementById("avalParteArquivoInput")) document.getElementById("avalParteArquivoInput").value = "";
    if (document.getElementById("avalObsParteInput")) document.getElementById("avalObsParteInput").value = "";

    await window.renderAvaliacaoFotosUI();
  };

  window.chbRemoverFotoAvaliacao = async function (id) {
    if (!id) return;
    const restam = lerArray(KEY_FOTOS_AVAL).filter((f) => String(f.id) !== String(id));
    gravarArray(KEY_FOTOS_AVAL, restam);
    try {
      await fetch("/api/crosshitbox/fotos-avaliacao/" + encodeURIComponent(id), { method: "DELETE" });
    } catch {}
    await window.renderAvaliacaoFotosUI();
  };

  window.renderAvaliacaoFotosUI = async function () {
    const __ativo = document.activeElement;
    if (__ativo && ["INPUT","TEXTAREA","SELECT"].includes(__ativo.tagName) && document.hasFocus()) return;
    const alvo = document.getElementById("conteudoAvaliacaoFotos");
    if (!alvo) return;
    const isAdmin = detectarAdmin();
    const emailInputEl = document.getElementById("avalEmailAlvoInput");
    const emailAlvo = (emailInputEl && emailInputEl.value ? emailInputEl.value : obterEmailAtleta()).toLowerCase();

    const { perfil, fotoPerfil, fotosAtleta } = await carregarDadosAvaliacao(emailAlvo);
    sincronizarFotoNaFichaExistente(fotoPerfil, perfil.nome || emailAlvo);

    alvo.innerHTML = `
      <div class="space-y-4 text-xs">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div class="flex items-center gap-3.5">
            ${
              fotoPerfil
                ? `<img src="${fotoPerfil}" alt="Foto de Perfil" class="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shrink-0">`
                : `<div class="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg font-black text-amber-400 shrink-0">${(perfil.nome || emailAlvo || "A")[0].toUpperCase()}</div>`
            }
            <div class="min-w-0">
              <div class="text-slate-400 text-[11px] uppercase font-bold">Foto de Perfil na Ficha</div>
              <div class="text-sm font-bold text-white truncate">${perfil.nome || emailAlvo}</div>
              <div class="text-slate-400 truncate">${emailAlvo}</div>
            </div>
          </div>

          <div class="md:col-span-2 space-y-2">
            ${
              isAdmin
                ? `<div class="flex flex-wrap items-center gap-2">
                     <input id="avalEmailAlvoInput" type="email" value="${emailAlvo}" placeholder="E-mail do atleta na ficha..." class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white flex-1 min-w-[200px]">
                     <button type="button" onclick="renderAvaliacaoFotosUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold">Carregar Ficha</button>
                   </div>`
                : `<input id="avalEmailAlvoInput" type="hidden" value="${emailAlvo}">`
            }
            <div class="flex flex-wrap items-center gap-2">
              <label class="text-slate-300 font-semibold">Atualizar Foto de Perfil:</label>
              <input id="avalFotoPerfilInput" type="file" accept="image/*" onchange="chbAtualizarFotoPerfilFicha()" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 text-xs">
            </div>
          </div>
        </div>

        <form onsubmit="chbSalvarFotoParteCorpo(event)" class="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-slate-400 mb-1">Parte do Corpo / Vista</label>
            <select id="avalParteCorpoSelect" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold">
              ${PARTES_CORPO.map((pt) => `<option value="${pt}">${pt}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Foto da Avaliação Física *</label>
            <input id="avalParteArquivoInput" type="file" accept="image/*" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Observação (ex.: pré-ciclo, postura)</label>
            <input id="avalObsParteInput" type="text" placeholder="Ex: Avaliação inicial de novembro" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-2">Guardar Foto de Avaliação</button>
          </div>
        </form>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          ${
            fotosAtleta.length
              ? fotosAtleta.map((f) => `
                  <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-bold text-amber-300">${f.parte_corpo}</span>
                      <span class="text-slate-400 text-[11px]">${f.data || ""}</span>
                    </div>
                    <a href="${f.imagem_url}" target="_blank" rel="noopener" class="block overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                      <img src="${f.imagem_url}" alt="${f.parte_corpo}" class="w-full h-44 object-cover">
                    </a>
                    ${f.observacao ? `<div class="text-slate-300">${f.observacao}</div>` : ""}
                    <div class="flex justify-end">
                      <button type="button" onclick="chbRemoverFotoAvaliacao('${f.id}')" class="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]">Remover Foto</button>
                    </div>
                  </div>
                `).join("")
              : `<div class="col-span-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400">Ainda não existem fotos de avaliação física registadas para este atleta.</div>`
          }
        </div>
      </div>
    `;
  };

  const container = document.createElement("section");
  container.id = "avaliacaoFotosFisicasModulo";
  container.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-amber-500/40 rounded-2xl p-5 shadow-xl";
  container.style.display = "none";
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-base font-bold text-amber-400">Foto do Atleta &amp; Avaliação Física por Partes do Corpo</h2>
        <p class="text-xs text-slate-400">Garante a foto de perfil na ficha e permite anexar fotos por parte do corpo para acompanhar a evolução física.</p>
      </div>
      <button type="button" onclick="renderAvaliacaoFotosUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
    </div>
    <div id="conteudoAvaliacaoFotos"></div>
  `;

  const refEl = document.getElementById("dossierProgressoTaeModulo") || document.getElementById("modoComandoModulo") || document.body.firstChild;
  if (refEl && refEl.parentNode) {
    refEl.parentNode.insertBefore(container, refEl);
  } else {
    document.body.appendChild(container);
  }

  function aplicarVisibilidade() {
    const el = document.getElementById("avaliacaoFotosFisicasModulo");
    if (!el) return;
    if (sessaoAtiva) {
      el.classList.remove("hidden");
      el.style.display = "";
      window.renderAvaliacaoFotosUI();
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
    const temAreaAutenticada = bodyText.includes("Sessão ativa como:") || bodyText.includes("Atleta Autenticado") || bodyText.includes("Configurar Sala de Videochamada");
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

  setInterval(avaliarSessao, 600);
  aplicarVisibilidade();
})();
