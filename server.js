require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const criarRotasCrossHitBox = require('./crosshitbox');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const supabaseUrl = process.env.SUPABASE_URL || 'https://sqixuupmbtiprvgddxeo.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

app.use('/api/crosshitbox', criarRotasCrossHitBox(supabase));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


const pathMod = require("path");
const fsMod = require("fs");

function lerJsonLocal(nomeFicheiro) {
  try {
    const p = pathMod.join(__dirname, nomeFicheiro);
    if (!fsMod.existsSync(p)) return [];
    const parsed = JSON.parse(fsMod.readFileSync(p, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escreverJsonLocal(nomeFicheiro, dados) {
  try {
    const p = pathMod.join(__dirname, nomeFicheiro);
    fsMod.writeFileSync(p, JSON.stringify(dados, null, 2), "utf8");
  } catch {}
}


const { createClient: _createSbClient } = require("@supabase/supabase-js");
global.__sbCrossHitBox = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  ? _createSbClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

function obterClienteSupabase() {
  if (global.__sbCrossHitBox) return global.__sbCrossHitBox;
  if (typeof supabase !== "undefined" && supabase) return supabase;
  if (global.supabase) return global.supabase;
  return null;
}

app.get("/api/crosshitbox/presencas", async (req, res) => {
  const sb = obterClienteSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("presencas_crosshitbox")
        .select("*")
        .order("id", { ascending: false })
        .limit(500);
      if (!error && Array.isArray(data)) {
        return res.json({ presencas: data });
      }
    } catch {}
  }
  res.json({ presencas: lerJsonLocal("presencas_local.json") });
});

app.post("/api/crosshitbox/presencas", async (req, res) => {
  const body = req.body || {};
  if (!body.email || !body.data) {
    return res.status(400).json({ erro: "Campos email e data sao obrigatorios." });
  }
  const registo = {
    email: String(body.email).trim().toLowerCase(),
    nome: String(body.nome || body.email).trim(),
    data: String(body.data).trim(),
    hora: String(body.hora || "").trim(),
    turno: String(body.turno || "05:00 - Madrugada").trim(),
    origem: String(body.origem || "Check-in Manual").trim(),
    timestamp: String(body.timestamp || new Date().toISOString()).trim()
  };

  const local = lerJsonLocal("presencas_local.json");
  const existe = local.some(
    (r) => r.email === registo.email && r.data === registo.data && r.origem === registo.origem
  );
  if (!existe) {
    local.unshift(registo);
    escreverJsonLocal("presencas_local.json", local);
  }

  const sb = obterClienteSupabase();
  if (sb) {
    try {
      await sb.from("presencas_crosshitbox").insert([registo]);
    } catch {}
  }

  res.status(201).json({ ok: true, presenca: registo });
});

app.get("/api/crosshitbox/pagamentos", async (req, res) => {
  const sb = obterClienteSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("pagamentos_crosshitbox")
        .select("*")
        .order("atualizado_em", { ascending: false })
        .limit(500);
      if (!error && Array.isArray(data)) {
        const normalizados = data.map((d) => ({
          id: d.id,
          email: d.email,
          nome: d.nome,
          mes: d.mes,
          referencia: d.referencia,
          arquivoNome: d.arquivo_nome,
          arquivoDataUrl: d.arquivo_data_url,
          estado: d.estado,
          atualizadoEm: d.atualizado_em
        }));
        return res.json({ pagamentos: normalizados });
      }
    } catch {}
  }
  res.json({ pagamentos: lerJsonLocal("pagamentos_local.json") });
});

app.post("/api/crosshitbox/pagamentos", async (req, res) => {
  const body = req.body || {};
  if (!body.email || !body.mes) {
    return res.status(400).json({ erro: "Campos email e mes sao obrigatorios." });
  }
  const id = String(body.id || (String(body.email).trim().toLowerCase() + "_" + String(body.mes).trim()));
  const registo = {
    id,
    email: String(body.email).trim().toLowerCase(),
    nome: String(body.nome || body.email).trim(),
    mes: String(body.mes).trim(),
    referencia: String(body.referencia || "").trim(),
    arquivoNome: String(body.arquivoNome || body.arquivo_nome || "comprovativo").trim(),
    arquivoDataUrl: String(body.arquivoDataUrl || body.arquivo_data_url || ""),
    estado: String(body.estado || "Em Análise").trim(),
    atualizadoEm: String(body.atualizadoEm || new Date().toISOString()).trim()
  };

  const local = lerJsonLocal("pagamentos_local.json");
  const idx = local.findIndex((p) => p.id === id);
  if (idx >= 0) local[idx] = registo;
  else local.unshift(registo);
  escreverJsonLocal("pagamentos_local.json", local);

  const sb = obterClienteSupabase();
  if (sb) {
    try {
      await sb.from("pagamentos_crosshitbox").upsert([{
        id: registo.id,
        email: registo.email,
        nome: registo.nome,
        mes: registo.mes,
        referencia: registo.referencia,
        arquivo_nome: registo.arquivoNome,
        arquivo_data_url: registo.arquivoDataUrl,
        estado: registo.estado,
        atualizado_em: registo.atualizadoEm
      }], { onConflict: "id" });
    } catch {}
  }

  res.status(201).json({ ok: true, pagamento: registo });
});


app.get("/api/crosshitbox/wod", async (req, res) => {
  const sb = obterClienteSupabase();
  let wods = lerJsonLocal("wod_local.json");
  let resultados = lerJsonLocal("wod_resultados_local.json");
  if (sb) {
    try {
      const r1 = await sb.from("wod_crosshitbox").select("*").order("data", { ascending: false }).limit(30);
      if (!r1.error && Array.isArray(r1.data) && r1.data.length) wods = r1.data;
      const r2 = await sb.from("wod_resultados_crosshitbox").select("*").order("atualizado_em", { ascending: false }).limit(200);
      if (!r2.error && Array.isArray(r2.data) && r2.data.length) resultados = r2.data;
    } catch {}
  }
  res.json({ wods, resultados });
});

app.post("/api/crosshitbox/wod", async (req, res) => {
  const b = req.body || {};
  if (!b.titulo || !b.descricao) return res.status(400).json({ erro: "Titulo e descricao obrigatorios." });
  const data = String(b.data || new Date().toISOString().slice(0, 10));
  const turno = String(b.turno || "TODOS");
  const id = String(b.id || (data + "_" + turno));
  const reg = { id, data, turno, titulo: String(b.titulo), tipo: String(b.tipo || "AMRAP"), descricao: String(b.descricao), atualizado_em: new Date().toISOString() };
  const local = lerJsonLocal("wod_local.json");
  const idx = local.findIndex((x) => x.id === id);
  if (idx >= 0) local[idx] = reg; else local.unshift(reg);
  escreverJsonLocal("wod_local.json", local);
  const sb = obterClienteSupabase();
  if (sb) { try { await sb.from("wod_crosshitbox").upsert([reg], { onConflict: "id" }); } catch {} }
  res.status(201).json({ ok: true, wod: reg });
});

app.post("/api/crosshitbox/wod/resultado", async (req, res) => {
  const b = req.body || {};
  if (!b.email || !b.resultado) return res.status(400).json({ erro: "Email e resultado obrigatorios." });
  const data = String(b.data || new Date().toISOString().slice(0, 10));
  const email = String(b.email).trim().toLowerCase();
  const id = String(b.id || (data + "_" + email));
  const reg = { id, data, turno: String(b.turno || "05:00 - Madrugada"), email, nome: String(b.nome || email), resultado: String(b.resultado), observacao: String(b.observacao || ""), atualizado_em: new Date().toISOString() };
  const local = lerJsonLocal("wod_resultados_local.json");
  const idx = local.findIndex((x) => x.id === id);
  if (idx >= 0) local[idx] = reg; else local.unshift(reg);
  escreverJsonLocal("wod_resultados_local.json", local);
  const sb = obterClienteSupabase();
  if (sb) { try { await sb.from("wod_resultados_crosshitbox").upsert([reg], { onConflict: "id" }); } catch {} }
  res.status(201).json({ ok: true, resultado: reg });
});


app.get("/api/crosshitbox/evolucao", async (req, res) => {
  const sb = obterClienteSupabase();
  let evolucoes = lerJsonLocal("evolucao_local.json");
  if (sb) {
    try {
      const r = await sb.from("evolucao_crosshitbox").select("*").order("data", { ascending: false }).limit(300);
      if (!r.error && Array.isArray(r.data) && r.data.length) evolucoes = r.data;
    } catch {}
  }
  res.json({ evolucoes });
});

app.post("/api/crosshitbox/evolucao", async (req, res) => {
  const b = req.body || {};
  if (!b.email) return res.status(400).json({ erro: "Email obrigatorio." });
  const reg = {
    id: String(b.id || (String(b.email).trim().toLowerCase() + "_" + Date.now())),
    email: String(b.email).trim().toLowerCase(),
    nome: String(b.nome || b.email).trim(),
    data: String(b.data || new Date().toISOString().slice(0, 10)),
    peso_kg: b.peso_kg || null,
    cintura_cm: b.cintura_cm || null,
    teste_fisico: String(b.teste_fisico || "Avaliação Física"),
    resultado_teste: String(b.resultado_teste || "-"),
    observacao: String(b.observacao || ""),
    atualizado_em: new Date().toISOString()
  };
  const local = lerJsonLocal("evolucao_local.json");
  local.unshift(reg);
  escreverJsonLocal("evolucao_local.json", local);
  const sb = obterClienteSupabase();
  if (sb) { try { await sb.from("evolucao_crosshitbox").upsert([reg], { onConflict: "id" }); } catch {} }
  res.status(201).json({ ok: true, evolucao: reg });
});


const PLANOS_ALIMENTARES_BACKEND = {
  EMAGRECIMENTO: [
    "Plano Alimentar — Emagrecimento & Definição (CrossHitBox Tae)",
    "Estratégia: Défice calórico moderado, alta proteína e hidratos controlados.",
    "Pré-treino 05:00: Café sem açúcar + 1/2 banana (ou treino em jejum com 400ml de água).",
    "Pré-treino 18:00: Iogurte natural + 1 fruta ou 2 ovos com 1 fatia de pão integral.",
    "1. Pequeno-almoço/Pós-treino: 3 ovos + 1 fatia pão integral + fruta.",
    "2. Almoço: 160g frango/peixe/atum + metade do prato legumes + 3-4 colheres arroz/feijão.",
    "3. Lanche: Iogurte natural sem açúcar ou queijo fresco magro.",
    "4. Jantar: 150g peixe/frango/omelete + legumes salteados ou sopa de legumes.",
    "Hidratação: 35ml/kg/dia + 500ml no treino."
  ].join("\n"),
  HIPERTROFIA: [
    "Plano Alimentar — Ganho de Massa & Força (CrossHitBox Tae)",
    "Estratégia: Superávit calórico limpo com proteína em todas as refeições.",
    "Pré-treino 05:00: 1 banana + aveia/mel + café.",
    "Pré-treino 18:00: Sanduíche integral de frango ou atum + 1 fruta.",
    "1. Pequeno-almoço/Pós-treino: 3-4 ovos + 2 fatias pão integral ou aveia + banana.",
    "2. Almoço: 200g carne magra/frango/peixe + 5-6 colheres arroz + feijão + salada.",
    "3. Lanche: Iogurte/leite + aveia + fruta ou pasta de amendoim.",
    "4. Jantar: 180g proteína + batata-doce/mandioca/arroz + legumes.",
    "Hidratação: 35-40ml/kg/dia."
  ].join("\n"),
  CONDICIONAMENTO: [
    "Plano Alimentar — Condicionamento & Performance Tae",
    "Estratégia: Energia estável para HIIT/Tabata e recuperação muscular rápida.",
    "Pré-treino 05:00: 1 fruta rápida + café preto ou água.",
    "Pré-treino 18:00: Iogurte natural com aveia e fruta.",
    "1. Pequeno-almoço/Pós-treino: 2-3 ovos + 1-2 fatias pão integral + fruta.",
    "2. Almoço: 170g peixe/frango/carne magra + 4-5 colheres arroz/feijão + legumes.",
    "3. Lanche: Queijo fresco ou ovos cozidos + fruta.",
    "4. Jantar: 160g proteína grelhada + legumes e pequena porção de hidrato complexo.",
    "Hidratação: 2,5L a 3L de água/dia."
  ].join("\n")
};

async function gerarLoteRelatoriosPerformance(periodo = "SEMANAL", objetivoPadrao = "CONDICIONAMENTO") {
  const sb = obterClienteSupabase();
  let membros = [];
  let presencas = lerJsonLocal("presencas_local.json");
  let wods = lerJsonLocal("wod_resultados_local.json");
  let evolucoes = lerJsonLocal("evolucao_local.json");

  if (sb) {
    try {
      const mRes = await sb.from("membros").select("*");
      if (!mRes.error && Array.isArray(mRes.data)) membros = mRes.data;
      const pRes = await sb.from("presencas_crosshitbox").select("*").limit(500);
      if (!pRes.error && Array.isArray(pRes.data)) presencas = pRes.data;
      const wRes = await sb.from("wod_resultados_crosshitbox").select("*").limit(300);
      if (!wRes.error && Array.isArray(wRes.data)) wods = wRes.data;
      const eRes = await sb.from("evolucao_crosshitbox").select("*").limit(300);
      if (!eRes.error && Array.isArray(eRes.data)) evolucoes = eRes.data;
    } catch {}
  }

  const emailsUnicos = new Map();
  for (const m of membros) {
    if (m.email) emailsUnicos.set(String(m.email).toLowerCase(), { email: String(m.email).toLowerCase(), nome: m.nome || m.email, turno: m.horario || "05:00 - Madrugada", objetivo: m.objetivo || objetivoPadrao });
  }
  for (const p of presencas) {
    if (p.email && !emailsUnicos.has(String(p.email).toLowerCase())) {
      emailsUnicos.set(String(p.email).toLowerCase(), { email: String(p.email).toLowerCase(), nome: p.nome || p.email, turno: p.turno || "05:00 - Madrugada", objetivo: objetivoPadrao });
    }
  }

  const hoje = new Date();
  const dias = periodo === "MENSAL" ? 30 : 7;
  const limite = hoje.getTime() - dias * 86400000;
  const ref = periodo === "MENSAL" ? hoje.toISOString().slice(0, 7) : hoje.toISOString().slice(0, 10);
  const localRels = lerJsonLocal("relatorios_perf_local.json");

  for (const atleta of emailsUnicos.values()) {
    const pAtleta = presencas.filter((x) => (x.email || "").toLowerCase() === atleta.email && new Date(x.data || 0).getTime() >= limite);
    const wAtleta = wods.filter((x) => (x.email || "").toLowerCase() === atleta.email && new Date(x.data || 0).getTime() >= limite);
    const eAtleta = evolucoes.filter((x) => (x.email || "").toLowerCase() === atleta.email).sort((a, b) => (a.data || "").localeCompare(b.data || ""));
    const ult = eAtleta[eAtleta.length - 1];
    const objKey = PLANOS_ALIMENTARES_BACKEND[atleta.objetivo] ? atleta.objetivo : objetivoPadrao;

    const resumoTexto = [
      `CROSSHITBOX TAE — RELATÓRIO ${periodo} (${ref})`,
      `Atleta: ${atleta.nome} (${atleta.email})`,
      `Turno: ${atleta.turno}`,
      `Treinos nos últimos ${dias} dias: ${pAtleta.length}`,
      `WODs concluídos no período: ${wAtleta.length}${wAtleta[0] ? " (Último: " + wAtleta[0].resultado + ")" : ""}`,
      `Última avaliação física: ${ult ? (ult.peso_kg || "-") + " kg | Cintura: " + (ult.cintura_cm || "-") + " cm | Teste: " + (ult.resultado_teste || "-") : "Pendente de registo na Área do Atleta"}`
    ].join("\n");

    const reg = {
      id: `${atleta.email}_${periodo}_${ref}`,
      email: atleta.email,
      nome: atleta.nome,
      turno: atleta.turno,
      objetivo: objKey,
      periodo,
      referencia: ref,
      resumo_texto: resumoTexto,
      plano_alimentar: PLANOS_ALIMENTARES_BACKEND[objKey],
      atualizado_em: new Date().toISOString()
    };

    const idx = localRels.findIndex((r) => r.id === reg.id);
    if (idx >= 0) localRels[idx] = reg; else localRels.unshift(reg);
    if (sb) { try { await sb.from("relatorios_atleta_crosshitbox").upsert([reg], { onConflict: "id" }); } catch {} }
  }

  escreverJsonLocal("relatorios_perf_local.json", localRels);
  return localRels;
}

app.get("/api/crosshitbox/relatorios-performance", async (req, res) => {
  const sb = obterClienteSupabase();
  let relatorios = lerJsonLocal("relatorios_perf_local.json");
  if (sb) {
    try {
      const r = await sb.from("relatorios_atleta_crosshitbox").select("*").order("atualizado_em", { ascending: false }).limit(300);
      if (!r.error && Array.isArray(r.data) && r.data.length) relatorios = r.data;
    } catch {}
  }
  res.json({ relatorios });
});

app.post("/api/crosshitbox/relatorios-performance", async (req, res) => {
  const b = req.body || {};
  if (!b.email || !b.resumo_texto) return res.status(400).json({ erro: "Campos obrigatorios em falta." });
  const id = String(b.id || (String(b.email).toLowerCase() + "_" + Date.now()));
  const reg = {
    id,
    email: String(b.email).trim().toLowerCase(),
    nome: String(b.nome || b.email).trim(),
    turno: String(b.turno || "05:00 - Madrugada"),
    objetivo: String(b.objetivo || "CONDICIONAMENTO"),
    periodo: String(b.periodo || "SEMANAL"),
    referencia: String(b.referencia || new Date().toISOString().slice(0, 10)),
    resumo_texto: String(b.resumo_texto),
    plano_alimentar: String(b.plano_alimentar || PLANOS_ALIMENTARES_BACKEND.CONDICIONAMENTO),
    atualizado_em: new Date().toISOString()
  };
  const local = lerJsonLocal("relatorios_perf_local.json");
  const idx = local.findIndex((x) => x.id === id);
  if (idx >= 0) local[idx] = reg; else local.unshift(reg);
  escreverJsonLocal("relatorios_perf_local.json", local);
  const sb = obterClienteSupabase();
  if (sb) { try { await sb.from("relatorios_atleta_crosshitbox").upsert([reg], { onConflict: "id" }); } catch {} }
  res.status(201).json({ ok: true, relatorio: reg });
});

app.post("/api/crosshitbox/relatorios-performance/executar-lote", async (req, res) => {
  const b = req.body || {};
  const relatorios = await gerarLoteRelatoriosPerformance(b.periodo || "SEMANAL", b.objetivoPadrao || "CONDICIONAMENTO");
  res.json({ ok: true, total: relatorios.length, relatorios });
});

let ultimoDisparoAutomatico = "";
setInterval(async () => {
  const agora = new Date();
  const chaveHora = agora.toISOString().slice(0, 13);
  if (chaveHora === ultimoDisparoAutomatico) return;
  if (agora.getUTCDay() === 1 && agora.getUTCHours() === 7) {
    ultimoDisparoAutomatico = chaveHora;
    await gerarLoteRelatoriosPerformance("SEMANAL", "CONDICIONAMENTO").catch(() => {});
  }
  if (agora.getUTCDate() === 1 && agora.getUTCHours() === 8) {
    ultimoDisparoAutomatico = chaveHora;
    await gerarLoteRelatoriosPerformance("MENSAL", "CONDICIONAMENTO").catch(() => {});
  }
}, 60 * 1000);


app.get("/fundo-crosshitbox-tae.jpg", (req, res) => {
  const opcoes = [
    path.join(__dirname, "fundo-crosshitbox-tae.jpg"),
    path.join(__dirname, "fundo-crosshitbox-tae.png"),
    path.join(__dirname, "fundo-crosshitbox-tae.jpg.jpeg"),
    path.join(__dirname, "KOSMO CROSSHITBOX TAE.jpeg")
  ];
  for (const p of opcoes) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).end();
});


app.get("/api/crosshitbox/perfis-completos", async (req, res) => {
  const sb = obterClienteSupabase();
  let perfis = lerJsonLocal("perfis_completos_local.json");
  if (sb) {
    try {
      const r = await sb.from("membros").select("*").limit(500);
      if (!r.error && Array.isArray(r.data) && r.data.length) perfis = r.data;
    } catch {}
  }
  res.json({ perfis });
});

app.post("/api/crosshitbox/perfis-completos", async (req, res) => {
  const b = req.body || {};
  if (!b.email) return res.status(400).json({ erro: "Email obrigatorio." });
  const email = String(b.email).trim().toLowerCase();
  const reg = {
    email,
    nome: String(b.nome || email.split("@")[0]),
    telefone: String(b.telefone || ""),
    nif: String(b.nif || ""),
    foto_url: String(b.foto_url || ""),
    documento_url: String(b.documento_url || ""),
    status_acesso: String(b.status_acesso || "PENDENTE_PAGAMENTO"),
    validade_ate: String(b.validade_ate || ""),
    recibo_numero: String(b.recibo_numero || ""),
    termo_aceite: Boolean(b.termo_aceite),
    atualizado_em: new Date().toISOString()
  };
  const local = lerJsonLocal("perfis_completos_local.json");
  const idx = local.findIndex((x) => x.email === email);
  if (idx >= 0) local[idx] = Object.assign(local[idx], reg);
  else local.unshift(reg);
  escreverJsonLocal("perfis_completos_local.json", local);

  const sb = obterClienteSupabase();
  if (sb) {
    try {
      await sb.from("membros").upsert([reg], { onConflict: "email" });
    } catch {}
  }
  res.status(201).json({ ok: true, perfil: reg });
});


async function carregarVideosPersistentes() {
  const sb = obterClienteSupabase();
  let videos = lerJsonLocal("videos_aulas_local.json");
  if (sb) {
    try {
      const r = await sb.from("videos_aulas_crosshitbox").select("*").order("created_at", { ascending: false }).limit(200);
      if (!r.error && Array.isArray(r.data)) {
        videos = r.data;
        escreverJsonLocal("videos_aulas_local.json", videos);
      }
    } catch {}
  }
  return Array.isArray(videos) ? videos : [];
}

app.get("/api/crosshitbox/videos-aulas", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const videos = await carregarVideosPersistentes();
  res.json({ videos });
});

app.post("/api/crosshitbox/videos-aulas", async (req, res) => {
  const b = req.body || {};
  if (!b.titulo || !b.link) return res.status(400).json({ erro: "Titulo e link obrigatorios." });
  const item = {
    id: String(b.id || ("VID-" + Date.now())),
    titulo: String(b.titulo).trim(),
    link: String(b.link).trim(),
    turno: String(b.turno || "TODOS").trim(),
    descricao: String(b.descricao || "").trim(),
    atualizado_em: new Date().toISOString()
  };

  let videos = await carregarVideosPersistentes();
  const idx = videos.findIndex((x) => String(x.id) === item.id);
  if (idx >= 0) videos[idx] = item;
  else videos.unshift(item);

  escreverJsonLocal("videos_aulas_local.json", videos);
  const sb = obterClienteSupabase();
  if (sb) {
    try {
      await sb.from("videos_aulas_crosshitbox").upsert([item], { onConflict: "id" });
    } catch {}
  }
  res.status(201).json({ ok: true, video: item, videos });
});

app.delete("/api/crosshitbox/videos-aulas/:id", async (req, res) => {
  const idAlvo = String(req.params.id || "").trim();
  if (!idAlvo) return res.status(400).json({ erro: "ID obrigatorio." });

  let videos = await carregarVideosPersistentes();
  videos = videos.filter((x) => String(x.id) !== idAlvo);
  escreverJsonLocal("videos_aulas_local.json", videos);

  const sb = obterClienteSupabase();
  if (sb) {
    try {
      await sb.from("videos_aulas_crosshitbox").delete().eq("id", idAlvo);
    } catch {}
  }
  res.json({ ok: true, removido: idAlvo, videos });
});


async function carregarTurnosPersistentes() {
  const sb = obterClienteSupabase();
  let turnos = lerJsonLocal("turnos_crosshitbox_local.json");
  if (sb) {
    try {
      const r = await sb.from("turnos_crosshitbox").select("*").order("created_at", { ascending: false }).limit(100);
      if (!r.error && Array.isArray(r.data) && r.data.length) {
        turnos = r.data;
        escreverJsonLocal("turnos_crosshitbox_local.json", turnos);
      }
    } catch {}
  }
  return Array.isArray(turnos) ? turnos : [];
}

async function carregarExcluidosPersistentes() {
  const sb = obterClienteSupabase();
  const setExcl = new Set(lerJsonLocal("membros_excluidos_local.json").map((x) => String(x).toLowerCase()));
  if (sb) {
    try {
      const r = await sb.from("membros_excluidos_crosshitbox").select("email").limit(1000);
      if (!r.error && Array.isArray(r.data)) {
        r.data.forEach((row) => {
          if (row && row.email) setExcl.add(String(row.email).toLowerCase());
        });
      }
    } catch {}
  }
  const arr = Array.from(setExcl);
  escreverJsonLocal("membros_excluidos_local.json", arr);
  return arr;
}

app.get("/api/crosshitbox/turnos", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const turnos = await carregarTurnosPersistentes();
  res.json({ turnos });
});

app.post("/api/crosshitbox/turnos", async (req, res) => {
  const b = req.body || {};
  if (!b.nome || !b.horario) return res.status(400).json({ erro: "Nome e horario obrigatorios." });
  const item = {
    id: String(b.id || ("TRN-" + Date.now())),
    nome: String(b.nome).trim(),
    horario: String(b.horario).trim(),
    dias: String(b.dias || "Seg a Sex").trim(),
    vagas: Number(b.vagas || 25),
    notas: String(b.notas || "").trim(),
    ativo: b.ativo !== false,
    atualizado_em: new Date().toISOString()
  };

  let turnos = await carregarTurnosPersistentes();
  const idx = turnos.findIndex((t) => String(t.id) === item.id);
  if (idx >= 0) turnos[idx] = item;
  else turnos.unshift(item);
  escreverJsonLocal("turnos_crosshitbox_local.json", turnos);

  const sb = obterClienteSupabase();
  if (sb) {
    try {
      await sb.from("turnos_crosshitbox").upsert([item], { onConflict: "id" });
    } catch {}
  }
  res.status(201).json({ ok: true, turno: item, turnos });
});

app.delete("/api/crosshitbox/turnos/:id", async (req, res) => {
  const idAlvo = String(req.params.id || "").trim();
  if (!idAlvo) return res.status(400).json({ erro: "ID obrigatorio." });

  let turnos = await carregarTurnosPersistentes();
  turnos = turnos.filter((t) => String(t.id) !== idAlvo);
  escreverJsonLocal("turnos_crosshitbox_local.json", turnos);

  const sb = obterClienteSupabase();
  if (sb) {
    try {
      await sb.from("turnos_crosshitbox").delete().eq("id", idAlvo);
    } catch {}
  }
  res.json({ ok: true, removido: idAlvo, turnos });
});

app.get("/api/crosshitbox/membros-excluidos", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const excluidos = await carregarExcluidosPersistentes();
  res.json({ excluidos });
});

app.delete("/api/crosshitbox/membros/:email", async (req, res) => {
  const em = decodeURIComponent(String(req.params.email || "")).trim().toLowerCase();
  if (!em) return res.status(400).json({ erro: "Email obrigatorio." });

  const exclSet = new Set(await carregarExcluidosPersistentes());
  exclSet.add(em);
  const exclArr = Array.from(exclSet);
  escreverJsonLocal("membros_excluidos_local.json", exclArr);

  const perfLocal = lerJsonLocal("perfis_completos_local.json").filter((x) => (x.email || "").toLowerCase() !== em);
  escreverJsonLocal("perfis_completos_local.json", perfLocal);

  const sb = obterClienteSupabase();
  if (sb) {
    try {
      await sb.from("membros_excluidos_crosshitbox").upsert([{ email: em, removido_em: new Date().toISOString() }], { onConflict: "email" });
      await sb.from("membros").delete().eq("email", em);
    } catch {}
  }
  res.json({ ok: true, excluido: em, excluidos: exclArr });
});

app.listen(PORT, () => {
  console.log(`Servidor CrossHitBox Tae ativo na porta ${PORT}`);
});
