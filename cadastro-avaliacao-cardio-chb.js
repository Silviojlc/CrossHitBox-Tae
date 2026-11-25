(function () {
  if (window.__chbCadastroAvaliacaoCardio) return;
  window.__chbCadastroAvaliacaoCardio = true;

  const KEY_AVALIACOES = "crosshitbox_avaliacoes_cardio_v1";
  const CHAVES_MEMBROS = [
    "crosshitbox_membros_v1",
    "crosshitbox_inscricoes_v1",
    "crosshitbox_perfis_completos_v1",
    "crosshitbox_membros_ativos_v1",
    "chb_membros_v1"
  ];

  let fotoBase64Atual = "";

  function ehAdmin() {
    return (window.location.pathname || "").toLowerCase().includes("admin");
  }

  function calcularIMC(pesoKg, alturaCm) {
    const p = parseFloat(pesoKg);
    const a = parseFloat(alturaCm) / 100;
    if (!Number.isFinite(p) || !Number.isFinite(a) || p <= 0 || a <= 0) return "";
    return (p / (a * a)).toFixed(1);
  }

  window.chbPreviewFotoAvaliacao = function (inputEl) {
    if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      fotoBase64Atual = String(reader.result || "");
      const box = document.getElementById("chbAvFotoPreview");
      if (box) {
        box.innerHTML = `<img src="${fotoBase64Atual}" alt="Foto de Perfil" class="w-16 h-16 rounded-full object-cover border border-amber-400">`;
      }
    };
    reader.readAsDataURL(inputEl.files[0]);
  };

  window.chbAtualizarMetricasAvaliacao = function () {
    const peso = (document.getElementById("chbAvPeso") || {}).value;
    const altura = (document.getElementById("chbAvAltura") || {}).value;
    const cintura = parseFloat((document.getElementById("chbAvCintura") || {}).value);
    const altCm = parseFloat(altura);

    const imc = calcularIMC(peso, altura);
    const elImc = document.getElementById("chbAvImcCalc");
    if (elImc) elImc.textContent = imc ? `IMC: ${imc}` : "IMC: --";

    const elRce = document.getElementById("chbAvRceCalc");
    if (elRce) {
      if (Number.isFinite(cintura) && Number.isFinite(altCm) && cintura > 0 && altCm > 0) {
        elRce.textContent = `Cintura/Altura: ${(cintura / altCm).toFixed(2)}`;
      } else {
        elRce.textContent = "Cintura/Altura: --";
      }
    }
  };

  async function tentarEnviarEmailAcesso(dados) {
    try {
      const resp = await fetch("/api/inscricao-avaliacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      });
      if (!resp.ok) return { enviado: false, motivo: "Servidor sem rota SMTP ativa" };
      const json = await resp.json().catch(() => ({}));
      return { enviado: Boolean(json && json.ok), detalhe: json.mensagem || "E-mail processado" };
    } catch {
      return { enviado: false, motivo: "Modo local / sem servidor SMTP configurado" };
    }
  }

  window.chbSubmeterCadastroAvaliacao = async function (ev) {
    if (ev) ev.preventDefault();

    const nome = ((document.getElementById("chbAvNome") || {}).value || "").trim();
    const email = ((document.getElementById("chbAvEmail") || {}).value || "").trim().toLowerCase();
    const telefone = ((document.getElementById("chbAvTelefone") || {}).value || "").trim();
    const idade = ((document.getElementById("chbAvIdade") || {}).value || "").trim();
    const sexo = ((document.getElementById("chbAvSexo") || {}).value || "").trim();
    const turno = ((document.getElementById("chbAvTurno") || {}).value || "Quartas-feiras").trim();
    const senha = ((document.getElementById("chbAvSenha") || {}).value || "1234").trim();

    const peso = ((document.getElementById("chbAvPeso") || {}).value || "").trim();
    const altura = ((document.getElementById("chbAvAltura") || {}).value || "").trim();
    const cintura = ((document.getElementById("chbAvCintura") || {}).value || "").trim();
    const anca = ((document.getElementById("chbAvAnca") || {}).value || "").trim();
    const peito = ((document.getElementById("chbAvPeito") || {}).value || "").trim();
    const braco = ((document.getElementById("chbAvBraco") || {}).value || "").trim();
    const coxa = ((document.getElementById("chbAvCoxa") || {}).value || "").trim();
    const imc = calcularIMC(peso, altura);

    const patologias = ((document.getElementById("chbAvPatologias") || {}).value || "").trim();
    const medicacao = ((document.getElementById("chbAvMedicacao") || {}).value || "").trim();
    const lesoes = ((document.getElementById("chbAvLesoes") || {}).value || "").trim();
    const experiencia = ((document.getElementById("chbAvExperiencia") || {}).value || "Iniciante").trim();
    const freqSemanal = ((document.getElementById("chbAvFreq") || {}).value || "3x/semana").trim();
    const objetivo = ((document.getElementById("chbAvObjetivo") || {}).value || "Condicionamento Cardio").trim();
    const observacoes = ((document.getElementById("chbAvObs") || {}).value || "").trim();

    if (!nome || !email) return;

    const fichaCompleta = {
      id: "atleta-" + Date.now(),
      nome,
      email,
      telefone,
      idade,
      sexo,
      turno,
      senha,
      password: senha,
      foto: fotoBase64Atual || "",
      aprovado: false,
      ativo: false,
      status: "pendente",
      dataCadastro: new Date().toISOString(),
      avaliacaoCardio: {
        medidas: { peso, altura, cintura, anca, peito, braco, coxa, imc },
        saude: { patologias, medicacao, lesoes },
        treino: { experiencia, freqSemanal, objetivo, observacoes }
      }
    };

    // Guarda ficha completa de avaliação
    try {
      const atualAv = JSON.parse(localStorage.getItem(KEY_AVALIACOES) || "[]");
      const listaAv = Array.isArray(atualAv) ? atualAv.filter((x) => x && x.email !== email) : [];
      listaAv.unshift(fichaCompleta);
      localStorage.setItem(KEY_AVALIACOES, JSON.stringify(listaAv));
    } catch {}

    // Sincroniza nas listas de membros/perfis como pendente para aprovação no admin
    CHAVES_MEMBROS.forEach((chave) => {
      try {
        const atual = JSON.parse(localStorage.getItem(chave) || "[]");
        const lista = Array.isArray(atual) ? atual.filter((x) => x && String(x.email || "").trim().toLowerCase() !== email) : [];
        lista.unshift(fichaCompleta);
        localStorage.setItem(chave, JSON.stringify(lista));
      } catch {}
    });

    const resultadoEmail = await tentarEnviarEmailAcesso({
      nome,
      email,
      senha,
      turno,
      objetivo,
      imc,
      patologias
    });

    const resumoBox = document.getElementById("chbAvResultadoCadastro");
    if (resumoBox) {
      resumoBox.classList.remove("hidden");
      resumoBox.innerHTML = `
        <div class="bg-slate-950 border border-emerald-500/40 rounded-xl p-3.5 space-y-1.5 text-xs">
          <div class="font-black text-emerald-400">Cadastro &amp; Avaliação Registados com Sucesso!</div>
          <div class="text-white">Atleta: <strong>${nome}</strong> • E-mail: <strong>${email}</strong> • Senha definida: <strong>${senha}</strong></div>
          <div class="text-slate-300">
            ${
              resultadoEmail.enviado
                ? `Dados de acesso enviados por e-mail para <strong>${email}</strong>.`
                : `Ficha gravada no sistema (aguarda aprovação do admin). Para envio automático por e-mail via servidor, configure as variáveis SMTP no Render.`
            }
          </div>
        </div>
      `;
    }
  };

  function montarFormularioAvaliacao() {
    if (ehAdmin() || document.getElementById("chbCadastroAvaliacaoCardioBox")) return;

    const sec = document.createElement("section");
    sec.id = "chbCadastroAvaliacaoCardioBox";
    sec.className = "max-w-6xl mx-auto my-4 px-3 sm:px-6";
    sec.innerHTML = `
      <div class="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div class="text-[10px] font-extrabold uppercase text-amber-400">Ficha Inicial • Área de Cardio &amp; Condicionamento</div>
            <div class="font-black text-white text-base">Cadastro Profissional &amp; Avaliação Física do Atleta</div>
          </div>
          <div id="chbAvFotoPreview" class="w-16 h-16 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold">
            Foto
          </div>
        </div>

        <form onsubmit="chbSubmeterCadastroAvaliacao(event)" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <input id="chbAvNome" type="text" required placeholder="Nome completo *" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
            <input id="chbAvEmail" type="email" required placeholder="E-mail para receber acesso *" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
            <input id="chbAvTelefone" type="text" placeholder="Telefone / WhatsApp" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
            <input id="chbAvSenha" type="text" required value="1234" placeholder="Palavra-passe de acesso *" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
            <input id="chbAvIdade" type="number" min="10" max="110" placeholder="Idade" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
            <select id="chbAvSexo" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
              <option value="">Género / Sexo</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
            <input id="chbAvTurno" type="text" value="Quartas-feiras" placeholder="Turno / Horário" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
            <label class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 flex items-center gap-2 cursor-pointer">
              <span class="font-bold text-amber-400 shrink-0">Foto:</span>
              <input type="file" accept="image/*" onchange="chbPreviewFotoAvaliacao(this)" class="text-[11px] w-full">
            </label>
          </div>

          <div class="border-t border-slate-800 pt-3 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-black text-sky-400 uppercase text-[11px]">Medidas Corporais</span>
              <div class="flex gap-3 text-[11px] font-bold text-emerald-400">
                <span id="chbAvImcCalc">IMC: --</span>
                <span id="chbAvRceCalc">Cintura/Altura: --</span>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <input id="chbAvPeso" type="number" step="0.1" oninput="chbAtualizarMetricasAvaliacao()" placeholder="Peso (kg)" class="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
              <input id="chbAvAltura" type="number" step="0.5" oninput="chbAtualizarMetricasAvaliacao()" placeholder="Altura (cm)" class="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
              <input id="chbAvCintura" type="number" step="0.5" oninput="chbAtualizarMetricasAvaliacao()" placeholder="Cintura (cm)" class="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
              <input id="chbAvAnca" type="number" step="0.5" placeholder="Anca (cm)" class="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
              <input id="chbAvPeito" type="number" step="0.5" placeholder="Peito (cm)" class="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
              <input id="chbAvBraco" type="number" step="0.5" placeholder="Braço (cm)" class="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
              <input id="chbAvCoxa" type="number" step="0.5" placeholder="Coxa (cm)" class="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
            </div>
          </div>

          <div class="border-t border-slate-800 pt-3 space-y-2">
            <div class="font-black text-rose-400 uppercase text-[11px]">Saúde, Patologias &amp; Limitações (Anamnese)</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <input id="chbAvPatologias" type="text" placeholder="Patologias (ex.: hipertensão, asma, nenhuma)" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
              <input id="chbAvMedicacao" type="text" placeholder="Medicação atual (se houver)" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
              <input id="chbAvLesoes" type="text" placeholder="Lesões ou dores articulares / coluna / joelhos" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
            </div>
          </div>

          <div class="border-t border-slate-800 pt-3 space-y-2">
            <div class="font-black text-emerald-400 uppercase text-[11px]">Experiência de Treino &amp; Objetivos no Cardio</div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select id="chbAvExperiencia" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                <option value="Iniciante">Experiência: Iniciante</option>
                <option value="Intermédio">Experiência: Intermédio</option>
                <option value="Avançado">Experiência: Avançado</option>
              </select>
              <select id="chbAvFreq" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
                <option value="2x/semana">Frequência: 2x/semana</option>
                <option value="3x/semana" selected>Frequência: 3x/semana</option>
                <option value="4x/semana">Frequência: 4x/semana</option>
                <option value="5x+/semana">Frequência: 5x+/semana</option>
              </select>
              <input id="chbAvObjetivo" type="text" placeholder="Objetivo (ex.: Emagrecimento, Resistência, Cardio)" class="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white">
            </div>
            <textarea id="chbAvObs" rows="2" placeholder="Observações gerais, disponibilidade ou histórico desportivo..." class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"></textarea>
          </div>

          <button type="submit" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">
            Concluir Cadastro, Guardar Avaliação &amp; Enviar Dados de Acesso
          </button>
        </form>

        <div id="chbAvResultadoCadastro" class="hidden"></div>
      </div>
    `;

    const mainEl = document.querySelector("main") || document.body;
    mainEl.insertBefore(sec, mainEl.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(montarFormularioAvaliacao, 350));
  } else {
    setTimeout(montarFormularioAvaliacao, 350);
  }
})();
