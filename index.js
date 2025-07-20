// index.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Substitua abaixo pelas suas chaves reais
const supabaseUrl = 'https://gkpiaroqfrtuwtkdxgpo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrcGlhcm9xZnJ0dXd0a2R4Z3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMzMTE5NCwiZXhwIjoyMDY3OTA3MTk0fQ.1cjFGSNMDzRY6v0vpn2xkY9DlPPPlHuzzTgY4fF0OZo';

const supabase = createClient(supabaseUrl, supabaseKey);

// Rota GET (teste)
app.get('/api/clients', async (req, res) => {
  res.json({ message: 'GET /api/clients funcionando!' });
});

// Rota POST (salvar cliente)
app.post('/api/clients', async (req, res) => {
  try {
    const { name, telefone, email, empresa } = req.body;

    const { data, error } = await supabase
      .from('clients')
      .insert([{ name, telefone, email, empresa }]);

    if (error) {
      console.error('Erro ao salvar:', error.message);
      return res.status(500).json({ status: 'Erro ao salvar cliente', erro: error.message });
    }

    res.json({ status: 'Cliente salvo com sucesso no Supabase!', data_salva: data });
  } catch (err) {
    console.error('Erro inesperado:', err.message);
    res.status(500).json({ status: 'Erro interno', erro: err.message });
  }
});

// Inicia o servidor acessível externamente
app.listen(3000, '0.0.0.0', () => {
  console.log('🚀 MCP rodando em http://192.168.15.16:3000');
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
      return res.status(500).json({ status: 'Erro ao criar estabelecimento', erro: error.message });
    }

    res.json({ status: 'Estabelecimento criado com sucesso!', data_criada: data });
  } catch (err) {
    console.error('Erro inesperado:', err.message);
    res.status(500).json({ status: 'Erro interno', erro: err.message });
  }
});

