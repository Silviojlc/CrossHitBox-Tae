(function () {
  if (window.__chbAntiPiscarAtivo) return;
  window.__chbAntiPiscarAtivo = true;

  // Evita que chamadas consecutivas de renderização disparem em cascata num mesmo frame
  let ultimoRenderMs = 0;
  const MIN_INTERVALO_MS = 1800;

  function envolverComDebounce(nomeFuncao) {
    const fnOriginal = window[nomeFuncao];
    if (typeof fnOriginal !== "function" || fnOriginal.__chbDebounced) return;

    let timer = null;
    const wrapped = function (...args) {
      const agora = Date.now();
      clearTimeout(timer);
      const espera = Math.max(0, MIN_INTERVALO_MS - (agora - ultimoRenderMs));
      timer = setTimeout(() => {
        ultimoRenderMs = Date.now();
        try {
          return fnOriginal.apply(this, args);
        } catch {}
      }, espera);
    };
    wrapped.__chbDebounced = true;
    window[nomeFuncao] = wrapped;
  }

  // Reduz a frequência de setInterval excessivos que causam intermitência visual
  const intervalOriginal = window.setInterval.bind(window);
  window.setInterval = function (fn, delay, ...rest) {
    const delaySeguro = typeof delay === "number" && delay < 1500 ? 2500 : delay;
    return intervalOriginal(fn, delaySeguro, ...rest);
  };

  setTimeout(() => {
    [
      "chbRenderLayoutKosmo",
      "chbRenderShellWorkspace",
      "renderAvaliacaoFotosUI",
      "renderGestaoTotalPagamentosUI",
      "renderGestaoTurnosMembrosUI",
      "renderAjustesPraticosUI"
    ].forEach(envolverComDebounce);
  }, 400);
})();
