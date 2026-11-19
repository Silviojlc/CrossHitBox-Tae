(function () {
  if (document.getElementById("crosshitboxBgStyle")) return;

  const candidatos = [
    "/fundo-crosshitbox-tae.jpg",
    "/fundo-crosshitbox-tae.png",
    "/fundo-crosshitbox-tae.webp",
    "/KOSMO CROSSHITBOX TAE.jpeg",
    "/KOSMO%20CROSSHITBOX%20TAE.jpeg"
  ];

  const style = document.createElement("style");
  style.id = "crosshitboxBgStyle";
  style.textContent = `
    html, body.crosshitbox-bg-ativo {
      min-height: 100vh;
      background-color: #06080c !important;
    }
    body.crosshitbox-bg-ativo {
      background-size: cover !important;
      background-position: center center !important;
      background-attachment: fixed !important;
      background-repeat: no-repeat !important;
    }
    body.crosshitbox-bg-ativo > section[id$="Modulo"] {
      background-color: rgba(15, 23, 42, 0.88) !important;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
  `;
  document.head.appendChild(style);

  function aplicarImagem(url) {
    if (!document.body) return;
    document.body.classList.add("crosshitbox-bg-ativo");
    document.body.style.setProperty(
      "background-image",
      `radial-gradient(circle at 50% 35%, rgba(249, 115, 22, 0.14), rgba(6, 8, 12, 0.92) 72%), linear-gradient(to bottom, rgba(6, 8, 12, 0.72), rgba(6, 8, 12, 0.86)), url("${url}")`,
      "important"
    );
  }

  function tentarProximo(indice) {
    if (indice >= candidatos.length) {
      if (document.body) {
        document.body.classList.add("crosshitbox-bg-ativo");
        document.body.style.setProperty(
          "background-image",
          "radial-gradient(circle at 50% 30%, rgba(249, 115, 22, 0.20), rgba(6, 8, 12, 0.96) 72%)",
          "important"
        );
      }
      return;
    }
    const url = candidatos[indice];
    const img = new Image();
    img.onload = function () {
      aplicarImagem(url);
    };
    img.onerror = function () {
      tentarProximo(indice + 1);
    };
    img.src = url + "?v=" + Date.now();
  }

  function iniciar() {
    tentarProximo(0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
