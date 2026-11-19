(function () {
  if (document.getElementById("crosshitboxBgStyle")) return;

  const caminhoImagem = "/fundo-crosshitbox-tae.jpg";
  const style = document.createElement("style");
  style.id = "crosshitboxBgStyle";
  style.textContent = `
    body.crosshitbox-bg-ativo {
      background-color: #06080c !important;
      background-image:
        radial-gradient(circle at 50% 35%, rgba(249, 115, 22, 0.14), rgba(6, 8, 12, 0.92) 70%),
        linear-gradient(to bottom, rgba(6, 8, 12, 0.78), rgba(6, 8, 12, 0.88)),
        url("${caminhoImagem}") !important;
      background-size: cover !important;
      background-position: center center !important;
      background-attachment: fixed !important;
      background-repeat: no-repeat !important;
    }
    body.crosshitbox-bg-ativo > section[id$="Modulo"] {
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
  `;
  document.head.appendChild(style);

  function ativarFundo() {
    if (!document.body) return;
    document.body.classList.add("crosshitbox-bg-ativo");
    const imgTeste = new Image();
    imgTeste.onerror = function () {
      document.body.style.backgroundImage =
        "radial-gradient(circle at 50% 30%, rgba(249, 115, 22, 0.18), rgba(6, 8, 12, 0.96) 72%)";
    };
    imgTeste.src = caminhoImagem;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ativarFundo);
  } else {
    ativarFundo();
  }
})();
