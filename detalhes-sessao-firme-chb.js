(function () {
  if (window.__chbDetalhesSessaoFirme) return;
  window.__chbDetalhesSessaoFirme = true;

  const KEY_SESSAO_PERSISTENTE = "chb_sessao_persistente_v1";

  function ehAdmin() {
    return (window.location.pathname || "").toLowerCase().includes("admin");
  }

  function gravarSessaoPersistente(tipo, valor) {
    try {
      const atual = JSON.parse(localStorage.getItem(KEY_SESSAO_PERSISTENTE) || "{}");
      atual[tipo] = valor || "1";
      atual.atualizadoEm = Date.now();
      localStorage.setItem(KEY_SESSAO_PERSISTENTE, JSON.stringify(atual));
    } catch {}
  }

  function restaurarSessaoSeNecessario() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY_SESSAO_PERSISTENTE) || "null");
      if (!saved) return;
      if (ehAdmin() && saved.admin === "1" && sessionStorage.getItem("chb_sessao_admin_autenticada_v1") !== "1") {
        sessionStorage.setItem("chb_sessao_admin_autenticada_v1", "1");
      } else if (!ehAdmin() && saved.membro && !sessionStorage.getItem("chb_sessao_membro_autenticada_v1")) {
        sessionStorage.setItem("chb_sessao_membro_autenticada_v1", saved.membro);
      }
    } catch {}
  }

  // Impede que limpeza acidental de sessionStorage apague a sessão ativa sem logoff explícito
  const _removeItem = sessionStorage.removeItem.bind(sessionStorage);
  sessionStorage.removeItem = function (k) {
    if (k === "chb_sessao_admin_autenticada_v1" || k === "chb_sessao_membro_autenticada_v1") {
      if (!window.__chbLogoffExplicito) return;
    }
    return _removeItem(k);
  };

  function expandirDetalhesUmaVez() {
    if (window.__chbDetalhesExpandidos) return;
    const autenticado = typeof window.chbEstadoAutenticado === "function" ? window.chbEstadoAutenticado() : true;
    if (!autenticado) return;
    window.__chbDetalhesExpandidos = true;

    // Garante que blocos internos e detalhes não fiquem ocultos
    document.querySelectorAll("section, [id*='detalhe'], [id*='relatorio'], [id*='plano'], [id*='ficha'], [id*='foto']").forEach((el) => {
      if (!el || !el.style) return;
      if (el.id === "chbTelaLoginObrigatoria") return;
      el.classList.remove("hidden");
      if (el.style.display === "none") el.style.removeProperty("display");
    });

    // Dispara uma única vez botões de carregamento/atualização de detalhes para popular dados visíveis
    const alvos = Array.from(document.querySelectorAll("button")).filter((b) => {
      const txt = (b.textContent || "").trim().toLowerCase();
      return (
        txt === "atualizar" ||
        txt === "atualizar dados" ||
        txt === "sincronizar" ||
        txt === "atualizar semanal"
      );
    });

    alvos.forEach((btn, idx) => {
      setTimeout(() => {
        try {
          if (btn.offsetParent !== null) btn.click();
        } catch {}
      }, 250 + idx * 180);
    });
  }

  // Liga à função de login existente para gravar sessão persistente
  const _submeterOriginal = window.chbSubmeterLogin;
  if (typeof _submeterOriginal === "function") {
    window.chbSubmeterLogin = function (ev) {
      const res = _submeterOriginal.apply(this, arguments);
      setTimeout(() => {
        if (typeof window.chbEstadoAutenticado === "function" && window.chbEstadoAutenticado()) {
          if (ehAdmin()) {
            gravarSessaoPersistente("admin", "1");
          } else {
            gravarSessaoPersistente("membro", sessionStorage.getItem("chb_sessao_membro_autenticada_v1") || "1");
          }
          window.__chbDetalhesExpandidos = false;
          expandirDetalhesUmaVez();
        }
      }, 150);
      return res;
    };
  }

  const _logoffOriginal = window.chbFazerLogoff;
  if (typeof _logoffOriginal === "function") {
    window.chbFazerLogoff = function () {
      window.__chbLogoffExplicito = true;
      try {
        localStorage.removeItem(KEY_SESSAO_PERSISTENTE);
      } catch {}
      const r = _logoffOriginal.apply(this, arguments);
      setTimeout(() => { window.__chbLogoffExplicito = false; }, 400);
      return r;
    };
  }

  restaurarSessaoSeNecessario();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      restaurarSessaoSeNecessario();
      setTimeout(expandirDetalhesUmaVez, 450);
    });
  } else {
    setTimeout(expandirDetalhesUmaVez, 450);
  }
})();
