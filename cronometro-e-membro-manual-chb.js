(function () {
  if (window.__chbCronometroEMembroManual) return;
  window.__chbCronometroEMembroManual = true;

  let seg = 0;
  let intervalo = null;

  function formatar(totalSeg) {
    const m = String(Math.floor(totalSeg / 60)).padStart(2, "0");
    const s = String(totalSeg % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function atualizarVisor() {
    const el = document.getElementById("chbRelogioFuncionalAtivo");
    if (el) el.textContent = formatar(seg);
  }

  window.chbCronometroStart = function () {
    if (intervalo) return;
    intervalo = setInterval(() => {
      seg += 1;
      atualizarVisor();
    }, 1000);
  };

  window.chbCronometroPause = function () {
    if (intervalo) {
      clearInterval(intervalo);
      intervalo = null;
    }
  };

  window.chbCronometroReset = function () {
    window.chbCronometroPause();
    seg = 0;
    atualizarVisor();
  };

  function montarCronometroFuncional() {
    if (document.getElementById("chbCronometroFuncionalBox")) return;
    const box = document.createElement("section");
    box.id = "chbCronometroFuncionalBox";
    box.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    box.innerHTML = `
      <div class="bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div>
          <div class="text-[10px] font-extrabold uppercase text-emerald-400">Cronómetro Ativo</div>
          <div id="chbRelogioFuncionalAtivo" class="text-2xl font-mono font-black text-white">00:00</div>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="chbCronometroStart()" class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">Iniciar</button>
          <button type="button" onclick="chbCronometroPause()" class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">Pausar</button>
          <button type="button" onclick="chbCronometroReset()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">Zerar</button>
        </div>
      </div>
    `;
    const mainEl = document.querySelector("main") || document.body;
    mainEl.insertBefore(box, mainEl.firstChild);
  }

  function ehAdmin() {
    return (window.location.pathname || "").toLowerCase().includes("admin");
  }

  function montarAdicionarMembroManual() {
    if (!ehAdmin() || document.getElementById("chbAdicionarMembroManualBox")) return;
    const box = document.createElement("section");
    box.id = "chbAdicionarMembroManualBox";
    box.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    box.innerHTML = `
      <div class="bg-slate-900/95 border border-sky-500/40 rounded-2xl p-4 space-y-3 text-xs">
        <div class="font-black text-white text-sm">Adicionar Membro Manualmente (Admin)</div>
        <form onsubmit="chbSalvarMembroManual(event)" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input id="chbManNome" type="text" required placeholder="Nome completo" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
          <input id="chbManEmail" type="email" required placeholder="E-mail" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
          <input id="chbManTelefone" type="text" placeholder="Telefone" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
          <input id="chbManTurno" type="text" value="Quartas-feiras" placeholder="Turno" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
          <input id="chbManSenha" type="text" value="1234" placeholder="Palavra-passe" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
          <button type="submit" class="sm:col-span-2 lg:col-span-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black">
            Adicionar Membro Manual
          </button>
        </form>
        <div id="chbMsgMembroManual" class="text-emerald-400 font-bold"></div>
      </div>
    `;
    const mainEl = document.querySelector("main") || document.body;
    mainEl.insertBefore(box, mainEl.firstChild);
  }

  window.chbSalvarMembroManual = function (ev) {
    if (ev) ev.preventDefault();
    const nome = ((document.getElementById("chbManNome") || {}).value || "").trim();
    const email = ((document.getElementById("chbManEmail") || {}).value || "").trim().toLowerCase();
    const telefone = ((document.getElementById("chbManTelefone") || {}).value || "").trim();
    const turno = ((document.getElementById("chbManTurno") || {}).value || "Quartas-feiras").trim();
    const senha = ((document.getElementById("chbManSenha") || {}).value || "1234").trim();
    if (!nome || !email) return;

    const novoMembro = {
      id: "membro-" + Date.now(),
      nome,
      email,
      telefone,
      turno,
      senha,
      password: senha,
      aprovado: true,
      ativo: true,
      status: "ativo",
      dataCadastro: new Date().toISOString().slice(0, 10)
    };

    const chaves = [
      "crosshitbox_membros_v1",
      "crosshitbox_inscricoes_v1",
      "crosshitbox_perfis_completos_v1"
    ];

    chaves.forEach((chave) => {
      try {
        const atual = JSON.parse(localStorage.getItem(chave) || "[]");
        const lista = Array.isArray(atual) ? atual : [];
        const semDuplicado = lista.filter(
          (item) => !(item && String(item.email || "").trim().toLowerCase() === email)
        );
        semDuplicado.unshift(novoMembro);
        localStorage.setItem(chave, JSON.stringify(semDuplicado));
      } catch {}
    });

    ["chbManNome", "chbManEmail", "chbManTelefone"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const msg = document.getElementById("chbMsgMembroManual");
    if (msg) msg.textContent = `Membro "${nome}" adicionado com sucesso.`;
  };

  function iniciar() {
    montarCronometroFuncional();
    montarAdicionarMembroManual();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(iniciar, 300));
  } else {
    setTimeout(iniciar, 300);
  }
})();
