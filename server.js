require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Aviso: SUPABASE_URL ou SUPABASE_KEY em falta no ficheiro .env');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const crossHitBoxRoutes = require('./crosshitbox')(supabase);
app.use('/api/crosshitbox', crossHitBoxRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor CrossHitBox Tae ativo na porta ${PORT}`);
});
