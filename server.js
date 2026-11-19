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

app.listen(PORT, () => {
  console.log(`Servidor CrossHitBox Tae ativo na porta ${PORT}`);
});
