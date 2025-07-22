const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Substitua abaixo pelas suas chaves reais
const supabaseUrl = 'https://gkpiaroqfrtuwtkdxgpo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // service_role

const supabase = createClient(supabaseUrl, supabaseKey);

// Rota GET simples para teste
app.get('/api/clients', async (req, res) => {
  res.json({ message: 'GET /api/clients funcionando!' });
});

// Rota POST para salvar cliente
app.post('/api/clients', async (req, res) => {
  try {
    const { name, telefone, email, empresa } = req.body;

    const { data, error } = await supabase
      .from('clients')
      .insert([{ name, telefone, email, empresa }]);

    if (error) {
      console.error('Erro ao salvar cliente:', error.message);
      return res.status(500).json({ status: 'Erro', erro: error.message });
    }

    res.json({ status: 'Cliente salvo com sucesso!', data });
  } catch (err) {
    console.error('Erro interno:', err.message);
    res.status(500).json({ status: 'Erro interno', erro: err.message });
  }
});

// Rota POST para criar estabelecimento
app.post('/api/establishments', async (req, res) => {
  try {
    const { name, empresa, telefone, user_id } = req.body;

    const { data, error } = await supabase
      .from('establishments')
      .insert([{ name, empresa, telefone, user_id }]);

    if (error) {
      console.error('Erro ao criar estabelecimento:', error.message);
      return res.status(500).json({ status: 'Erro', erro: error.message });
    }

    res.json({ status: 'Estabelecimento criado com sucesso!', data });
  } catch (err) {
    console.error('Erro interno:', err.message);
    res.status(500).json({ status: 'Erro interno', erro: err.message });
  }
});

// Rota POST para cadastro (signup)
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
    console.error('Erro na rota /api/signup:', error);
    res.status(500).json({ error: 'Erro interno no servidor MCP.' });
  }
});

// Rota POST para login (signin)
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
    console.error('Erro na rota /api/signin:', error);
    res.status(500).json({ error: 'Erro interno no servidor MCP.' });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MCP rodando na porta ${PORT}`);
});


