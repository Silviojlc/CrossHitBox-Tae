const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_LOCAL_PATH = path.join(__dirname, 'membros_local.json');
const AULAS_LOCAL_PATH = path.join(__dirname, 'aulas_local.json');
const CONFIG_LOCAL_PATH = path.join(__dirname, 'config_local.json');

function lerJson(caminho, padrao) {
  try {
    if (!fs.existsSync(caminho)) return padrao;
    return JSON.parse(fs.readFileSync(caminho, 'utf8'));
  } catch {
    return padrao;
  }
}

function escreverJson(caminho, dados) {
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), 'utf8');
}

function lerPrecoLocal() {
  const cfg = lerJson(CONFIG_LOCAL_PATH, { preco_crosshitbox: 3500 });
  const valor = Number(cfg.preco_crosshitbox);
  return Number.isFinite(valor) && valor >= 0 ? valor : 3500;
}

function guardarPrecoLocal(preco) {
  escreverJson(CONFIG_LOCAL_PATH, { preco_crosshitbox: preco });
}

async function obterPrecoAtual(supabase) {
  let preco = lerPrecoLocal();
  if (!supabase) return preco;
  try {
    const { data, error } = await supabase
      .from('configuracoes_sistema')
      .select('preco_crosshitbox')
      .limit(1)
      .maybeSingle();

    if (!error && data && data.preco_crosshitbox !== null && data.preco_crosshitbox !== undefined) {
      const valorNuvem = Number(data.preco_crosshitbox);
      if (Number.isFinite(valorNuvem) && valorNuvem >= 0) {
        preco = valorNuvem;
        guardarPrecoLocal(preco);
      }
    }
  } catch {}
  return preco;
}

function lerMembrosLocais() {
  return lerJson(DB_LOCAL_PATH, []);
}

function guardarMembrosLocais(lista) {
  escreverJson(DB_LOCAL_PATH, lista);
}

function lerAulasEstado() {
  const padrao = {
    chamadas: {
      '05:00': {
        titulo: 'Aula Ao Vivo — Turno 05:00 (Madrugada)',
        sala: 'CrossHitBox-Tae-0500',
        urlExterna: '',
        ativa: true
      },
      '18:00': {
        titulo: 'Aula Ao Vivo — Turno 18:00 (Tarde)',
        sala: 'CrossHitBox-Tae-1800',
        urlExterna: '',
        ativa: true
      }
    },
    videos: [
      {
        id: 'vid-05-1',
        titulo: 'Aquecimento Dinâmico & Mobilidade — 05:00',
        turno: '05:00 - Madrugada',
        duracao: '18 min',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        id: 'vid-18-1',
        titulo: 'Condicionamento Metabólico Tae — 18:00',
        turno: '18:00 - Tarde',
        duracao: '35 min',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }
    ]
  };
  if (!fs.existsSync(AULAS_LOCAL_PATH)) {
    escreverJson(AULAS_LOCAL_PATH, padrao);
    return padrao;
  }
  return lerJson(AULAS_LOCAL_PATH, padrao);
}

function gerarPasswordTemporaria(tamanho = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

function normalizarEmbedUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  return trimmed;
}

function urlExternaValida(urlExterna) {
  if (!urlExterna) return '';
  const limpa = urlExterna.trim();
  if (!/^https?:\/\//i.test(limpa)) return '';
  if (limpa.includes('app.github.dev') || limpa.includes('localhost:3000')) return '';
  return limpa;
}

function verificarAdmin(req, res, next) {
  const senhaConfigurada = process.env.ADMIN_PASSWORD || 'kosmo2026';
  const senhaRecebida = req.headers['x-admin-password'] || (req.body && req.body.adminPassword);
  if (senhaRecebida !== senhaConfigurada) {
    return res.status(401).json({ success: false, error: 'Senha de administrador inválida.' });
  }
  next();
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
    from: `"CrossHitBox Tae" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Inscrição Confirmada — CrossHitBox Tae',
    text: `Olá ${nome},\n\nA sua inscrição no CrossHitBox Tae foi confirmada.\nTurno: ${horario}\nPreço aplicado: ${preco} ECV\nPassword temporária: ${passwordTemp}\n\nCrossHitBox Tae`
  });
}

module.exports = function (supabase) {
  const router = express.Router();

  router.post('/admin/login', (req, res) => {
    const senhaConfigurada = process.env.ADMIN_PASSWORD || 'kosmo2026';
    const { password } = req.body || {};
    if (password === senhaConfigurada) {
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, error: 'Password de administrador incorreta.' });
  });

  router.get('/preco', async (req, res) => {
    const preco = await obterPrecoAtual(supabase);
    return res.json({ success: true, preco });
  });

  router.post('/preco', verificarAdmin, async (req, res) => {
    const novoPreco = Number(req.body && req.body.preco);
    if (!Number.isFinite(novoPreco) || novoPreco < 0) {
      return res.status(400).json({ success: false, error: 'Introduza um valor válido (0 ou superior).' });
    }

    guardarPrecoLocal(novoPreco);

    if (supabase) {
      try {
        const { data: existente } = await supabase
          .from('configuracoes_sistema')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (existente && existente.id) {
          await supabase
            .from('configuracoes_sistema')
            .update({ preco_crosshitbox: novoPreco })
            .eq('id', existente.id);
        } else {
          await supabase
            .from('configuracoes_sistema')
            .insert([{ preco_crosshitbox: novoPreco }]);
        }
      } catch {}
    }

    return res.json({ success: true, preco: novoPreco });
  });

  router.get('/horarios', async (req, res) => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('horarios_crosshitbox')
          .select('*')
          .order('hora', { ascending: true });

        if (!error && data && data.length > 0) {
          return res.json({ success: true, horarios: data });
        }
      } catch {}
    }

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

      const precoAplicado = await obterPrecoAtual(supabase);
      const passwordTemp = gerarPasswordTemporaria();
      const passwordHash = await bcrypt.hash(passwordTemp, 10);

      const novoRegisto = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefone ? telefone.trim() : null,
        horario,
        preco_aplicado: precoAplicado,
        password_hash: passwordHash,
        ativo: true
      };

      let membroGuardado = null;
      let modo = 'local';

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('membros_crosshitbox')
            .insert([novoRegisto])
            .select()
            .single();

          if (!error && data) {
            membroGuardado = data;
            modo = 'supabase';
          }
        } catch {}
      }

      if (!membroGuardado) {
        const lista = lerMembrosLocais();
        const jaExiste = lista.find((m) => (m.email || '').toLowerCase() === novoRegisto.email);
        if (jaExiste) {
          return res.status(409).json({ success: false, error: 'Este e-mail já está inscrito no programa.' });
        }
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

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Informe e-mail e password.' });
      }

      const emailLimpo = email.trim().toLowerCase();
      const senhaLimpa = String(password).trim();
      let candidato = null;

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('membros_crosshitbox')
            .select('id, nome, email, telefone, horario, preco_aplicado, password_hash, ativo')
            .ilike('email', emailLimpo)
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            candidato = data;
          }
        } catch {}
      }

      if (!candidato) {
        const locais = lerMembrosLocais();
        candidato = locais.find((m) => (m.email || '').toLowerCase() === emailLimpo) || null;
      }

      if (!candidato || !candidato.password_hash) {
        return res.status(401).json({ success: false, error: 'Atleta não encontrado com este e-mail.' });
      }

      const ok = await bcrypt.compare(senhaLimpa, candidato.password_hash);
      if (!ok) {
        return res.status(401).json({ success: false, error: 'Password incorreta.' });
      }

      const { password_hash, ...membroSeguro } = candidato;
      const estadoAulas = lerAulasEstado();
      const turnoChave = (membroSeguro.horario || '').includes('18:00') ? '18:00' : '05:00';
      const chamadaBase = estadoAulas.chamadas[turnoChave] || estadoAulas.chamadas['05:00'];
      const chamadaTurno = {
        ...chamadaBase,
        urlExterna: urlExternaValida(chamadaBase.urlExterna)
      };

      return res.json({
        success: true,
        membro: membroSeguro,
        chamada: chamadaTurno,
        chamadas: estadoAulas.chamadas,
        videos: estadoAulas.videos
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/alterar-password', async (req, res) => {
    try {
      const { email, passwordAtual, novaPassword } = req.body || {};
      if (!email || !passwordAtual || !novaPassword || String(novaPassword).trim().length < 4) {
        return res.status(400).json({ success: false, error: 'Preencha todos os campos (mínimo 4 caracteres na nova password).' });
      }

      const emailLimpo = email.trim().toLowerCase();
      const novaHash = await bcrypt.hash(String(novaPassword).trim(), 10);
      let atualizado = false;

      if (supabase) {
        try {
          const { data } = await supabase
            .from('membros_crosshitbox')
            .select('id, password_hash')
            .ilike('email', emailLimpo)
            .limit(1)
            .maybeSingle();

          if (data && data.password_hash && await bcrypt.compare(String(passwordAtual).trim(), data.password_hash)) {
            await supabase
              .from('membros_crosshitbox')
              .update({ password_hash: novaHash })
              .eq('id', data.id);
            atualizado = true;
          }
        } catch {}
      }

      const locais = lerMembrosLocais();
      const idx = locais.findIndex((m) => (m.email || '').toLowerCase() === emailLimpo);
      if (idx !== -1) {
        const okLocal = await bcrypt.compare(String(passwordAtual).trim(), locais[idx].password_hash || '');
        if (!okLocal && !atualizado) {
          return res.status(401).json({ success: false, error: 'Password atual incorreta.' });
        }
        locais[idx].password_hash = novaHash;
        guardarMembrosLocais(locais);
        atualizado = true;
      }

      if (!atualizado) {
        return res.status(401).json({ success: false, error: 'Não foi possível validar as credenciais atuais.' });
      }

      return res.json({ success: true, message: 'Password atualizada com sucesso.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/aulas', (req, res) => {
    const estado = lerAulasEstado();
    return res.json({
      success: true,
      chamadas: estado.chamadas,
      videos: estado.videos
    });
  });

  router.post('/aulas/chamada', verificarAdmin, (req, res) => {
    const { turno, titulo, sala, urlExterna, ativa } = req.body;
    const chave = turno === '18:00' ? '18:00' : '05:00';
    const estado = lerAulasEstado();
    const atual = estado.chamadas[chave];
    estado.chamadas[chave] = {
      titulo: (titulo || atual.titulo).trim(),
      sala: (sala || atual.sala).trim().replace(/[^A-Za-z0-9_-]/g, '-'),
      urlExterna: urlExternaValida(urlExterna),
      ativa: ativa !== false
    };
    escreverJson(AULAS_LOCAL_PATH, estado);
    return res.json({ success: true, chamada: estado.chamadas[chave] });
  });

  router.post('/aulas/videos', verificarAdmin, (req, res) => {
    const { titulo, turno, duracao, videoUrl } = req.body;
    if (!titulo || !videoUrl) {
      return res.status(400).json({ success: false, error: 'Título e link do vídeo são obrigatórios.' });
    }
    const estado = lerAulasEstado();
    const novoVideo = {
      id: `vid-${crypto.randomUUID().slice(0, 8)}`,
      titulo: titulo.trim(),
      turno: turno || '05:00 - Madrugada',
      duracao: (duracao || '30 min').trim(),
      videoUrl: normalizarEmbedUrl(videoUrl)
    };
    estado.videos.unshift(novoVideo);
    escreverJson(AULAS_LOCAL_PATH, estado);
    return res.status(201).json({ success: true, video: novoVideo });
  });

  router.delete('/aulas/videos/:id', verificarAdmin, (req, res) => {
    const { id } = req.params;
    const estado = lerAulasEstado();
    estado.videos = estado.videos.filter((v) => v.id !== id);
    escreverJson(AULAS_LOCAL_PATH, estado);
    return res.json({ success: true });
  });

  router.get('/membros', verificarAdmin, async (req, res) => {
    let membrosNuvem = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('membros_crosshitbox')
          .select('id, nome, email, telefone, horario, preco_aplicado, ativo, created_at')
          .order('created_at', { ascending: false });

        if (!error && data) {
          membrosNuvem = data;
        }
      } catch {}
    }

    const membrosLocais = lerMembrosLocais().map(({ password_hash, ...resto }) => resto);
    const todos = [...membrosNuvem, ...membrosLocais];

    return res.json({ success: true, membros: todos });
  });

  router.delete('/membros/:id', verificarAdmin, async (req, res) => {
    const { id } = req.params;

    if (supabase) {
      try {
        await supabase.from('membros_crosshitbox').delete().eq('id', id);
      } catch {}
    }

    const lista = lerMembrosLocais();
    const filtrada = lista.filter((m) => String(m.id) !== String(id));
    guardarMembrosLocais(filtrada);

    return res.json({ success: true, message: 'Membro removido com sucesso.' });
  });


  const FICHAS_LOCAL_PATH = path.join(__dirname, "fichas_local.json");

  function lerFichasLocais() {
    return lerJson(FICHAS_LOCAL_PATH, {});
  }

  function guardarFichasLocais(mapa) {
    escreverJson(FICHAS_LOCAL_PATH, mapa);
  }

  router.get("/ficha/:email", async (req, res) => {
    const emailLimpo = String(req.params.email || "").trim().toLowerCase();
    if (!emailLimpo) {
      return res.status(400).json({ success: false, error: "E-mail inválido." });
    }

    let ficha = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("fichas_crosshitbox")
          .select("*")
          .eq("email", emailLimpo)
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          ficha = data;
        }
      } catch {}
    }

    if (!ficha) {
      const mapa = lerFichasLocais();
      ficha = mapa[emailLimpo] || null;
    }

    return res.json({ success: true, ficha });
  });

  router.post("/ficha", async (req, res) => {
    try {
      const body = req.body || {};
      const emailLimpo = String(body.email || "").trim().toLowerCase();
      if (!emailLimpo) {
        return res.status(400).json({ success: false, error: "E-mail do atleta é obrigatório." });
      }

      const fichaDados = {
        email: emailLimpo,
        nome: String(body.nome || "").trim(),
        horario: String(body.horario || "").trim(),
        nivel_experiencia: String(body.nivel_experiencia || "Iniciante").trim(),
        tempo_musculacao: String(body.tempo_musculacao || "").trim(),
        historico_treinos: String(body.historico_treinos || "").trim(),
        patologias_lesoes: String(body.patologias_lesoes || "").trim(),
        medicacao_restricoes: String(body.medicacao_restricoes || "").trim(),
        objetivo_principal: String(body.objetivo_principal || "").trim(),
        observacoes_treinador: String(body.observacoes_treinador || "").trim(),
        atualizado_em: new Date().toISOString()
      };

      const mapa = lerFichasLocais();
      mapa[emailLimpo] = fichaDados;
      guardarFichasLocais(mapa);

      if (supabase) {
        try {
          await supabase
            .from("fichas_crosshitbox")
            .upsert([fichaDados], { onConflict: "email" });
        } catch {}
      }

      return res.json({ success: true, ficha: fichaDados, message: "Ficha do atleta guardada com sucesso." });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
