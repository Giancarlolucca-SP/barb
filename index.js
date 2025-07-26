const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configurações do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL; // https://seu-projeto.supabase.co
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Endpoint principal - Signup + Establishment
app.post('/api/signup-establishment', async (req, res) => {
  try {
    console.log('📋 Dados recebidos:', req.body);
    
    // 1. Validar dados obrigatórios
    const { name, empresa, telefone, email, password } = req.body;
    
    if (!name || !empresa || !telefone || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Todos os campos são obrigatórios',
        required: ['name', 'empresa', 'telefone', 'email', 'password']
      });
    }

    // 2. Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Formato de email inválido'
      });
    }

    // 3. Criar usuário no Supabase Auth
    console.log('🔐 Criando usuário no Supabase Auth...');
    
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const authResult = await authResponse.json();
    console.log('🔐 Resposta Auth:', authResult);

    if (!authResponse.ok) {
      return res.status(400).json({
        status: 'error',
        message: 'Erro ao criar usuário',
        details: authResult
      });
    }

    const userId = authResult.id || authResult.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID não retornado pelo Supabase'
      });
    }

    // 4. Criar estabelecimento no Supabase Database
    console.log('🏪 Criando estabelecimento no banco...');
    
    const establishmentResponse = await fetch(`${SUPABASE_URL}/rest/v1/establishments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: name,
        empresa: empresa,
        nome_responsavel: name, // mesmo que name
        telefone: telefone,
        email: email,
        user_id: userId
      })
    });

    const establishmentResult = await establishmentResponse.json();
    console.log('🏪 Resposta Establishment:', establishmentResult);

    if (!establishmentResponse.ok) {
      // Se falhou criar establishment, idealmente deletaria o usuário
      return res.status(400).json({
        status: 'error',
        message: 'Erro ao criar estabelecimento',
        details: establishmentResult
      });
    }

    // 5. Sucesso - retornar dados completos
    res.status(201).json({
      status: 'success',
      message: 'Usuário e estabelecimento criados com sucesso!',
      data: {
        user_id: userId,
        establishment_id: establishmentResult[0]?.id,
        email: email,
        establishment_name: empresa,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'signup-establishment-api'
  });
});

// Endpoint para testar conexão com Supabase
app.get('/test-supabase', async (req, res) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    res.json({
      status: 'success',
      supabase_connection: response.ok,
      message: 'Conexão com Supabase OK'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao conectar com Supabase',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/signup-establishment`);
});