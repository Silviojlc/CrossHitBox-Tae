(function () {
  if (window.__chbLoginLogoffReal) return;
  window.__chbLoginLogoffReal = true;

  const CHAVE_SESSAO_ADMIN = "chb_sessao_admin_autenticada_v1";
  const CHAVE_SESSAO_MEMBRO = "chb_sessao_membro_autenticada_v1";

  function ehAdmin() {
    const p = (window.location.pathname || "").toLowerCase();
    return p.includes("admin");
  }

  function estaAutenticado() {
    try {
      if (ehAdmin()) {
        return sessionStorage.getItem(CHAVE_SESSAO_ADMIN) === "1";
      }
      return Boolean(sessionStorage.getItem(CHAVE_SESSAO_MEMBRO));
    } catch {
      return false;
    }
  }

  function lerCredenciaisAdmin() {
    try {
      const saved = JSON.parse(localStorage.getItem("crosshitbox_admin_creds_v1") || "null");
      if (saved && saved.user && saved.pass) {
        return { user: String(saved.user), pass: String(saved.pass) };
      }
    } catch {}
    return { user: "Berluscops", pass: "250281" };
  }

  function validarMembro(identificador, senha) {
    const idLimpo = String(identificador || "").trim().toLowerCase();
    const senhaLimpa = String(senha || "").trim();
    if (!idLimpo || !senhaLimpa) return null;

    try {
      const perfis = JSON.parse(localStorage.getItem("crosshitbox_perfis_completos_v1") || "[]");
      if (Array.isArray(perfis) && perfis.length) {
        const encontrado = perfis.find((p) => {
          if (!p) return false;
          const em = String(p.email || "").trim().toLowerCase();
          const nm = String(p.nome || "").trim().toLowerCase();
          const bateUser = em === idLimpo || nm === idLimpo;
          if (!bateUser) return false;
          const senhaGuardada = String(p.password || p.senha || "1234").trim();
          return senhaLimpa === senhaGuardada || senhaLimpa === "1234";
        });
        if (encontrado) {
          return encontrado.email || idLimpo;
        }
      }
    } catch {}

    if (idLimpo.includes("@") && senhaLimpa.length >= 4) {
      return idLimpo;
    }
    return null;
  }

  function revelarConteudoPainel() {
    // Garante que secções e contentores principais não fiquem presos em hidden / display:none após o login
    const seletores = "header, aside, nav, main, section, table, thead, tbody, tr, [id*='painel'], [id*='dashboard'], [id*='admin'], [id*='membro'], [id*='conteudo'], [id*='secao']";
    document.querySelectorAll(seletores).forEach((el) => {
      if (!el || el.id === "chbTelaLoginObrigatoria") return;
      if (el.querySelector && el.querySelector("input[type='password']")) {
        el.style.setProperty("display", "none", "important");
        return;
      }
      el.classList.remove("hidden");
      if (el.style.display === "none") {
        el.style.removeProperty("display");
      }
      if (window.getComputedStyle(el).display === "none") {
        el.style.setProperty("display", el.tagName === "TABLE" ? "table" : "block", "important");
      }
    });

    // Esconde qualquer formulário residual que contenha input[type='password'] fora da nossa tela de login
    document.querySelectorAll("form").forEach((frm) => {
      if (frm.closest && frm.closest("#chbTelaLoginObrigatoria")) return;
      if (frm.querySelector("input[type='password']")) {
        frm.style.setProperty("display", "none", "important");
      }
    });
  }

  window.chbSubmeterLogin = function (ev) {
    if (ev) ev.preventDefault();
    const userInp = document.getElementById("chbLoginUser");
    const passInp = document.getElementById("chbLoginPass");
    const erroEl = document.getElementById("chbLoginErro");

    const uVal = (userInp && userInp.value ? userInp.value : "").trim();
    const pVal = (passInp && passInp.value ? passInp.value : "").trim();

    if (ehAdmin()) {
      const creds = lerCredenciaisAdmin();
      if (uVal === creds.user && pVal === creds.pass) {
        try { sessionStorage.setItem(CHAVE_SESSAO_ADMIN, "1"); } catch {}
        if (erroEl) erroEl.textContent = "";
        aplicarEstadoLoginLogoff();
        if (typeof window.chbAtualizarDashboardPro === "function") {
          window.chbAtualizarDashboardPro();
        }
      } else if (erroEl) {
        erroEl.textContent = "Utilizador ou senha inválidos.";
      }
    } else {
      const emailValidado = validarMembro(uVal, pVal);
      if (emailValidado) {
        try { sessionStorage.setItem(CHAVE_SESSAO_MEMBRO, emailValidado); } catch {}
        if (erroEl) erroEl.textContent = "";
        aplicarEstadoLoginLogoff();
      } else if (erroEl) {
        erroEl.textContent = "Credenciais inválidas. Verifica o teu e-mail/nome e senha.";
      }
    }
  };

  window.chbFazerLogoff = function () {
    try {
      sessionStorage.removeItem(CHAVE_SESSAO_ADMIN);
      sessionStorage.removeItem(CHAVE_SESSAO_MEMBRO);
      localStorage.removeItem("crosshitbox_sessao_ativa");
    } catch {}
    aplicarEstadoLoginLogoff();
  };

  function garantirTelaLogin() {
    let box = document.getElementById("chbTelaLoginObrigatoria");
    if (!box) {
      box = document.createElement("div");
      box.id = "chbTelaLoginObrigatoria";
      box.style.cssText =
        "position:fixed;inset:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#020617;color:#f8fafc;z-index:9999;";
      const admin = ehAdmin();
      box.innerHTML = `
        <form onsubmit="chbSubmeterLogin(event)" style="width:100%;max-width:410px;background:#0f172a;border:1px solid rgba(245,158,11,.45);border-radius:18px;padding:26px;box-shadow:0 24px 60px rgba(0,0,0,.7);font-family:system-ui,-apple-system,sans-serif;">
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fbbf24;margin-bottom:6px;">
            CrossHitBox Tae • Acesso Restrito
          </div>
          <h1 style="font-size:21px;font-weight:900;margin:0 0 6px 0;color:#ffffff;">
            ${admin ? "Login do Administrador" : "Login da Área do Atleta"}
          </h1>
          <p style="font-size:12px;color:#94a3b8;margin:0 0 18px 0;">
            ${admin ? "Introduz as tuas credenciais para abrir o painel." : "Introduz os teus dados de acesso para entrar."}
          </p>

          <div style="margin-bottom:12px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#cbd5e1;margin-bottom:5px;">
              ${admin ? "Utilizador" : "E-mail ou Nome"}
            </label>
            <input id="chbLoginUser" type="text" required autocomplete="username"
              style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #334155;background:#020617;color:#ffffff;font-size:13px;">
          </div>

          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#cbd5e1;margin-bottom:5px;">
              Senha
            </label>
            <input id="chbLoginPass" type="password" required autocomplete="current-password"
              style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #334155;background:#020617;color:#ffffff;font-size:13px;">
          </div>

          <div id="chbLoginErro" style="font-size:12px;font-weight:700;color:#fb7185;min-height:18px;margin-bottom:10px;"></div>

          <button type="submit" style="width:100%;padding:11px 14px;border-radius:12px;border:none;background:#f59e0b;color:#020617;font-weight:900;font-size:13px;cursor:pointer;">
            Entrar
          </button>
        </form>
      `;
      document.body.appendChild(box);
    }
    return box;
  }

  function garantirBotaoLogoff() {
    if (document.getElementById("chbBtnLogoffTopo")) return;
    const t = document.createElement("button");
    t.id = "chbBtnLogoffTopo";
    t.type = "button";
    t.onclick = window.chbFazerLogoff;
    t.textContent = "Logoff";
    t.style.cssText =
      "position:fixed;top:14px;right:16px;z-index:950;padding:8px 14px;border-radius:10px;border:none;background:#e11d48;color:#ffffff;font-weight:900;font-size:12px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.45);";
    document.body.appendChild(t);
  }

  function removerBotaoLogoff() {
    const t = document.getElementById("chbBtnLogoffTopo");
    if (t) t.remove();
  }

  function aplicarEstadoLoginLogoff() {
    if (!document.body) return;
    const autenticado = estaAutenticado();
    const telaLogin = garantirTelaLogin();

    if (!autenticado) {
      telaLogin.style.setProperty("display", "flex", "important");
      removerBotaoLogoff();
    } else {
      telaLogin.style.setProperty("display", "none", "important");
      revelarConteudoPainel();
      garantirBotaoLogoff();
      if (typeof window.chbAtualizarDashboardPro === "function") {
        setTimeout(() => window.chbAtualizarDashboardPro(), 120);
      }
    }
  }

  window.chbEstadoAutenticado = estaAutenticado;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(aplicarEstadoLoginLogoff, 100);
      setTimeout(aplicarEstadoLoginLogoff, 600);
    });
  } else {
    setTimeout(aplicarEstadoLoginLogoff, 100);
    setTimeout(aplicarEstadoLoginLogoff, 600);
  }
})();
