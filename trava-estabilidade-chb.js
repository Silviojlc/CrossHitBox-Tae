(function () {
  if (window.__chbTravaTotal) return;
  window.__chbTravaTotal = true;

  let cliqueRealUsuario = false;
  document.addEventListener("pointerdown", (ev) => {
    if (ev && ev.isTrusted) {
      cliqueRealUsuario = true;
      setTimeout(() => { cliqueRealUsuario = false; }, 1200);
    }
  }, true);

  // 1. Impede loops curtos de setInterval que causam piscar/alternância de ecrã
  const _setInterval = window.setInterval.bind(window);
  window.setInterval = function (fn, ms, ...args) {
    const tempo = Number(ms) || 0;
    if (tempo > 0 && tempo < 60000) {
      return 0;
    }
    return _setInterval(fn, ms, ...args);
  };

  // 2. Impede saltos automáticos de scroll que não venham de interação direta do utilizador
  const _scrollTo = window.scrollTo.bind(window);
  window.scrollTo = function (...args) {
    if (!cliqueRealUsuario) return;
    return _scrollTo(...args);
  };

  if (Element.prototype.scrollIntoView) {
    const _scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args) {
      if (!cliqueRealUsuario) return;
      return _scrollIntoView.apply(this, args);
    };
  }

  // 3. Garante visibilidade estável e remove shells que alternavam o layout em loop
  function estabilizarDomUmaVez() {
    if (!document.body) return;
    ["layoutKosmoCHB", "workspaceUnificadoCHB", "estabilizadorVisualCHB"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    document.body.classList.remove("chb-kosmo-mode", "chb-shell-ativo");
    document.body.style.paddingLeft = "0px";

    const escondidos = Array.from(document.querySelectorAll("section, main > div, body > div"));
    escondidos.forEach((el) => {
      if (!el || !el.style) return;
      if (el.id === "overlayBloqueioPagamentoCHB") return;
      if (el.style.display === "none" && !el.classList.contains("hidden")) {
        el.style.display = "";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(estabilizarDomUmaVez, 300));
  } else {
    setTimeout(estabilizarDomUmaVez, 300);
  }
  window.addEventListener("load", () => {
    setTimeout(estabilizarDomUmaVez, 500);
    setTimeout(estabilizarDomUmaVez, 1500);
  });
})();
