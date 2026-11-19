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

function obterClienteSupabase() {
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

app.listen(PORT, () => {
  console.log(`Servidor CrossHitBox Tae ativo na porta ${PORT}`);
});
