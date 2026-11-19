const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_LOCAL_PATH = path.join(__dirname, 'membros_local.json');

function lerMembrosLocais() {
  try {
    if (!fs.existsSync(DB_LOCAL_PATH)) return [];
    return JSON.parse(fs.readFileSync(DB_LOCAL_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function guardarMembrosLocais(lista) {
  fs.writeFileSync(DB_LOCAL_PATH, JSON.stringify(lista, null, 2), 'utf8');
}

function gerarPasswordTemporaria(tamanho = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

async function enviarEmailBoasVindas({ nome, email, horario, preco, passwordTemp }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: `"Ginásio Kosmo" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Inscrição Confirmada — CrossHitBox Tae',
    text: `Olá ${nome},\n\nA sua inscrição no CrossHitBox Tae foi confirmada.\nTurno: ${horario}\nPreço aplicado: ${preco} ECV\nPassword temporária: ${passwordTemp}\n\nGinásio Kosmo`
  });
}

module.exports = function (supabase) {
  const router = express.Router();

  router.get('/horarios', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('horarios_crosshitbox')
        .select('*')
        .order('hora', { ascending: true });

      if (!error && data && data.length > 0) {
        return res.json({ success: true, horarios: data });
      }
    } catch {}

    return res.json({
      success: true,
      horarios: [
        { id: 1, hora: '05:00', turno: '05:00 - Madrugada', vagas: 20 },
        { id: 2, hora: '18:00', turno: '18:00 - Tarde', vagas: 20 }
      ]
    });
  });

  router.post('/registar', async (req, res) => {
    try {
      const { nome, email, telefone, horario } = req.body;
      if (!nome || !email || !horario) {
        return res.status(400).json({ success: false, error: 'Nome, e-mail e turno são obrigatórios.' });
      }

      let precoAplicado = 3500;
      try {
        const { data: config } = await supabase
          .from('configuracoes_sistema')
          .select('preco_crosshitbox')
          .limit(1)
          .maybeSingle();

        if (config && config.preco_crosshitbox) {
          precoAplicado = config.preco_crosshitbox;
        }
      } catch {}

      const passwordTemp = gerarPasswordTemporaria();
      const passwordHash = await bcrypt.hash(passwordTemp, 10);

      const novoRegisto = {
        nome,
        email,
        telefone: telefone || null,
        horario,
        preco_aplicado: precoAplicado,
        password_hash: passwordHash,
        ativo: true
      };

      // 1. Tenta gravar no Supabase
      let membroGuardado = null;
      let modo = 'supabase';

      try {
        const { data, error } = await supabase
          .from('membros_crosshitbox')
          .insert([novoRegisto])
          .select()
          .single();

        if (!error && data) {
          membroGuardado = data;
        }
      } catch {}

      // 2. Fallback automático local (ultrapassa erro de API Key / offline sem perder dados)
      if (!membroGuardado) {
        modo = 'local';
        const lista = lerMembrosLocais();
        membroGuardado = {
          id: crypto.randomUUID(),
          ...novoRegisto,
          created_at: new Date().toISOString()
        };
        lista.unshift(membroGuardado);
        guardarMembrosLocais(lista);
      }

      try {
        await enviarEmailBoasVindas({ nome, email, horario, preco: precoAplicado, passwordTemp });
      } catch (mailErr) {
        console.error('Aviso e-mail:', mailErr.message);
      }

      return res.status(201).json({
        success: true,
        modo,
        membro: membroGuardado,
        precoAplicado,
        passwordTemporaria: passwordTemp
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/membros', async (req, res) => {
    let membrosNuvem = [];
    try {
      const { data, error } = await supabase
        .from('membros_crosshitbox')
        .select('id, nome, email, telefone, horario, preco_aplicado, ativo, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        membrosNuvem = data;
      }
    } catch {}

    const membrosLocais = lerMembrosLocais().map(({ password_hash, ...resto }) => resto);
    const todos = [...membrosNuvem, ...membrosLocais];

    return res.json({ success: true, membros: todos });
  });

  router.delete('/membros/:id', async (req, res) => {
    const { id } = req.params;

    try {
      await supabase.from('membros_crosshitbox').delete().eq('id', id);
    } catch {}

    const lista = lerMembrosLocais();
    const filtrada = lista.filter((m) => String(m.id) !== String(id));
    guardarMembrosLocais(filtrada);

    return res.json({ success: true, message: 'Membro removido com sucesso.' });
  });

  return router;
};
