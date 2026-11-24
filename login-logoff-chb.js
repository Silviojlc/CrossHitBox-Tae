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

  function ocultarFormulariosLoginNativos() {
    // Evita formulários duplicados de login da página nativa quando a tela única está ativa
    const forms = Array.from(document.querySelectorAll("form, div, section"));
    forms.forEach((el) => {
      if (!el || el.id === "chbTelaLoginObrigatoria" || el.id === "chbDashboardPro") return;
      if (el.contains(document.getElementById("chbTelaLoginObrigatoria"))) return;
      const txt = (el.innerText || "").toUpperCase();
      const temPass = Boolean(el.querySelector && el.querySelector("input[type='password']"));
      const ehCardLoginNativo =
        temPass &&
        (txt.includes("ACESSO EXCLUSIVO AO ADMINISTRADOR") ||
          txt.includes("ENTRAR NO PAINEL") ||
          txt.includes("ADMINISTRAÇÃO — CROSSHITBOX TAE"));
      if (ehCardLoginNativo) {
        el.style.setProperty("display", "none", "important");
      }
    });
  }

  function garantirTelaLogin() {
    let box = document.getElementById("chbTelaLoginObrigatoria");
    if (!box) {
      box = document.createElement("div");
      box.id = "chbTelaLoginObrigatoria";
      box.style.cssText =
        "min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;padding:20px;background:#020617;color:#f8fafc;position:fixed;inset:0;z-index:95;";
      const admin = ehAdmin();
      box.innerHTML = `
        <form onsubmit="chbSubmeterLogin(event)" style="width:100%;max-width:400px;background:#0f172a;border:1px solid rgba(245,158,11,.45);border-radius:18px;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.65);font-family:system-ui,-apple-system,sans-serif;">
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fbbf24;margin-bottom:6px;">
            CrossHitBox Tae • Acesso Restrito
          </div>
          <h1 style="font-size:20px;font-weight:900;margin:0 0 6px 0;color:#ffffff;">
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
      "position:fixed;top:14px;right:16px;z-index:70;padding:8px 14px;border-radius:10px;border:none;background:#e11d48;color:#ffffff;font-weight:900;font-size:12px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);";
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
    const filhos = Array.from(document.body.children);

    if (!autenticado) {
      telaLogin.style.display = "flex";
      removerBotaoLogoff();
      filhos.forEach((el) => {
        if (el.id !== "chbTelaLoginObrigatoria" && el.tagName !== "SCRIPT" && el.tagName !== "STYLE") {
          el.style.setProperty("display", "none", "important");
        }
      });
    } else {
      telaLogin.style.display = "none";
      filhos.forEach((el) => {
        if (el.id !== "chbTelaLoginObrigatoria" && el.tagName !== "SCRIPT" && el.tagName !== "STYLE") {
          el.style.removeProperty("display");
        }
      });
      ocultarFormulariosLoginNativos();
      garantirBotaoLogoff();
    }
  }

  window.chbEstadoAutenticado = estaAutenticado;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(aplicarEstadoLoginLogoff, 100);
      setTimeout(aplicarEstadoLoginLogoff, 500);
    });
  } else {
    setTimeout(aplicarEstadoLoginLogoff, 100);
    setTimeout(aplicarEstadoLoginLogoff, 500);
  }
})();
