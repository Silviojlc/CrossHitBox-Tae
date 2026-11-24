(function () {
  if (window.__chbPrecoAulaFix) return;
  window.__chbPrecoAulaFix = true;

  const KEY_PRECO_ATUAL = "crosshitbox_preco_aula_atual_v1";

  function formatarPrecoECV(valor) {
    const num = Number(String(valor || "").replace(/[^0-9.,]/g, "").replace(",", "."));
    if (!Number.isFinite(num) || num <= 0) {
      return String(valor || "1.800$00").trim() || "1.800$00";
    }
    const inteiro = Math.round(num);
    const comMilhares = inteiro.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${comMilhares}$00`;
  }

  function lerPrecoGuardado() {
    try {
      const raw = localStorage.getItem(KEY_PRECO_ATUAL);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.texto) return parsed;
      }
    } catch {}
    return {
      valorNumerico: 1800,
      texto: "1.800$00",
      descricao: "Aula 1x/Semana (Quartas-feiras)"
    };
  }

  function guardarPreco(novoValor, descricao) {
    const formatado = formatarPrecoECV(novoValor);
    const num = Number(String(novoValor || "").replace(/[^0-9.,]/g, "").replace(",", ".")) || 1800;
    const dados = {
      valorNumerico: num,
      texto: formatado,
      descricao: descricao || "Preço atual da aula CrossHitBox Tae",
      atualizadoEm: new Date().toISOString()
    };
    try {
      localStorage.setItem(KEY_PRECO_ATUAL, JSON.stringify(dados));
      localStorage.setItem("crosshitbox_preco_aula", String(num));
      localStorage.setItem("preco_aula_atual", formatado);
    } catch {}
    return dados;
  }

  function resolverElementosCarregandoPreco() {
    const dados = lerPrecoGuardado();
    const todos = Array.from(document.querySelectorAll("span, p, div, strong, b, label, td, h2, h3, h4"));

    todos.forEach((el) => {
      if (!el || el.children.length > 2) return;
      const txt = (el.textContent || "").trim().toLowerCase();
      if (
        txt.includes("a carregar preço atual") ||
        txt.includes("carregando preço atual") ||
        txt.includes("a carregar preco atual") ||
        txt.includes("carregando preco atual")
      ) {
        el.textContent = `${dados.texto} (${dados.descricao})`;
      }
    });

    // Atualiza inputs numéricos de preço caso estejam vazios ou presos
    document.querySelectorAll("input").forEach((inp) => {
      const ph = (inp.getAttribute("placeholder") || "").toLowerCase();
      const nm = ((inp.getAttribute("name") || "") + " " + (inp.id || "")).toLowerCase();
      if ((ph.includes("preço") || ph.includes("preco") || nm.includes("preco") || nm.includes("preço")) && !inp.value) {
        if (inp.type === "number") {
          inp.value = String(dados.valorNumerico);
        }
      }
    });
  }

  window.chbDefinirPrecoAula = function (valorOuEvento, descricaoOpcional) {
    if (valorOuEvento && typeof valorOuEvento.preventDefault === "function") {
      valorOuEvento.preventDefault();
    }
    let val = valorOuEvento;
    if (!val || typeof val === "object") {
      const campo = document.querySelector(
        "#chbInputPrecoAula, input[id*='preco' i], input[id*='preço' i], input[name*='preco' i], input[name*='preço' i]"
      );
      val = campo ? campo.value : "";
    }
    if (!String(val || "").trim()) return;
    const salvo = guardarPreco(val, descricaoOpcional);
    resolverElementosCarregandoPreco();

    const feedback = document.getElementById("chbPrecoStatusFeedback");
    if (feedback) {
      feedback.textContent = `Preço atual guardado: ${salvo.texto}`;
    }
  };

  function injetarControloRapidoPrecoSeNecessario() {
    if (!document.body || document.getElementById("chbBarraPrecoRapido")) return;
    const temTextoCarregando = Array.from(document.querySelectorAll("*")).some((el) => {
      const t = (el.textContent || "").trim().toLowerCase();
      return t.includes("a carregar preço atual") || t.includes("carregando preço atual") || t.includes("preço atual");
    });
    if (!temTextoCarregando) return;

    const dados = lerPrecoGuardado();
    const barra = document.createElement("div");
    barra.id = "chbBarraPrecoRapido";
    barra.className = "max-w-6xl mx-auto my-3 px-3 sm:px-6";
    barra.innerHTML = `
      <div class="bg-slate-900/95 border border-emerald-500/35 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span class="font-extrabold uppercase text-emerald-400">Preço Atual da Aula:</span>
          <span id="chbPrecoAtualBadge" class="font-black text-white ml-1">${dados.texto}</span>
          <span id="chbPrecoStatusFeedback" class="text-slate-400 ml-2">${dados.descricao}</span>
        </div>
        <div class="flex items-center gap-2">
          <input id="chbInputPrecoAula" type="number" min="100" step="50" value="${dados.valorNumerico}" class="w-28 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold">
          <button type="button" onclick="chbDefinirPrecoAula()" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">
            Guardar Preço
          </button>
        </div>
      </div>
    `;

    const mainEl = document.querySelector("main");
    if (mainEl && mainEl.firstChild) {
      mainEl.insertBefore(barra, mainEl.firstChild);
    } else {
      document.body.insertBefore(barra, document.body.firstChild);
    }
  }

  function executarResolucao() {
    injetarControloRapidoPrecoSeNecessario();
    resolverElementosCarregandoPreco();
    const dados = lerPrecoGuardado();
    const badge = document.getElementById("chbPrecoAtualBadge");
    if (badge) badge.textContent = dados.texto;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(executarResolucao, 150);
      setTimeout(executarResolucao, 1200);
    });
  } else {
    setTimeout(executarResolucao, 150);
    setTimeout(executarResolucao, 1200);
  }
})();
