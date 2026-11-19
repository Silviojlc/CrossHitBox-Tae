const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

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

      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.json({ success: true, horarios: data || [] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/registar', async (req, res) => {
    try {
      const { nome, email, telefone, horario } = req.body;
      if (!nome || !email || !horario) {
        return res.status(400).json({ success: false, error: 'Nome, e-mail e turno são obrigatórios.' });
      }

      let precoAplicado = 3500;
      const { data: config } = await supabase
        .from('configuracoes_sistema')
        .select('preco_crosshitbox')
        .limit(1)
        .maybeSingle();

      if (config && config.preco_crosshitbox) {
        precoAplicado = config.preco_crosshitbox;
      }

      const passwordTemp = gerarPasswordTemporaria();
      const passwordHash = await bcrypt.hash(passwordTemp, 10);

      const { data, error } = await supabase
        .from('membros_crosshitbox')
        .insert([
          {
            nome,
            email,
            telefone: telefone || null,
            horario,
            preco_aplicado: precoAplicado,
            password_hash: passwordHash,
            ativo: true
          }
        ])
        .select()
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      try {
        await enviarEmailBoasVindas({ nome, email, horario, preco: precoAplicado, passwordTemp });
      } catch (mailErr) {
        console.error('Falha ao enviar e-mail:', mailErr.message);
      }

      return res.status(201).json({
        success: true,
        membro: data,
        precoAplicado,
        passwordTemporaria: passwordTemp
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/membros', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('membros_crosshitbox')
        .select('id, nome, email, telefone, horario, preco_aplicado, ativo, created_at')
        .order('created_at', { ascending: false });

      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.json({ success: true, membros: data || [] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/membros/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('membros_crosshitbox')
        .delete()
        .eq('id', id);

      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.json({ success: true, message: 'Membro removido com sucesso.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
