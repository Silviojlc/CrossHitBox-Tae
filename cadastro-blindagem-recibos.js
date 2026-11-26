(function () {
  if (document.getElementById("cadastroBlindagemModulo")) return;

  const KEY_PERFIS_COMPLETOS = "crosshitbox_perfis_completos_v1";
  const KEY_PAGAMENTOS = "crosshitbox_pagamentos_v1";

  function lerLista(key) {
    try {
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function guardarLista(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  }

  function detectarPagina() {
    const p = (window.location.pathname || "").toLowerCase();
    const txt = document.body ? (document.body.innerText || "") : "";
    if (p.includes("admin") || txt.includes("Painel Administrativo") || txt.includes("Configurar Sala de Videochamada")) {
      return "ADMIN";
    }
    if (p.includes("membro") || txt.includes("Área do Atleta") || txt.includes("Atleta Autenticado") || txt.includes("Terminar Sessão")) {
      return "MEMBRO";
    }
    return "PUBLICO";
  }

  function limparTelefoneCV(raw) {
    const d = (raw || "").toString().replace(/\D+/g, "");
    if (!d) return "";
    return d.length === 7 ? "238" + d : d;
  }

  function lerFicheiroBase64(file) {
    return new Promise((resolve) => {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  function obterEmailAtletaLogado() {
    const txt = document.body ? (document.body.innerText || "") : "";
    const match = txt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (match) return match[0].toLowerCase();
    const inputs = Array.from(document.querySelectorAll("input"));
    for (const inp of inputs) {
      const v = (inp.value || "").trim().toLowerCase();
      if (v.includes("@")) return v;
    }
    return "";
  }

  // Exige aprovacao explicita do admin (status_acesso === "ATIVO" e pagamento aprovado com recibo/aprovacao)
  function verificarAcessoAtivo(email, perfis, pagamentos) {
    if (!email) return { ativo: false, motivo: "Sessão não identificada." };
    const hoje = new Date().toISOString().slice(0, 10);
    const perfil = perfis.find((x) => (x.email || "").toLowerCase() === email);
    const pgAprovado = pagamentos.find(
      (p) =>
        (p.email || "").toLowerCase() === email &&
        p.aprovado_admin === true &&
        (p.estado === "Pago / Ativo" || p.status === "PAGO") &&
        (!p.validade_ate || p.validade_ate >= hoje)
    );

    if (perfil && perfil.status_acesso === "ATIVO" && pgAprovado && (!perfil.validade_ate || perfil.validade_ate >= hoje)) {
      return {
        ativo: true,
        validade: pgAprovado.validade_ate || perfil.validade_ate || "",
        recibo: pgAprovado.recibo_numero || perfil.recibo_numero || ""
      };
    }

    if (perfil && perfil.validade_ate && perfil.validade_ate < hoje) {
      return {
        ativo: false,
        motivo: `A tua mensalidade expirou em ${perfil.validade_ate}. Envia o comprovativo de renovação para o treinador validar.`
      };
    }

    return {
      ativo: false,
      motivo: "A tua inscrição ainda não foi validada e o pagamento da mensalidade (500$00) ainda não foi confirmado pelo treinador."
    };
  }

  function aprimorarFormularioInscricao() {
    const forms = Array.from(document.querySelectorAll("form"));
    const formInscricao = forms.find((f) => {
      const t = (f.innerText || "").toLowerCase();
      return t.includes("inscri") || t.includes("regist") || t.includes("cadastrar") || t.includes("criar conta");
    });
    if (!formInscricao || document.getElementById("camposExtrasCadastroCHB")) return;

    const blocoExtras = document.createElement("div");
    blocoExtras.id = "camposExtrasCadastroCHB";
    blocoExtras.className = "space-y-3 my-3 p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/40 text-xs";
    blocoExtras.innerHTML = `
      <div class="font-bold text-amber-400">Identificação &amp; Documentação do Atleta (CrossHitBox Tae)</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-slate-300 mb-1">NIF (Número de Identificação Fiscal) *</label>
          <input id="chbCadNif" type="text" maxlength="12" required placeholder="Ex: 283023805" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
        </div>
        <div>
          <label class="block text-slate-300 mb-1">Foto de Perfil do Atleta *</label>
          <input id="chbCadFoto" type="file" accept="image/*" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300">
        </div>
        <div>
          <label class="block text-slate-300 mb-1">Documento de Identificação (CNI / BI / Passaporte) *</label>
          <input id="chbCadDoc" type="file" accept="image/*,.pdf" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300">
        </div>
        <div>
          <label class="block text-slate-300 mb-1">Comprovativo de Pagamento (500$00)</label>
          <input id="chbCadComp" type="file" accept="image/*,.pdf" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300">
        </div>
      </div>
      <label class="flex items-start gap-2 text-slate-300 pt-1 cursor-pointer">
        <input id="chbCadTermo" type="checkbox" required class="mt-0.5 accent-amber-500">
        <span>Declaro aptidão física para treino de alta intensidade (CrossHitBox Tae) e autorizo o registo para validação do treinador e emissão de recibo.</span>
      </label>
    `;

    const btnSubmit = formInscricao.querySelector("button[type='submit'], input[type='submit']");
    if (btnSubmit && btnSubmit.parentNode) {
      btnSubmit.parentNode.insertBefore(blocoExtras, btnSubmit);
    } else {
      formInscricao.appendChild(blocoExtras);
    }

    formInscricao.addEventListener("submit", async () => {
      const inputs = Array.from(formInscricao.querySelectorAll("input"));
      const nome = (inputs.find((i) => (i.placeholder || i.name || "").toLowerCase().includes("nome"))?.value || "").trim();
      const email = (inputs.find((i) => i.type === "email" || (i.placeholder || "").toLowerCase().includes("mail"))?.value || "").trim().toLowerCase();
      const telefone = (inputs.find((i) => (i.placeholder || i.name || "").toLowerCase().includes("tel") || (i.placeholder || "").toLowerCase().includes("what"))?.value || "").trim();
      const nif = (document.getElementById("chbCadNif")?.value || "").trim();
      const termoAceite = Boolean(document.getElementById("chbCadTermo")?.checked);

      const fotoBase64 = await lerFicheiroBase64(document.getElementById("chbCadFoto")?.files?.[0]);
      const docBase64 = await lerFicheiroBase64(document.getElementById("chbCadDoc")?.files?.[0]);
      const compBase64 = await lerFicheiroBase64(document.getElementById("chbCadComp")?.files?.[0]);

      if (!email) return;

      const perfil = {
        email,
        nome: nome || email.split("@")[0],
        telefone,
        nif,
        foto_url: fotoBase64,
        documento_url: docBase64,
        status_acesso: "PENDENTE_VALIDACAO_E_PAGAMENTO",
        termo_aceite: termoAceite,
        atualizado_em: new Date().toISOString()
      };

      const perfis = lerLista(KEY_PERFIS_COMPLETOS);
      const idx = perfis.findIndex((p) => p.email === email);
      if (idx >= 0) perfis[idx] = Object.assign(perfis[idx], perfil);
      else perfis.unshift(perfil);
      guardarLista(KEY_PERFIS_COMPLETOS, perfis);

      try {
        await fetch("/api/crosshitbox/perfis-completos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(perfil)
        });
      } catch {}

      if (compBase64) {
        const pg = {
          id: "PG-" + Date.now(),
          email,
          nome: perfil.nome,
          nif,
          valor: "500$00",
          mes_referencia: new Date().toISOString().slice(0, 7),
          estado: "Aguardando Validação",
          aprovado_admin: false,
          comprovativo_base64: compBase64,
          data_envio: new Date().toISOString()
        };
        const pgs = lerLista(KEY_PAGAMENTOS);
        pgs.unshift(pg);
        guardarLista(KEY_PAGAMENTOS, pgs);
        try {
          await fetch("/api/crosshitbox/pagamentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pg)
          });
        } catch {}
      }
    });
  }

  window.chbEnviarComprovativoBloqueio = async function (ev) {
    if (ev) ev.preventDefault();
    const statusEl = document.getElementById("bloqStatusMsg");
    const email = obterEmailAtletaLogado();
    const nif = (document.getElementById("bloqNifInput")?.value || "").trim();
    const metodo = (document.getElementById("bloqMetodoInput")?.value || "Transferência / Vinti4").trim();
    const file = document.getElementById("bloqCompFile")?.files?.[0];

    if (!file) {
      if (statusEl) {
        statusEl.className = "text-rose-400 font-semibold";
        statusEl.textContent = "Seleciona primeiro a imagem ou PDF do comprovativo antes de enviar.";
      }
      return;
    }

    if (statusEl) {
      statusEl.className = "text-amber-300 font-semibold";
      statusEl.textContent = "A preparar e enviar comprovativo para o treinador/gerente...";
    }

    let compBase64 = "";
    if (file.type && file.type.startsWith("image/")) {
      compBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
          const img = new Image();
          img.onload = async function () {
            const maxW = 900;
            let w = img.width || maxW;
            let h = img.height || maxW;
            if (w > maxW) {
              h = Math.round((h * maxW) / w);
              w = maxW;
            }
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            try { resolve(canvas.toDataURL("image/jpeg", 0.72)); }
            catch { resolve(String(e.target.result || "")); }
          };
          img.onerror = () => resolve(String(e.target.result || ""));
          img.src = String(e.target.result || "");
        };
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
    } else {
      compBase64 = await lerFicheiroBase64(file);
    }

    if (!compBase64) {
      if (statusEl) {
        statusEl.className = "text-rose-400 font-semibold";
        statusEl.textContent = "Não foi possível ler o ficheiro selecionado. Tenta com outra imagem ou PDF.";
      }
      return;
    }

    const perfis = lerLista(KEY_PERFIS_COMPLETOS);
    const perfilExistente = perfis.find((p) => (p.email || "").toLowerCase() === email);
    const nomeAtleta = (perfilExistente && perfilExistente.nome) || (email ? email.split("@")[0] : "Atleta");

    const pg = {
      id: "PG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      email: email || "atleta@crosshitbox.cv",
      nome: nomeAtleta,
      nif,
      metodo,
      valor: "500$00",
      mes_referencia: new Date().toISOString().slice(0, 7),
      estado: "Aguardando Validação",
      aprovado_admin: false,
      comprovativo_base64: compBase64,
      data_envio: new Date().toISOString()
    };

    const pgs = lerLista(KEY_PAGAMENTOS);
    pgs.unshift(pg);
    guardarLista(KEY_PAGAMENTOS, pgs);

    try {
      const resp = await fetch("/api/crosshitbox/pagamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pg)
      });
      if (resp && resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (Array.isArray(data.pagamentos)) guardarLista(KEY_PAGAMENTOS, data.pagamentos);
        if (statusEl) {
          statusEl.className = "text-emerald-300 font-semibold";
          statusEl.textContent = "Comprovativo enviado com sucesso para avaliação do treinador/gerente! Aguarda a confirmação.";
        }
        return;
      }
    } catch {}

    if (statusEl) {
      statusEl.className = "text-amber-300 font-semibold";
      statusEl.textContent = "Comprovativo guardado localmente e em fila de sincronização. Usa também o botão WhatsApp se quiseres notificar já o treinador.";
    }
  };

    const pgs = lerLista(KEY_PAGAMENTOS);
    pgs.unshift(pg);
    guardarLista(KEY_PAGAMENTOS, pgs);

    (async () => {
      try {
        await fetch("/api/crosshitbox/pagamentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pg)
        });
      } catch {}
    })();

    const statusEl = document.getElementById("bloqStatusMsg");
    if (statusEl) {
      statusEl.textContent = "Comprovativo enviado! O teu acesso permanece bloqueado até o treinador validar a inscrição e o pagamento.";
    }
  };

  function ocultarConteudoMembro(bloquear) {
    const ovId = "overlayBloqueioPagamentoCHB";
    const candidatos = Array.from(document.querySelectorAll("section, article, main > div, body > div")).filter((el) => {
      if (!el || el.id === ovId) return false;
      if (el.contains(document.getElementById(ovId))) return false;
      const t = (el.innerText || "");
      const temCabecalhoConta = t.includes("Atleta Autenticado") || t.includes("Terminar Sessão");
      const temConteudoPrograma =
        t.includes("Aula Ao Vivo") ||
        t.includes("Aula Online por Videochamada") ||
        t.includes("Vídeos de Aulas") ||
        t.includes("Dossiê de Progresso") ||
        t.includes("Relatório de Performance") ||
        t.includes("Plano de Alimentação") ||
        t.includes("Evolução Corporal") ||
        t.includes("Treino do Dia (WOD)") ||
        t.includes("Meu Check-in") ||
        t.includes("Cronómetro HIIT") ||
        t.includes("Sequência de Fogo");
      return temConteudoPrograma && !temCabecalhoConta;
    });

    candidatos.forEach((el) => {
      if (bloquear) {
        if (!el.dataset.prevDisplayChb) {
          el.dataset.prevDisplayChb = el.style.display || "";
        }
        el.style.setProperty("display", "none", "important");
      } else if ("prevDisplayChb" in el.dataset) {
        el.style.display = el.dataset.prevDisplayChb;
        delete el.dataset.prevDisplayChb;
      }
    });
  }

  async function aplicarBloqueioMembroSeNecessario() {
    if (detectarPagina() !== "MEMBRO") return;
    const bodyText = document.body ? (document.body.innerText || "") : "";
    const estaLogado =
      bodyText.includes("Atleta Autenticado") ||
      bodyText.includes("Terminar Sessão") ||
      bodyText.includes("Sessão ativa como:") ||
      Array.from(document.querySelectorAll("button, a")).some(
        (b) => ["sair", "terminar sessão"].includes((b.textContent || "").trim().toLowerCase()) && b.offsetParent !== null
      );

    if (!estaLogado) {
      ocultarConteudoMembro(false);
      const ov = document.getElementById("overlayBloqueioPagamentoCHB");
      if (ov) ov.remove();
      return;
    }

    const email = obterEmailAtletaLogado();
    let perfis = lerLista(KEY_PERFIS_COMPLETOS);
    let pagamentos = lerLista(KEY_PAGAMENTOS);

    try {
      const [rPerf, rPg] = await Promise.all([
        fetch("/api/crosshitbox/perfis-completos?_=" + Date.now(), { cache: "no-store" }).catch(() => null),
        fetch("/api/crosshitbox/pagamentos?_=" + Date.now(), { cache: "no-store" }).catch(() => null)
      ]);
      if (rPerf && rPerf.ok) {
        const d = await rPerf.json();
        if (Array.isArray(d.perfis) && d.perfis.length) {
          perfis = d.perfis;
          guardarLista(KEY_PERFIS_COMPLETOS, perfis);
        }
      }
      if (rPg && rPg.ok) {
        const d = await rPg.json();
        if (Array.isArray(d.pagamentos) && d.pagamentos.length) {
          pagamentos = d.pagamentos;
          guardarLista(KEY_PAGAMENTOS, pagamentos);
        }
      }
    } catch {}

    const check = verificarAcessoAtivo(email, perfis, pagamentos);

    if (check.ativo) {
      ocultarConteudoMembro(false);
      const ov = document.getElementById("overlayBloqueioPagamentoCHB");
      if (ov) ov.remove();
      return;
    }

    ocultarConteudoMembro(true);

    if (!document.getElementById("overlayBloqueioPagamentoCHB")) {
      const painel = document.createElement("section");
      painel.id = "overlayBloqueioPagamentoCHB";
      painel.className = "max-w-3xl mx-auto my-6 bg-slate-900 border-2 border-amber-500 rounded-2xl p-6 shadow-2xl text-xs space-y-4";
      painel.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-extrabold uppercase">Acesso Bloqueado — Pendente de Validação e Pagamento</span>
          <span class="text-slate-300 font-semibold">${email}</span>
        </div>
        <h2 class="text-xl font-black text-white">Conta em Análise — Ativação CrossHitBox Tae (500$00)</h2>
        <p class="text-slate-300 leading-relaxed">${check.motivo}</p>
        <p class="text-slate-400 leading-relaxed">Enquanto a inscrição e o pagamento não forem validados pelo treinador, o acesso às aulas ao vivo, vídeos gravados, relatórios, plano alimentar, WODs, check-in e dossiê permanece bloqueado.</p>

        <form onsubmit="chbEnviarComprovativoBloqueio(event)" class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">NIF do Atleta</label>
              <input id="bloqNifInput" type="text" placeholder="Ex: 283023805" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Comprovativo de Pagamento (Imagem ou PDF) *</label>
              <input id="bloqCompFile" type="file" accept="image/*,.pdf" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300">
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button type="submit" class="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">Enviar Comprovativo para Validação</button>
            <a href="https://wa.me/2389988886?text=${encodeURIComponent("Olá Treinador Silvio! Fiz a inscrição no CrossHitBox Tae (" + email + ") e aguardo validação e confirmação do pagamento (500$00).")}" target="_blank" rel="noopener" class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">Falar com Treinador no WhatsApp</a>
          </div>
          <div id="bloqStatusMsg" class="text-amber-300 font-semibold"></div>
        </form>
      `;
      document.body.appendChild(painel);
    }
  }

  window.chbAprovarEEmitirRecibo = async function (emailAtleta) {
    const email = (emailAtleta || "").toLowerCase();
    if (!email) return;

    const perfis = lerLista(KEY_PERFIS_COMPLETOS);
    const pagamentos = lerLista(KEY_PAGAMENTOS);
    const perfil = perfis.find((p) => p.email === email) || { email, nome: email.split("@")[0], nif: "" };

    const hoje = new Date();
    const validadeDate = new Date(hoje.getTime() + 30 * 86400000);
    const validadeStr = validadeDate.toISOString().slice(0, 10);
    const reciboNumero = "REC-" + hoje.getFullYear() + "-" + String(Math.floor(1000 + Math.random() * 9000));

    perfil.status_acesso = "ATIVO";
    perfil.validado_admin = true;
    perfil.validade_ate = validadeStr;
    perfil.recibo_numero = reciboNumero;

    const idxP = perfis.findIndex((p) => p.email === email);
    if (idxP >= 0) perfis[idxP] = perfil;
    else perfis.unshift(perfil);
    guardarLista(KEY_PERFIS_COMPLETOS, perfis);

    const novoPg = {
      id: "PG-" + Date.now(),
      email,
      nome: perfil.nome,
      nif: perfil.nif || "Consumidor Final",
      valor: "500$00",
      mes_referencia: hoje.toISOString().slice(0, 7),
      estado: "Pago / Ativo",
      aprovado_admin: true,
      recibo_numero: reciboNumero,
      validade_ate: validadeStr,
      data_pagamento: hoje.toISOString().slice(0, 10)
    };
    pagamentos.unshift(novoPg);
    guardarLista(KEY_PAGAMENTOS, pagamentos);

    try {
      await Promise.all([
        fetch("/api/crosshitbox/perfis-completos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(perfil)
        }),
        fetch("/api/crosshitbox/pagamentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(novoPg)
        })
      ]);
    } catch {}

    await window.renderGestaoDocumentosRecibosUI();
  };

  window.chbImprimirRecibo = function (reciboNumero, nome, email, nif, valor, validade) {
    const w = window.open("", "_blank", "width=720,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>Recibo ${reciboNumero} — CrossHitBox Tae</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#111} .box{border:2px solid #111;padding:24px;border-radius:10px} h1{margin:0 0 4px} .muted{color:#555;font-size:13px} table{width:100%;border-collapse:collapse;margin-top:18px} td,th{border:1px solid #ccc;padding:10px;text-align:left}</style>
      </head><body>
      <div class="box">
        <h1>CROSSHITBOX TAE — GINÁSIO KOSMO</h1>
        <div class="muted">Praia, Ilha de Santiago, Cabo Verde • Contacto: +238 9988886</div>
        <hr/>
        <h2>RECIBO DE PAGAMENTO N.º ${reciboNumero}</h2>
        <p><strong>Atleta:</strong> ${nome} (${email})<br/>
           <strong>NIF:</strong> ${nif || "Consumidor Final"}<br/>
           <strong>Data de Emissão:</strong> ${new Date().toISOString().slice(0, 10)}<br/>
           <strong>Acesso Válido Até:</strong> ${validade}</p>
        <table>
          <tr><th>Descrição</th><th>Periodicidade</th><th>Valor Pago</th></tr>
          <tr><td>Mensalidade Programa CrossHitBox Tae (Treino Funcional, Boxe &amp; Tae)</td><td>30 Dias</td><td><strong>${valor}</strong></td></tr>
        </table>
        <p style="margin-top:24px;font-size:12px;color:#444">Documento emitido eletronicamente pela plataforma CrossHitBox Tae.</p>
      </div>
      <script>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  window.chbEnviarReciboWhatsApp = async function (reciboNumero, nome, telefone, nif, valor, validade) {
    const tel = limparTelefoneCV(telefone);
    const texto = [
      `RECIBO DE PAGAMENTO — CROSSHITBOX TAE`,
      `Recibo N.º: ${reciboNumero}`,
      `Atleta: ${nome}`,
      `NIF: ${nif || "Consumidor Final"}`,
      `Serviço: Mensalidade CrossHitBox Tae`,
      `Valor Pago: ${valor}`,
      `Acesso Ativo Até: ${validade}`,
      `Área do atleta liberada em: ${window.location.origin}/membro.html`
    ].join("\n");
    const url = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener");
  };

  window.renderGestaoDocumentosRecibosUI = async function () {
    const alvo = document.getElementById("conteudoDocumentosRecibos");
    if (!alvo) return;

    let perfis = lerLista(KEY_PERFIS_COMPLETOS);
    let pagamentos = lerLista(KEY_PAGAMENTOS);
    try {
      const [rP, rPg] = await Promise.all([
        fetch("/api/crosshitbox/perfis-completos?_=" + Date.now(), { cache: "no-store" }).catch(() => null),
        fetch("/api/crosshitbox/pagamentos?_=" + Date.now(), { cache: "no-store" }).catch(() => null)
      ]);
      if (rP && rP.ok) {
        const d = await rP.json();
        if (Array.isArray(d.perfis) && d.perfis.length) perfis = d.perfis;
      }
      if (rPg && rPg.ok) {
        const d = await rPg.json();
        if (Array.isArray(d.pagamentos) && d.pagamentos.length) pagamentos = d.pagamentos;
      }
    } catch {}

    const emails = Array.from(new Set(perfis.map((p) => p.email).concat(pagamentos.map((g) => g.email)))).filter(Boolean);

    alvo.innerHTML = emails.length
      ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          ${emails.map((em) => {
            const p = perfis.find((x) => x.email === em) || { email: em, nome: em.split("@")[0] };
            const pg = pagamentos.find((x) => x.email === em && x.aprovado_admin === true);
            const ativo = p.status_acesso === "ATIVO" && Boolean(pg);
            const recibo = (pg && pg.recibo_numero) || p.recibo_numero || "";
            const validade = (pg && pg.validade_ate) || p.validade_ate || "";

            return `
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5">
                    ${p.foto_url ? `<img src="${p.foto_url}" alt="Foto" class="w-11 h-11 rounded-full object-cover border border-amber-500/50">` : `<div class="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-400">${(p.nome || "A")[0].toUpperCase()}</div>`}
                    <div>
                      <div class="font-bold text-white text-sm">${p.nome || em}</div>
                      <div class="text-slate-400">${em} • NIF: <strong class="text-slate-200">${p.nif || "Não informado"}</strong></div>
                    </div>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full font-bold ${ativo ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}">
                    ${ativo ? "Acesso Liberado" : "Bloqueado / Pendente"}
                  </span>
                </div>

                <div class="flex flex-wrap gap-2">
                  ${p.documento_url ? `<a href="${p.documento_url}" download="BI_${p.nome || em}" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold">Descarregar BI/Documento</a>` : `<span class="text-slate-500">Sem BI anexado</span>`}
                  ${(pagamentos.find((x) => x.email === em && x.comprovativo_base64) || {}).comprovativo_base64 ? `<a href="${(pagamentos.find((x) => x.email === em && x.comprovativo_base64) || {}).comprovativo_base64}" download="Comprovativo_${p.nome || em}.jpg" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold">Ver / Baixar Comprovativo</a>` : `<span class="text-amber-400/80">Sem comprovativo ainda</span>`}
                </div>

                <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
                  <button type="button" onclick="chbAprovarEEmitirRecibo('${em}')" class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold">
                    ${ativo ? "Renovar +30 Dias & Novo Recibo" : "Validar Inscrição, Pagamento & Liberar"}
                  </button>
                  ${
                    recibo
                      ? `<button type="button" onclick="chbImprimirRecibo('${recibo}','${(p.nome || em).replace(/'/g, "")}','${em}','${p.nif || ""}','500$00','${validade}')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold">PDF Recibo (${recibo})</button>
                         <button type="button" onclick="chbEnviarReciboWhatsApp('${recibo}','${(p.nome || em).replace(/'/g, "")}','${p.telefone || ""}','${p.nif || ""}','500$00','${validade}')" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">Enviar Recibo WhatsApp</button>`
                      : ""
                  }
                </div>
              </div>
            `;
          }).join("")}
        </div>`
      : `<div class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">Ainda não existem inscritos com ficha documentada.</div>`;
  };

  const pag = detectarPagina();
  if (pag === "PUBLICO") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aprimorarFormularioInscricao);
    else aprimorarFormularioInscricao();
    setTimeout(aprimorarFormularioInscricao, 600);
  } else if (pag === "MEMBRO") {
    setInterval(aplicarBloqueioMembroSeNecessario, 400);
    setTimeout(aplicarBloqueioMembroSeNecessario, 200);
  } else if (pag === "ADMIN") {
    const sec = document.createElement("section");
    sec.id = "cadastroBlindagemModulo";
    sec.className = "hidden max-w-6xl mx-auto my-6 bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-5 shadow-xl";
    sec.style.display = "none";
    sec.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 class="text-base font-bold text-emerald-400">Validação de Inscrição, Pagamento &amp; Emissão de Recibos</h2>
          <p class="text-xs text-slate-400">Nenhum atleta acede aos treinos, vídeos, relatórios ou planos sem validação e pagamento confirmado por ti.</p>
        </div>
        <button type="button" onclick="renderGestaoDocumentosRecibosUI()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Atualizar</button>
      </div>
      <div id="conteudoDocumentosRecibos"></div>
    `;
    const ref = document.getElementById("modoComandoModulo") || document.body.firstChild;
    if (ref && ref.parentNode) ref.parentNode.insertBefore(sec, ref);

    setInterval(() => {
      const txt = document.body ? (document.body.innerText || "") : "";
      const logado = txt.includes("Sessão ativa como:") || txt.includes("Configurar Sala de Videochamada") || Array.from(document.querySelectorAll("button, a")).some((b) => (b.textContent || "").trim().toLowerCase() === "sair" && b.offsetParent !== null);
      if (logado && sec.style.display === "none") {
        sec.classList.remove("hidden");
        sec.style.display = "";
        window.renderGestaoDocumentosRecibosUI();
      } else if (!logado && sec.style.display !== "none") {
        sec.classList.add("hidden");
        sec.style.display = "none";
      }
    }, 600);
  }
})();
