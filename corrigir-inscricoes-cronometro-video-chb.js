(function () {
  if (window.__chbCorrecaoFinalTresPontos) return;
  window.__chbCorrecaoFinalTresPontos = true;

  const KEY_EXCLUIDOS = "crosshitbox_membros_excluidos_v1";
  const KEY_FOTOS_ATLETAS = "crosshitbox_fotos_perfis_v1";
  const KEY_VIDEOS_TREINOS = "crosshitbox_videos_programas_v1";
  const KEY_DESCRICOES_VIDEOS = "crosshitbox_descricoes_videos_v1";
  const CHAVES_MEMBROS = [
    "crosshitbox_membros_v1",
    "crosshitbox_inscricoes_v1",
    "crosshitbox_perfis_completos_v1",
    "crosshitbox_membros_ativos_v1",
    "chb_membros_v1"
  ];

  function ehAdmin() {
    return (window.location.pathname || "").toLowerCase().includes("admin");
  }

  function lerExcluidos() {
    try {
      const raw = localStorage.getItem(KEY_EXCLUIDOS);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set((Array.isArray(arr) ? arr : []).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean));
    } catch {
      return new Set();
    }
  }

  function guardarExcluido(identificador) {
    const limpo = String(identificador || "").trim().toLowerCase();
    if (!limpo) return;
    const set = lerExcluidos();
    set.add(limpo);
    try {
      localStorage.setItem(KEY_EXCLUIDOS, JSON.stringify(Array.from(set)));
    } catch {}
  }

  function lerFotosPerfis() {
    try {
      return JSON.parse(localStorage.getItem(KEY_FOTOS_ATLETAS) || "{}") || {};
    } catch {
      return {};
    }
  }

  function guardarFotoPerfil(chaveId, dataUrl) {
    const k = String(chaveId || "").trim().toLowerCase();
    if (!k) return;
    const mapa = lerFotosPerfis();
    if (dataUrl) mapa[k] = dataUrl;
    else delete mapa[k];
    try {
      localStorage.setItem(KEY_FOTOS_ATLETAS, JSON.stringify(mapa));
    } catch {}
  }

  function recolherTodosOsMembros() {
    const excl = lerExcluidos();
    const fotos = lerFotosPerfis();
    const mapa = new Map();

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.toLowerCase().includes("exclu")) continue;
      try {
        const val = JSON.parse(localStorage.getItem(k) || "null");
        const lista = Array.isArray(val) ? val : val && typeof val === "object" && Array.isArray(val.membros) ? val.membros : null;
        if (!lista) continue;
        lista.forEach((m) => {
          if (!m || typeof m !== "object") return;
          const nome = String(m.nome || m.name || m.atleta || "").trim();
          const email = String(m.email || m.correo || "").trim().toLowerCase();
          const idNorm = (email || nome || String(m.id || "")).trim().toLowerCase();
          if (!idNorm || excl.has(idNorm)) return;
          if (!nome && !email) return;
          const atual = mapa.get(idNorm) || {};
          mapa.set(idNorm, {
            id: m.id || atual.id || idNorm,
            nome: nome || atual.nome || "Atleta",
            email: email || atual.email || "",
            telefone: m.telefone || m.contacto || atual.telefone || "",
            turno: m.turno || atual.turno || "Quartas-feiras",
            senha: m.senha || m.password || atual.senha || "",
            foto: m.foto || fotos[idNorm] || atual.foto || "",
            aprovado: Boolean(m.aprovado === true || atual.aprovado === true),
            ativo: Boolean(m.ativo === true || atual.ativo === true),
            status: m.status || atual.status || "pendente"
          });
        });
      } catch {}
    }

    const sessAtual = String(sessionStorage.getItem("chb_sessao_membro_autenticada_v1") || "").trim();
    if (sessAtual) {
      const normSess = sessAtual.toLowerCase();
      if (!excl.has(normSess) && !mapa.has(normSess)) {
        const jaExistePorNome = Array.from(mapa.values()).some(
          (u) => String(u.nome || "").toLowerCase() === normSess || String(u.email || "").toLowerCase() === normSess
        );
        if (!jaExistePorNome) {
          mapa.set(normSess, {
            id: normSess,
            nome: sessAtual.includes("@") ? sessAtual.split("@")[0] : sessAtual,
            email: sessAtual.includes("@") ? sessAtual : "",
            telefone: "",
            turno: "Quartas-feiras",
            senha: "",
            foto: fotos[normSess] || "",
            aprovado: false,
            ativo: false,
            status: "pendente"
          });
        }
      }
    }

    return Array.from(mapa.values());
  }

  function estaAprovado(membro) {
    if (!membro) return false;
    const st = String(membro.status || "").trim().toLowerCase();
    return membro.aprovado === true || membro.ativo === true || st === "ativo" || st === "aprovado" || st === "approved";
  }

  function persistirListaMembros(lista) {
    CHAVES_MEMBROS.forEach((chave) => {
      try {
        localStorage.setItem(chave, JSON.stringify(lista));
      } catch {}
    });
  }

  // 1. PAINEL DE APROVAÇÃO E GESTÃO COMPLETA DE MEMBROS NO ADMIN
  function sincronizarInscricoesParaAdmin() {
    const unificada = recolherTodosOsMembros();
    persistirListaMembros(unificada);

    if (!ehAdmin()) return;

    const pendentes = unificada.filter((u) => !estaAprovado(u));
    let box = document.getElementById("chbPainelAprovacaoRapida");
    if (!box) {
      box = document.createElement("section");
      box.id = "chbPainelAprovacaoRapida";
      box.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
      const mainEl = document.querySelector("main") || document.body;
      mainEl.insertBefore(box, mainEl.firstChild);
    }

    box.innerHTML = `
      <div class="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 space-y-4 text-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div class="text-[10px] font-extrabold uppercase text-amber-400">Aprovação &amp; Gestão Completa de Membros</div>
            <div class="font-black text-white text-sm">Membros Aguardando Aprovação (${pendentes.length}) • Total de Membros (${unificada.length})</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" onclick="chbExportarBackupJSON()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-amber-500/30">
              Exportar Backup JSON
            </button>
            <label class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold border border-sky-500/30 cursor-pointer">
              Restaurar Backup
              <input type="file" accept=".json" onchange="chbImportarBackupJSON(this)" class="hidden">
            </label>
          </div>
        </div>

        <div id="chbListaPendentesAprovar" class="space-y-2">
          ${
            pendentes.length
              ? pendentes
                  .map((p, idx) => {
                    const chaveRef = String(p.email || p.nome || idx).replace(/'/g, "");
                    return `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div>
                    <div class="font-bold text-white">${p.nome || "Novo Atleta"} <span class="text-amber-400">• ${p.turno || "Quartas-feiras"}</span></div>
                    <div class="text-[11px] text-slate-400">${p.email || "Sem e-mail"} ${p.telefone ? "• " + p.telefone : ""}</div>
                  </div>
                  <button type="button" onclick="chbAprovarELiberarMembro('${chaveRef}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">
                    Aprovar e Liberar Acesso
                  </button>
                </div>
              `;
                  })
                  .join("")
              : `<div class="text-slate-400">Não há inscrições pendentes neste momento.</div>`
          }
        </div>

        <div class="border-t border-slate-800 pt-3 space-y-2">
          <div class="font-black text-sky-400 uppercase text-[11px]">Editar Membros, Resetar Senha, Modificar Foto &amp; Excluir</div>
          <div id="chbEditorMembroAdminBox" class="hidden bg-slate-950 border border-sky-500/40 rounded-xl p-3.5 space-y-2.5"></div>
          <div class="space-y-2 max-h-80 overflow-y-auto">
            ${
              unificada.length
                ? unificada
                    .map((m, i) => {
                      const refSafe = String(m.email || m.nome || i).replace(/'/g, "");
                      const fotoHtml = m.foto
                        ? `<img src="${m.foto}" alt="${m.nome}" class="w-9 h-9 rounded-full object-cover border border-amber-400/50 shrink-0">`
                        : `<div class="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">${(m.nome || "A").slice(0, 2).toUpperCase()}</div>`;
                      return `
                  <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                    <div class="flex items-center gap-2.5 min-w-0">
                      ${fotoHtml}
                      <div class="min-w-0">
                        <div class="font-bold text-white truncate">${m.nome || "Atleta"} <span class="text-[10px] px-2 py-0.5 rounded ${estaAprovado(m) ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}">${estaAprovado(m) ? "Ativo" : "Pendente"}</span></div>
                        <div class="text-[11px] text-slate-400 truncate">${m.email || "Sem e-mail"} • ${m.turno || "Quartas-feiras"}</div>
                      </div>
                    </div>
                    <div class="flex flex-wrap gap-1.5 shrink-0">
                      <button type="button" onclick="chbAbrirEditorMembroAdmin('${refSafe}')" class="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold">
                        Editar / Foto / Senha
                      </button>
                      <button type="button" onclick="chbResetarSenhaMembroAdmin('${refSafe}')" class="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                        Resetar Senha
                      </button>
                      <button type="button" onclick="chbExcluirMembroAdmin('${refSafe}')" class="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold">
                        Excluir
                      </button>
                    </div>
                  </div>
                `;
                    })
                    .join("")
                : `<div class="text-slate-400">Nenhum membro registado.</div>`
            }
          </div>
        </div>
      </div>
    `;
  }

  // 1B. GESTOR PARA EDITAR OU REMOVER VÍDEOS E AULAS NO ADMIN
  function adicionarGestorEditarRemoverVideosAdmin() {
    if (!ehAdmin() || document.getElementById("chbGestorEditarRemoverVideos")) return;
    const alvoGestor = Array.from(document.querySelectorAll("section, div")).find((el) =>
      (el.innerText || "").includes("Associar Vídeos a Todos os Treinos & Programas")
    );
    const pai = (alvoGestor && alvoGestor.parentElement) || document.querySelector("main") || document.body;

    const box = document.createElement("div");
    box.id = "chbGestorEditarRemoverVideos";
    box.className = "mt-4 bg-slate-950 border border-sky-500/35 rounded-2xl p-4 space-y-3 text-xs";
    pai.appendChild(box);
    renderizarListaEditarRemoverVideos();
  }

  function renderizarListaEditarRemoverVideos() {
    const box = document.getElementById("chbGestorEditarRemoverVideos");
    if (!box) return;

    let dadosVid = { mapa: {}, extras: [] };
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY_VIDEOS_TREINOS) || "{}");
      if (parsed && typeof parsed === "object") {
        dadosVid = {
          mapa: parsed.mapa && typeof parsed.mapa === "object" ? parsed.mapa : {},
          extras: Array.isArray(parsed.extras) ? parsed.extras : []
        };
      }
    } catch {}

    let descMapa = {};
    try {
      descMapa = JSON.parse(localStorage.getItem(KEY_DESCRICOES_VIDEOS) || "{}") || {};
    } catch {}

    const idsVinculados = Object.keys(dadosVid.mapa).filter((k) => Boolean(dadosVid.mapa[k]));

    box.innerHTML = `
      <div class="font-black text-sky-400 uppercase text-[11px]">Editar ou Remover Vídeos Vinculados e Aulas Criadas</div>
      <div id="chbFormEditarVideoInline" class="hidden bg-slate-900 border border-sky-500/40 rounded-xl p-3 space-y-2"></div>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        ${
          idsVinculados.length
            ? idsVinculados
                .map((idVid) => {
                  const extraObj = dadosVid.extras.find((e) => e.id === idVid);
                  const tituloExib = (extraObj && extraObj.titulo) || idVid;
                  const urlExib = dadosVid.mapa[idVid] || "";
                  const descExib = descMapa[idVid] || "";
                  const idSafe = String(idVid).replace(/'/g, "");
                  return `
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <div class="min-w-0">
                  <div class="font-bold text-white truncate">${tituloExib}</div>
                  <div class="text-[11px] text-slate-400 truncate">${urlExib}</div>
                  ${descExib ? `<div class="text-[10px] text-amber-300 truncate">${descExib}</div>` : ""}
                </div>
                <div class="flex gap-1.5 shrink-0">
                  <button type="button" onclick="chbPrepararEditarVideo('${idSafe}')" class="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold">
                    Editar Vídeo
                  </button>
                  <button type="button" onclick="chbRemoverVideoTreino('${idSafe}')" class="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold">
                    Remover Vídeo
                  </button>
                </div>
              </div>
            `;
                })
                .join("")
            : `<div class="text-slate-400">Ainda não há vídeos vinculados para editar ou remover.</div>`
        }
      </div>
    `;
  }

  window.chbPrepararEditarVideo = function (idVid) {
    let dadosVid = { mapa: {}, extras: [] };
    try {
      dadosVid = JSON.parse(localStorage.getItem(KEY_VIDEOS_TREINOS) || '{"mapa":{},"extras":[]}') || { mapa: {}, extras: [] };
    } catch {}
    let descMapa = {};
    try {
      descMapa = JSON.parse(localStorage.getItem(KEY_DESCRICOES_VIDEOS) || "{}") || {};
    } catch {}

    const formBox = document.getElementById("chbFormEditarVideoInline");
    if (!formBox) return;
    const extraObj = (dadosVid.extras || []).find((e) => e.id === idVid);
    formBox.classList.remove("hidden");
    formBox.innerHTML = `
      <div class="font-bold text-white">Editando Vídeo: <span class="text-sky-400">${(extraObj && extraObj.titulo) || idVid}</span></div>
      ${extraObj ? `<input id="chbEdVidTitulo" type="text" value="${extraObj.titulo || ""}" placeholder="Título da aula" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white">` : ""}
      <input id="chbEdVidUrl" type="url" value="${(dadosVid.mapa && dadosVid.mapa[idVid]) || ""}" placeholder="Novo link do vídeo" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white">
      <input id="chbEdVidDesc" type="text" value="${descMapa[idVid] || ""}" placeholder="Descrição do vídeo" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white">
      <div class="flex justify-end gap-2">
        <button type="button" onclick="document.getElementById('chbFormEditarVideoInline').classList.add('hidden')" class="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold">Cancelar</button>
        <button type="button" onclick="chbSalvarEdicaoVideo('${String(idVid).replace(/'/g, "")}')" class="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black">Guardar Vídeo</button>
      </div>
    `;
  };

  window.chbSalvarEdicaoVideo = function (idVid) {
    let dadosVid = { mapa: {}, extras: [] };
    try {
      dadosVid = JSON.parse(localStorage.getItem(KEY_VIDEOS_TREINOS) || '{"mapa":{},"extras":[]}') || { mapa: {}, extras: [] };
    } catch {}
    let descMapa = {};
    try {
      descMapa = JSON.parse(localStorage.getItem(KEY_DESCRICOES_VIDEOS) || "{}") || {};
    } catch {}

    const urlNovo = ((document.getElementById("chbEdVidUrl") || {}).value || "").trim();
    const descNovo = ((document.getElementById("chbEdVidDesc") || {}).value || "").trim();
    const titEl = document.getElementById("chbEdVidTitulo");

    if (urlNovo) dadosVid.mapa[idVid] = urlNovo;
    if (Array.isArray(dadosVid.extras)) {
      dadosVid.extras = dadosVid.extras.map((e) =>
        e && e.id === idVid ? { ...e, titulo: (titEl && titEl.value.trim()) || e.titulo } : e
      );
    }
    if (descNovo) descMapa[idVid] = descNovo;
    else delete descMapa[idVid];

    try {
      localStorage.setItem(KEY_VIDEOS_TREINOS, JSON.stringify(dadosVid));
      localStorage.setItem(KEY_DESCRICOES_VIDEOS, JSON.stringify(descMapa));
    } catch {}
    renderizarListaEditarRemoverVideos();
  };

  window.chbRemoverVideoTreino = function (idVid) {
    let dadosVid = { mapa: {}, extras: [] };
    try {
      dadosVid = JSON.parse(localStorage.getItem(KEY_VIDEOS_TREINOS) || '{"mapa":{},"extras":[]}') || { mapa: {}, extras: [] };
    } catch {}
    let descMapa = {};
    try {
      descMapa = JSON.parse(localStorage.getItem(KEY_DESCRICOES_VIDEOS) || "{}") || {};
    } catch {}

    if (dadosVid.mapa && idVid in dadosVid.mapa) {
      delete dadosVid.mapa[idVid];
    }
    if (Array.isArray(dadosVid.extras)) {
      dadosVid.extras = dadosVid.extras.filter((e) => e && e.id !== idVid);
    }
    if (idVid in descMapa) {
      delete descMapa[idVid];
    }

    try {
      localStorage.setItem(KEY_VIDEOS_TREINOS, JSON.stringify(dadosVid));
      localStorage.setItem(KEY_DESCRICOES_VIDEOS, JSON.stringify(descMapa));
    } catch {}
    renderizarListaEditarRemoverVideos();
  };

  // BACKUP E RESTAURO SEGURO EM JSON
  window.chbExportarBackupJSON = function () {
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) dump[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crosshitbox-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  window.chbImportarBackupJSON = function (inputEl) {
    if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || "{}"));
        if (obj && typeof obj === "object") {
          Object.keys(obj).forEach((k) => {
            if (typeof obj[k] === "string") {
              localStorage.setItem(k, obj[k]);
            }
          });
          sincronizarInscricoesParaAdmin();
          renderizarListaEditarRemoverVideos();
        }
      } catch {}
    };
    reader.readAsText(inputEl.files[0]);
  };

  window.chbAbrirEditorMembroAdmin = function (ref) {
    const alvo = String(ref || "").trim().toLowerCase();
    const lista = recolherTodosOsMembros();
    const m = lista.find(
      (u) => String(u.email || "").trim().toLowerCase() === alvo || String(u.nome || "").trim().toLowerCase() === alvo
    );
    const box = document.getElementById("chbEditorMembroAdminBox");
    if (!m || !box) return;

    box.classList.remove("hidden");
    box.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="font-black text-white text-xs">Editando Membro: <span class="text-sky-400">${m.nome}</span></div>
        <button type="button" onclick="document.getElementById('chbEditorMembroAdminBox').classList.add('hidden')" class="text-slate-400 hover:text-white font-bold">Fechar</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <input id="chbEdNome" type="text" value="${m.nome || ""}" placeholder="Nome" class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
        <input id="chbEdEmail" type="email" value="${m.email || ""}" placeholder="E-mail" class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
        <input id="chbEdTelefone" type="text" value="${m.telefone || ""}" placeholder="Telefone" class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
        <input id="chbEdTurno" type="text" value="${m.turno || ""}" placeholder="Turno" class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input id="chbEdSenha" type="text" value="${m.senha || ""}" placeholder="Palavra-passe / Nova senha" class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
        <input id="chbEdFotoUrl" type="text" value="${m.foto && !m.foto.startsWith("data:") ? m.foto : ""}" placeholder="URL da foto (opcional)" class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white">
        <input id="chbEdFotoFile" type="file" accept="image/*" class="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-[11px]">
      </div>
      <div class="flex items-center justify-between gap-2">
        <label class="flex items-center gap-1.5 text-slate-200 font-bold">
          <input id="chbEdAprovado" type="checkbox" ${estaAprovado(m) ? "checked" : ""}> Aprovado / Ativo
        </label>
        <button type="button" onclick="chbGuardarEdicaoMembroAdmin('${alvo.replace(/'/g, "")}')" class="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">
          Guardar Alterações do Membro
        </button>
      </div>
    `;
  };

  window.chbGuardarEdicaoMembroAdmin = function (alvoOriginal) {
    const alvo = String(alvoOriginal || "").trim().toLowerCase();
    const nomeNovo = (document.getElementById("chbEdNome") || {}).value || "";
    const emailNovo = ((document.getElementById("chbEdEmail") || {}).value || "").trim().toLowerCase();
    const telNovo = (document.getElementById("chbEdTelefone") || {}).value || "";
    const turnoNovo = (document.getElementById("chbEdTurno") || {}).value || "";
    const senhaNovo = (document.getElementById("chbEdSenha") || {}).value || "";
    const fotoUrlNovo = ((document.getElementById("chbEdFotoUrl") || {}).value || "").trim();
    const aprovadoNovo = Boolean((document.getElementById("chbEdAprovado") || {}).checked);
    const fileInput = document.getElementById("chbEdFotoFile");

    const aplicarGravacao = (fotoFinal) => {
      const lista = recolherTodosOsMembros().map((u) => {
        const em = String(u.email || "").trim().toLowerCase();
        const nm = String(u.nome || "").trim().toLowerCase();
        if (em === alvo || nm === alvo) {
          const chaveId = (emailNovo || em || nomeNovo || nm).toLowerCase();
          if (fotoFinal) guardarFotoPerfil(chaveId, fotoFinal);
          return {
            ...u,
            nome: nomeNovo.trim() || u.nome,
            email: emailNovo || u.email,
            telefone: telNovo.trim(),
            turno: turnoNovo.trim() || u.turno,
            senha: senhaNovo,
            password: senhaNovo,
            foto: fotoFinal || u.foto || "",
            aprovado: aprovadoNovo,
            ativo: aprovadoNovo,
            status: aprovadoNovo ? "ativo" : "pendente"
          };
        }
        return u;
      });
      persistirListaMembros(lista);
      sincronizarInscricoesParaAdmin();
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = () => aplicarGravacao(String(reader.result || ""));
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      aplicarGravacao(fotoUrlNovo || "");
    }
  };

  window.chbResetarSenhaMembroAdmin = function (ref) {
    const alvo = String(ref || "").trim().toLowerCase();
    const lista = recolherTodosOsMembros().map((u) => {
      const em = String(u.email || "").trim().toLowerCase();
      const nm = String(u.nome || "").trim().toLowerCase();
      if (em === alvo || nm === alvo) {
        return { ...u, senha: "123", password: "123" };
      }
      return u;
    });
    persistirListaMembros(lista);
    sincronizarInscricoesParaAdmin();
  };

  window.chbExcluirMembroAdmin = function (ref) {
    const alvo = String(ref || "").trim().toLowerCase();
    const lista = recolherTodosOsMembros().filter((u) => {
      const em = String(u.email || "").trim().toLowerCase();
      const nm = String(u.nome || "").trim().toLowerCase();
      const match = em === alvo || nm === alvo;
      if (match) {
        if (em) guardarExcluido(em);
        if (nm) guardarExcluido(nm);
      }
      return !match;
    });
    persistirListaMembros(lista);
    sincronizarInscricoesParaAdmin();
  };

  window.chbAprovarELiberarMembro = function (ref) {
    const alvo = String(ref || "").trim().toLowerCase();
    const listaAtual = recolherTodosOsMembros().map((m) => {
      const em = String(m.email || "").trim().toLowerCase();
      const nm = String(m.nome || "").trim().toLowerCase();
      if (!alvo || em === alvo || nm === alvo) {
        return { ...m, aprovado: true, ativo: true, status: "ativo" };
      }
      return m;
    });
    persistirListaMembros(listaAtual);
    sincronizarInscricoesParaAdmin();
  };

  // 2. BLOQUEAR ACESSO NO PERFIL DE ATLETA SE AINDA NÃO ESTIVER APROVADO PELO ADMIN
  function verificarAprovacaoAtleta() {
    if (ehAdmin()) return;
    const sessAtual = String(sessionStorage.getItem("chb_sessao_membro_autenticada_v1") || "").trim().toLowerCase();
    if (!sessAtual) return;

    const todos = recolherTodosOsMembros();
    const atleta = todos.find(
      (u) =>
        String(u.email || "").trim().toLowerCase() === sessAtual ||
        String(u.nome || "").trim().toLowerCase() === sessAtual
    );

    if (!atleta || !estaAprovado(atleta)) {
      if (!document.getElementById("chbBloqueioAprovacaoAtleta")) {
        const overlay = document.createElement("div");
        overlay.id = "chbBloqueioAprovacaoAtleta";
        overlay.style.cssText =
          "position:fixed;inset:0;z-index:99999;background:rgba(2,6,23,0.97);display:flex;align-items:center;justify-content:center;padding:20px;color:#f8fafc;text-align:center;";
        overlay.innerHTML = `
          <div style="max-width:460px;background:#0f172a;border:1px solid rgba(245,158,11,0.45);border-radius:16px;padding:24px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#fbbf24;margin-bottom:8px;">Acesso Pendente de Aprovação</div>
            <h2 style="font-size:20px;font-weight:900;margin:0 0 10px 0;">Aguarda Aprovação do Administrador</h2>
            <p style="font-size:13px;color:#cbd5e1;line-height:1.5;margin:0 0 18px 0;">
              A tua inscrição (<strong>${(atleta && atleta.nome) || sessAtual}</strong>) foi recebida, mas o acesso ao programa e aos treinos só é liberado após a aprovação do treinador/administrador.
            </p>
            <button type="button" onclick="sessionStorage.removeItem('chb_sessao_membro_autenticada_v1');window.location.reload();" style="padding:10px 18px;border-radius:10px;background:#f59e0b;color:#020617;font-weight:900;border:none;cursor:pointer;">
              Sair / Voltar ao Início
            </button>
          </div>
        `;
        document.body.appendChild(overlay);
      }
    } else {
      const ov = document.getElementById("chbBloqueioAprovacaoAtleta");
      if (ov) ov.remove();
    }
  }

  // 3. FUNÇÕES DO ATLETA: ALTERAR FOTO DE PERFIL + IMPRIMIR TODOS OS DADOS
  function adicionarFerramentasAtleta() {
    if (ehAdmin() || document.getElementById("chbFerramentasPerfilAtletaBox")) return;

    const sessAtual = String(sessionStorage.getItem("chb_sessao_membro_autenticada_v1") || "").trim();
    const fotos = lerFotosPerfis();
    const fotoAtual = fotos[sessAtual.toLowerCase()] || "";

    const box = document.createElement("section");
    box.id = "chbFerramentasPerfilAtletaBox";
    box.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    box.innerHTML = `
      <div class="bg-slate-900/95 border border-amber-500/35 rounded-2xl p-4 space-y-3 text-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div id="chbAvatarAtletaPreview" class="w-12 h-12 rounded-full overflow-hidden border border-amber-400/50 bg-slate-950 flex items-center justify-center shrink-0">
              ${
                fotoAtual
                  ? `<img src="${fotoAtual}" alt="Foto do Atleta" class="w-full h-full object-cover">`
                  : `<span class="text-xs font-black text-amber-400">${(sessAtual || "AT").slice(0, 2).toUpperCase()}</span>`
              }
            </div>
            <div>
              <div class="text-[10px] font-extrabold uppercase text-amber-400">Meu Perfil • Foto, Senha &amp; Impressão</div>
              <div class="font-black text-white text-sm">${sessAtual || "Atleta CrossHitBox Tae"}</div>
            </div>
          </div>
          <button type="button" onclick="chbImprimirFichaCompletaAtleta()" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">
            Imprimir Todos os Meus Dados
          </button>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <label class="text-slate-300 font-bold shrink-0">Alterar Foto de Perfil:</label>
          <input id="chbInputFotoAtleta" type="file" accept="image/*" onchange="chbAlterarFotoAtleta(this)" class="text-[11px] text-slate-300 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-sky-600 file:text-white file:font-bold">
          <span id="chbMsgFotoAtleta" class="text-emerald-400 font-bold"></span>
        </div>
      </div>
    `;

    const mainEl = document.querySelector("main") || document.body;
    mainEl.insertBefore(box, mainEl.firstChild);
  }

  window.chbAlterarFotoAtleta = function (inputEl) {
    if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const sessAtual = String(sessionStorage.getItem("chb_sessao_membro_autenticada_v1") || "").trim().toLowerCase() || "atleta";
      guardarFotoPerfil(sessAtual, dataUrl);
      const prev = document.getElementById("chbAvatarAtletaPreview");
      if (prev) prev.innerHTML = `<img src="${dataUrl}" alt="Foto do Atleta" class="w-full h-full object-cover">`;
      const msg = document.getElementById("chbMsgFotoAtleta");
      if (msg) msg.textContent = "Foto de perfil atualizada.";
    };
    reader.readAsDataURL(inputEl.files[0]);
  };

  window.chbImprimirFichaCompletaAtleta = function () {
    const sessAtual = String(sessionStorage.getItem("chb_sessao_membro_autenticada_v1") || "Atleta CrossHitBox Tae").trim();
    const fotos = lerFotosPerfis();
    const fotoAtual = fotos[sessAtual.toLowerCase()] || "";

    const secoesAlvo = Array.from(document.querySelectorAll("section")).filter((sec) => {
      if (!sec || sec.id === "chbBloqueioAprovacaoAtleta") return false;
      const txt = sec.innerText || "";
      return (
        txt.includes("Relatório") ||
        txt.includes("Evolução") ||
        txt.includes("Check-in") ||
        txt.includes("Histórico") ||
        txt.includes("Central Completa de Treino") ||
        txt.includes("Plano Alimentar")
      );
    });

    const conteudoSecoes = secoesAlvo.length
      ? secoesAlvo.map((s) => `<div style="margin-bottom:16px;padding:12px;border:1px solid #cbd5e1;border-radius:8px;">${s.innerHTML}</div>`).join("")
      : `<div>${(document.querySelector("main") || document.body).innerHTML}</div>`;

    const janela = window.open("", "_blank", "width=900,height=700");
    if (!janela) {
      window.print();
      return;
    }
    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Completo — ${sessAtual}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; background: #ffffff; padding: 24px; }
          .topo { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
          .topo img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #0f172a; }
          button, input, select, textarea { display: none !important; }
        </style>
      </head>
      <body>
        <div class="topo">
          ${fotoAtual ? `<img src="${fotoAtual}" alt="${sessAtual}">` : ""}
          <div>
            <h1 style="margin:0;font-size:20px;">Ficha &amp; Relatório Completo do Atleta</h1>
            <div style="font-size:13px;color:#334155;">Atleta: <strong>${sessAtual}</strong> • Emitido em ${new Date().toLocaleString("pt-PT")}</div>
          </div>
        </div>
        ${conteudoSecoes}
        <script>window.onload = function(){ window.print(); };<\/script>
      </body>
      </html>
    `);
    janela.document.close();
  };

  // 4. CRONÓMETRO HIIT / TABATA FUNCIONAL EM AMBOS OS PERFIS
  let hiitTimerId = null;
  let hiitSegundosRestantes = 40;
  let hiitFaseTrabalho = true;
  let hiitRoundAtual = 1;
  let hiitEmExecucao = false;

  function obterCartaoHiitExato() {
    const candidatos = Array.from(document.querySelectorAll("section, div"));
    return (
      candidatos.find((el) => {
        const t = el.innerText || "";
        return t.includes("Cronómetro HIIT / Tabata") && t.includes("Round") && el.querySelector("button");
      }) || null
    );
  }

  function lerConfigHiit(cartao) {
    let treino = 40;
    let descanso = 20;
    let totalRounds = 8;
    if (!cartao) return { treino, descanso, totalRounds };

    const inputs = Array.from(cartao.querySelectorAll("input[type='number'], input"));
    inputs.forEach((inp) => {
      const rotulo = ((inp.parentElement && inp.parentElement.innerText) || "").toLowerCase();
      const val = parseInt(inp.value, 10);
      if (!Number.isFinite(val) || val <= 0) return;
      if (rotulo.includes("treino")) treino = val;
      else if (rotulo.includes("descanso")) descanso = val;
      else if (rotulo.includes("round")) totalRounds = val;
    });

    if (inputs.length >= 3) {
      const v0 = parseInt(inputs[0].value, 10);
      const v1 = parseInt(inputs[1].value, 10);
      const v2 = parseInt(inputs[2].value, 10);
      if (Number.isFinite(v0) && v0 > 0) treino = v0;
      if (Number.isFinite(v1) && v1 > 0) descanso = v1;
      if (Number.isFinite(v2) && v2 > 0) totalRounds = v2;
    }

    return { treino, descanso, totalRounds };
  }

  function atualizarVisorHiitIsolado() {
    const cartao = obterCartaoHiitExato();
    if (!cartao) return;

    const cfg = lerConfigHiit(cartao);
    const mm = String(Math.floor(hiitSegundosRestantes / 60)).padStart(2, "0");
    const ss = String(hiitSegundosRestantes % 60).padStart(2, "0");
    const relogioStr = `${mm}:${ss}`;

    let visorTempo = null;
    let maiorTamanho = 0;
    cartao.querySelectorAll("div, span, p, strong").forEach((el) => {
      if (el.children.length === 0) {
        const txt = (el.textContent || "").trim();
        if (/^\d{1,2}:\d{2}$/.test(txt)) {
          const fs = parseFloat(window.getComputedStyle(el).fontSize) || 0;
          if (fs >= maiorTamanho) {
            maiorTamanho = fs;
            visorTempo = el;
          }
        }
      }
    });
    if (visorTempo) {
      visorTempo.textContent = relogioStr;
    }

    cartao.querySelectorAll("div, span, p").forEach((el) => {
      if (el.children.length === 0 && /round\s+\d+/i.test(el.textContent || "")) {
        el.textContent = `Round ${hiitRoundAtual} de ${cfg.totalRounds}`;
      }
    });

    cartao.querySelectorAll("div, span").forEach((el) => {
      if (el.children.length === 0) {
        const t = (el.textContent || "").trim().toUpperCase();
        if (t === "TRABALHO" || t === "DESCANSO" || t === "PRONTO") {
          el.textContent = hiitFaseTrabalho ? "TRABALHO" : "DESCANSO";
        }
      }
    });
  }

  function passoSegundoHiit() {
    if (!hiitEmExecucao) return;
    const cfg = lerConfigHiit(obterCartaoHiitExato());

    if (hiitSegundosRestantes > 1) {
      hiitSegundosRestantes -= 1;
    } else if (hiitFaseTrabalho) {
      hiitFaseTrabalho = false;
      hiitSegundosRestantes = cfg.descanso;
    } else if (hiitRoundAtual < cfg.totalRounds) {
      hiitRoundAtual += 1;
      hiitFaseTrabalho = true;
      hiitSegundosRestantes = cfg.treino;
    } else {
      hiitEmExecucao = false;
      if (hiitTimerId) {
        clearInterval(hiitTimerId);
        hiitTimerId = null;
      }
      hiitSegundosRestantes = 0;
    }

    atualizarVisorHiitIsolado();
  }

  function iniciarCronometroHiit() {
    const cfg = lerConfigHiit(obterCartaoHiitExato());
    if (hiitSegundosRestantes <= 0) {
      hiitSegundosRestantes = cfg.treino;
      hiitFaseTrabalho = true;
    }
    hiitEmExecucao = true;
    if (hiitTimerId) clearInterval(hiitTimerId);
    atualizarVisorHiitIsolado();
    hiitTimerId = setInterval(passoSegundoHiit, 1000);
  }

  function pausarCronometroHiit() {
    hiitEmExecucao = false;
    if (hiitTimerId) {
      clearInterval(hiitTimerId);
      hiitTimerId = null;
    }
    atualizarVisorHiitIsolado();
  }

  function zerarCronometroHiit() {
    hiitEmExecucao = false;
    if (hiitTimerId) {
      clearInterval(hiitTimerId);
      hiitTimerId = null;
    }
    const cfg = lerConfigHiit(obterCartaoHiitExato());
    hiitFaseTrabalho = true;
    hiitRoundAtual = 1;
    hiitSegundosRestantes = cfg.treino;
    atualizarVisorHiitIsolado();
  }

  function fullEcranCronometroHiit() {
    const cartao = obterCartaoHiitExato();
    if (!cartao) return;
    if (!document.fullscreenElement && typeof cartao.requestFullscreen === "function") {
      cartao.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
  }

  document.addEventListener(
    "click",
    (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const cartao = obterCartaoHiitExato();
      if (!cartao || !cartao.contains(btn)) return;

      const rotulo = (btn.textContent || "").trim().toLowerCase();
      if (rotulo === "iniciar") {
        iniciarCronometroHiit();
      } else if (rotulo === "pausar") {
        pausarCronometroHiit();
      } else if (rotulo === "zerar") {
        zerarCronometroHiit();
      } else if (rotulo.includes("full")) {
        fullEcranCronometroHiit();
      }
    },
    true
  );

  function executarCorrecoes() {
    sincronizarInscricoesParaAdmin();
    adicionarGestorEditarRemoverVideosAdmin();
    verificarAprovacaoAtleta();
    adicionarFerramentasAtleta();
    const cartao = obterCartaoHiitExato();
    if (cartao && !hiitEmExecucao) {
      const cfg = lerConfigHiit(cartao);
      hiitSegundosRestantes = cfg.treino;
      atualizarVisorHiitIsolado();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(executarCorrecoes, 450));
  } else {
    setTimeout(executarCorrecoes, 450);
  }
})();
