const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// ✅ Corrigido: importação dinâmica do fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

// Supabase config
const supabaseUrl = 'https://gkpiaroqfrtuwtkdxgpo.supabase.co';
const supabaseKey = 'const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrcGlhcm9xZnJ0dXd0a2R4Z3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMzMTE5NCwiZXhwIjoyMDY3OTA3MTk0fQ.DixWKoKTwvPHpF8aksu3PpZZGPLNy8yhq7tEe2nOIRc';
'; // Substitua pela sua service_role
const supabase = createClient(supabaseUrl, supabaseKey);

// Rota GET de teste
app.get('/api/clients', (req, res) => {
  res.json({ message: 'GET /api/clients funcionando!' });
});

// Rota para salvar cliente
app.post('/api/clients', async (req, res) => {
  try {
    const { name, telefone, email, empresa } = req.body;

    const { data, error } = await supabase
      .from('clients')
      .insert([{ name, telefone, email, empresa }]);

    if (error) {
      return res.status(500).json({ status: 'Erro', erro: error.message });
    }

    res.json({ status: 'Cliente salvo com sucesso!', data });
  } catch (err) {
    res.status(500).json({ status: 'Erro interno', erro: err.message });
  }
});

// Rota para criar estabelecimento
app.post('/api/establishments', async (req, res) => {
  try {
    const { name, empresa, telefone, user_id } = req.body;

    const { data, error } = await supabase
      .from('establishments')
      .insert([{ name, empresa, telefone, user_id }]);

    if (error) {
      return res.status(500).json({ status: 'Erro', erro: error.message });
    }

    res.json({ status: 'Estabelecimento criado com sucesso!', data });
  } catch (err) {
    res.status(500).json({ status: 'Erro interno', erro: err.message });
  }
});

// Rota de signup
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno na rota /signup' });
  }
});

// Rota de signin
app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno na rota /signin' });
  }
});

// 🔥 Porta dinâmica para funcionar no Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MCP rodando na porta ${PORT}`);
});
