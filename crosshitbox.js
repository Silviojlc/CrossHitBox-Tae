const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const DB_LOCAL_PATH = path.join(__dirname, "membros_local.json");
const AULAS_LOCAL_PATH = path.join(__dirname, "aulas_local.json");

function lerJson(caminho, padrao) {
  try {
    if (!fs.existsSync(caminho)) return padrao;
    return JSON.parse(fs.readFileSync(caminho, "utf8"));
  } catch {
    return padrao;
  }
}

function escreverJson(caminho, dados) {
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), "utf8");
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
      "05:00": {
        titulo: "Aula Ao Vivo — Turno 05:00 (Madrugada)",
        sala: "Kosmo-CrossHitBox-Tae-0500",
        urlExterna: "",
        ativa: true
      },
      "18:00": {
        titulo: "Aula Ao Vivo — Turno 18:00 (Tarde)",
        sala: "Kosmo-CrossHitBox-Tae-1800",
        urlExterna: "",
        ativa: true
      }
    },
    videos: [
      {
        id: "vid-05-1",
        titulo: "Aquecimento Dinâmico & Mobilidade — 05:00",
        turno: "05:00 - Madrugada",
        duracao: "18 min",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
      },
      {
        id: "vid-18-1",
        titulo: "Condicionamento Metabólico Tae — 18:00",
        turno: "18:00 - Tarde",
        duracao: "35 min",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
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
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let senha = "";
  for (let i = 0; i < tamanho; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

function normalizarEmbedUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  return trimmed;
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
    subject: "Inscrição Confirmada — CrossHitBox Tae",
    text: `Olá ${nome},\n\nA sua inscrição no CrossHitBox Tae foi confirmada.\nTurno: ${horario}\nPreço aplicado: ${preco} ECV\nPassword temporária: ${passwordTemp}\n\nGinásio Kosmo`
  });
}

module.exports = function (supabase) {
  const router = express.Router();

  router.get("/horarios", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("horarios_crosshitbox")
        .select("*")
        .order("hora", { ascending: true });

      if (!error && data && data.length > 0) {
        return res.json({ success: true, horarios: data });
      }
    } catch {}

    return res.json({
      success: true,
      horarios: [
        { id: 1, hora: "05:00", turno: "05:00 - Madrugada", vagas: 20 },
        { id: 2, hora: "18:00", turno: "18:00 - Tarde", vagas: 20 }
      ]
    });
  });

  router.post("/registar", async (req, res) => {
    try {
      const { nome, email, telefone, horario } = req.body;
      if (!nome || !email || !horario) {
        return res.status(400).json({ success: false, error: "Nome, e-mail e turno são obrigatórios." });
      }

      let precoAplicado = 3500;
      try {
        const { data: config } = await supabase
          .from("configuracoes_sistema")
          .select("preco_crosshitbox")
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
        email: email.trim().toLowerCase(),
        telefone: telefone || null,
        horario,
        preco_aplicado: precoAplicado,
        password_hash: passwordHash,
        ativo: true
      };

      let membroGuardado = null;
      let modo = "supabase";

      try {
        const { data, error } = await supabase
          .from("membros_crosshitbox")
          .insert([novoRegisto])
          .select()
          .single();

        if (!error && data) {
          membroGuardado = data;
        }
      } catch {}

      if (!membroGuardado) {
        modo = "local";
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
        console.error("Aviso e-mail:", mailErr.message);
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

  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Informe e-mail e password." });
      }

      const emailLimpo = email.trim().toLowerCase();
      const senhaLimpa = String(password).trim();
      let candidato = null;

      try {
        const { data, error } = await supabase
          .from("membros_crosshitbox")
          .select("id, nome, email, telefone, horario, preco_aplicado, password_hash, ativo")
          .ilike("email", emailLimpo)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          candidato = data;
        }
      } catch {}

      if (!candidato) {
        const locais = lerMembrosLocais();
        candidato = locais.find((m) => (m.email || "").toLowerCase() === emailLimpo) || null;
      }

      if (!candidato || !candidato.password_hash) {
        return res.status(401).json({ success: false, error: "Atleta não encontrado com este e-mail." });
      }

      const ok = await bcrypt.compare(senhaLimpa, candidato.password_hash);
      if (!ok) {
        return res.status(401).json({ success: false, error: "Password incorreta." });
      }

      const { password_hash, ...membroSeguro } = candidato;
      const estadoAulas = lerAulasEstado();
      const turnoChave = (membroSeguro.horario || "").includes("18:00") ? "18:00" : "05:00";
      const chamadaTurno = estadoAulas.chamadas[turnoChave] || estadoAulas.chamadas["05:00"];

      return res.json({
        success: true,
        membro: membroSeguro,
        chamada: chamadaTurno,
        videos: estadoAulas.videos
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get("/aulas", (req, res) => {
    const estado = lerAulasEstado();
    return res.json({
      success: true,
      chamadas: estado.chamadas,
      videos: estado.videos
    });
  });

  router.post("/aulas/chamada", (req, res) => {
    const { turno, titulo, sala, urlExterna, ativa } = req.body;
    const chave = turno === "18:00" ? "18:00" : "05:00";
    const estado = lerAulasEstado();
    estado.chamadas[chave] = {
      titulo: (titulo || estado.chamadas[chave].titulo).trim(),
      sala: (sala || estado.chamadas[chave].sala).trim().replace(/[^A-Za-z0-9_-]/g, "-"),
      urlExterna: (urlExterna || "").trim(),
      ativa: ativa !== false
    };
    escreverJson(AULAS_LOCAL_PATH, estado);
    return res.json({ success: true, chamada: estado.chamadas[chave] });
  });

  router.post("/aulas/videos", (req, res) => {
    const { titulo, turno, duracao, videoUrl } = req.body;
    if (!titulo || !videoUrl) {
      return res.status(400).json({ success: false, error: "Título e link do vídeo são obrigatórios." });
    }
    const estado = lerAulasEstado();
    const novoVideo = {
      id: `vid-${crypto.randomUUID().slice(0, 8)}`,
      titulo: titulo.trim(),
      turno: turno || "05:00 - Madrugada",
      duracao: (duracao || "30 min").trim(),
      videoUrl: normalizarEmbedUrl(videoUrl)
    };
    estado.videos.unshift(novoVideo);
    escreverJson(AULAS_LOCAL_PATH, estado);
    return res.status(201).json({ success: true, video: novoVideo });
  });

  router.delete("/aulas/videos/:id", (req, res) => {
    const { id } = req.params;
    const estado = lerAulasEstado();
    estado.videos = estado.videos.filter((v) => v.id !== id);
    escreverJson(AULAS_LOCAL_PATH, estado);
    return res.json({ success: true });
  });

  router.get("/membros", async (req, res) => {
    let membrosNuvem = [];
    try {
      const { data, error } = await supabase
        .from("membros_crosshitbox")
        .select("id, nome, email, telefone, horario, preco_aplicado, ativo, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        membrosNuvem = data;
      }
    } catch {}

    const membrosLocais = lerMembrosLocais().map(({ password_hash, ...resto }) => resto);
    const todos = [...membrosNuvem, ...membrosLocais];

    return res.json({ success: true, membros: todos });
  });

  router.delete("/membros/:id", async (req, res) => {
    const { id } = req.params;

    try {
      await supabase.from("membros_crosshitbox").delete().eq("id", id);
    } catch {}

    const lista = lerMembrosLocais();
    const filtrada = lista.filter((m) => String(m.id) !== String(id));
    guardarMembrosLocais(filtrada);

    return res.json({ success: true, message: "Membro removido com sucesso." });
  });

  return router;
};
