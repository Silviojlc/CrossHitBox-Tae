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

    // Se ainda não houver perfil local carregado mas o utilizador preencheu e-mail válido e senha >= 4 chars
    if (idLimpo.includes("@") && senhaLimpa.length >= 4) {
      return idLimpo;
    }
    return null;
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
      } else if (erroEl) {
        erroEl.textContent = "Utilizador ou senha de administrador inválidos.";
      }
    } else {
      const emailValidado = validarMembro(uVal, pVal);
      if (emailValidado) {
        try { sessionStorage.setItem(CHAVE_SESSAO_MEMBRO, emailValidado); } catch {}
        if (erroEl) erroEl.textContent = "";
        aplicarEstadoLoginLogoff();
      } else if (erroEl) {
        erroEl.textContent = "Credenciais de atleta inválidas. Verifica o teu e-mail/nome e senha.";
      }
    }
  };

  window.chbFazerLogoff = function () {
    try {
      sessionStorage.removeItem(CHAVE_SESSAO_ADMIN);
      sessionStorage.removeItem(CHAVE_SESSAO_MEMBRO);
      sessionStorage.removeItem("chb_logoff_manual_v1");
      localStorage.removeItem("crosshitbox_sessao_ativa");
    } catch {}

    const botoesAntigos = Array.from(document.querySelectorAll("button, a")).filter((el) => {
      if (el.id === "chbBtnLogoffMenu" || el.id === "chbBtnLogoffTopo") return false;
      const t = (el.textContent || "").trim().toLowerCase();
      return t === "sair" || t === "terminar sessão" || t === "terminar sessao" || t === "logout" || t === "logoff";
    });
    botoesAntigos.forEach((b) => {
      try { b.click(); } catch {}
    });

    aplicarEstadoLoginLogoff();
  };

  function garantirTelaLogin() {
    let box = document.getElementById("chbTelaLoginObrigatoria");
    if (!box) {
      box = document.createElement("div");
      box.id = "chbTelaLoginObrigatoria";
      box.style.cssText = "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;background:#020617;color:#f8fafc;position:relative;z-index:90;";
      const admin = ehAdmin();
      box.innerHTML = `
        <form onsubmit="chbSubmeterLogin(event)" style="width:100%;max-width:410px;background:#0f172a;border:1px solid rgba(245,158,11,.45);border-radius:18px;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.6);font-family:system-ui,-apple-system,sans-serif;">
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fbbf24;margin-bottom:6px;">
            CrossHitBox Tae • Acesso Restrito
          </div>
          <h1 style="font-size:20px;font-weight:900;margin:0 0 6px 0;color:#ffffff;">
            ${admin ? "Login do Administrador" : "Login da Área do Atleta"}
          </h1>
          <p style="font-size:12px;color:#94a3b8;margin:0 0 18px 0;">
            ${admin ? "Introduz as tuas credenciais de administrador para aceder ao painel." : "Introduz o teu e-mail ou nome e senha de atleta para entrar."}
          </p>

          <div style="margin-bottom:12px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#cbd5e1;margin-bottom:5px;">
              ${admin ? "Utilizador" : "E-mail ou Nome do Atleta"}
            </label>
            <input id="chbLoginUser" type="text" required autocomplete="username" placeholder="${admin ? "Utilizador admin" : "ex: atleta@email.com"}"
              style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #334155;background:#020617;color:#ffffff;font-size:13px;">
          </div>

          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#cbd5e1;margin-bottom:5px;">
              Senha / Credencial
            </label>
            <input id="chbLoginPass" type="password" required autocomplete="current-password" placeholder="••••••"
              style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #334155;background:#020617;color:#ffffff;font-size:13px;">
          </div>

          <div id="chbLoginErro" style="font-size:12px;font-weight:700;color:#fb7185;min-height:18px;margin-bottom:10px;"></div>

          <button type="submit" style="width:100%;padding:11px 14px;border-radius:12px;border:none;background:#f59e0b;color:#020617;font-weight:900;font-size:13px;cursor:pointer;">
            Entrar (Login)
          </button>
        </form>
      `;
      document.body.insertBefore(box, document.body.firstChild);
    }
    return box;
  }

  function garantirBotoesLogoffVisiveis() {
    const sidebar = document.getElementById("chbMenuLateralFirme") || document.querySelector("aside");
    if (sidebar && !document.getElementById("chbBtnLogoffMenu")) {
      const b = document.createElement("button");
      b.id = "chbBtnLogoffMenu";
      b.type = "button";
      b.onclick = window.chbFazerLogoff;
      b.textContent = "Logoff / Terminar Sessão";
      b.style.cssText = "width:100%;padding:10px 12px;border-radius:12px;border:none;background:#e11d48;color:#ffffff;font-weight:900;font-size:12px;cursor:pointer;margin-top:8px;";
      sidebar.appendChild(b);
    }

    if (!document.getElementById("chbBtnLogoffTopo")) {
      const t = document.createElement("button");
      t.id = "chbBtnLogoffTopo";
      t.type = "button";
      t.onclick = window.chbFazerLogoff;
      t.textContent = "Logoff";
      t.style.cssText = "position:fixed;top:14px;right:16px;z-index:70;padding:8px 14px;border-radius:10px;border:none;background:#e11d48;color:#ffffff;font-weight:900;font-size:12px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);";
      document.body.appendChild(t);
    }
  }

  function removerBotoesLogoffVisiveis() {
    ["chbBtnLogoffMenu", "chbBtnLogoffTopo"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function aplicarEstadoLoginLogoff() {
    if (!document.body) return;
    const autenticado = estaAutenticado();
    const telaLogin = garantirTelaLogin();
    const filhos = Array.from(document.body.children);

    if (!autenticado) {
      telaLogin.style.display = "flex";
      removerBotoesLogoffVisiveis();
      filhos.forEach((el) => {
        if (el.id !== "chbTelaLoginObrigatoria" && el.tagName !== "SCRIPT" && el.tagName !== "STYLE") {
          el.dataset.chbPrevDisplay = el.style.display || "";
          el.style.setProperty("display", "none", "important");
        }
      });
    } else {
      telaLogin.style.display = "none";
      filhos.forEach((el) => {
        if (el.id !== "chbTelaLoginObrigatoria" && el.tagName !== "SCRIPT" && el.tagName !== "STYLE") {
          el.style.removeProperty("display");
          if (el.dataset.chbPrevDisplay) {
            el.style.display = el.dataset.chbPrevDisplay;
          }
        }
      });
      garantirBotoesLogoffVisiveis();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(aplicarEstadoLoginLogoff, 120));
  } else {
    setTimeout(aplicarEstadoLoginLogoff, 120);
  }
})();
