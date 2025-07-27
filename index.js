const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configurações do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🌍 Configurações:');
console.log('📡 Supabase URL:', SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado');
console.log('🔑 Anon Key:', SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado');
console.log('🔒 Service Key:', SUPABASE_SERVICE_KEY ? '✅ Configurado' : '❌ Não configurado');

// =============================================
// ENDPOINTS
// =============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'supabase-api-secure',
    version: '3.0.0',
    supabase: {
      url_configured: !!SUPABASE_URL,
      anon_key_configured: !!SUPABASE_ANON_KEY,
      service_key_configured: !!SUPABASE_SERVICE_KEY
    }
  });
});

// Teste de conexão Supabase
app.get('/test-supabase', async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({
        status: 'error',
        message: 'Variáveis de ambiente Supabase não configuradas'
      });
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    res.json({
      status: 'success',
      supabase_connection: response.ok,
      status_code: response.status,
      message: response.ok ? 'Conexão com Supabase OK' : 'Erro na conexão'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao conectar com Supabase',
      details: error.message
    });
  }
});

// Endpoint principal - Signup + Establishment (SEGURO)
app.post('/api/signup-establishment', async (req, res) => {
  try {
    console.log('🚀 Iniciando cadastro completo...');
    console.log('📋 Dados recebidos:', req.body);
    
    // 1. Validar dados obrigatórios
    const { name, empresa, telefone, email, password } = req.body;
    
    if (!name || !empresa || !telefone || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Todos os campos são obrigatórios',
        required: ['name', 'empresa', 'telefone', 'email', 'password'],
        received: Object.keys(req.body)
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

    // 3. Validar telefone
    const cleanPhone = telefone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({
        status: 'error',
        message: 'Telefone deve ter 10 ou 11 dígitos'
      });
    }

    // 4. Validar senha
    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Senha deve ter pelo menos 6 caracteres'
      });
    }

    // 5. Verificar se usuário já existe
    console.log('👤 Verificando se usuário já existe...');
    const userCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/establishments?email=eq.${email.toLowerCase().trim()}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    const existingUsers = await userCheckResponse.json();
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Usuário já existe com este email'
      });
    }

    // 6. Criar usuário no Supabase Auth
    console.log('🔐 Criando usuário no Supabase Auth...');
    
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password: password
      })
    });

    const authResult = await authResponse.json();
    console.log('🔐 Resposta Auth:', authResult);

    if (!authResponse.ok) {
      return res.status(400).json({
        status: 'error',
        message: 'Erro ao criar usuário no sistema de autenticação',
        details: authResult.message || authResult.msg || 'Erro desconhecido'
      });
    }

    const userId = authResult.id || authResult.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID não foi retornado pelo sistema de autenticação',
        debug: authResult
      });
    }

    // 7. Criar estabelecimento no banco
    console.log('🏪 Criando estabelecimento no banco...');
    
    const establishmentData = {
      name: name.trim(),
      empresa: empresa.trim(),
      nome_responsavel: name.trim(),
      telefone: cleanPhone,
      email: email.toLowerCase().trim(),
      user_id: userId
    };

    console.log('📋 Dados do estabelecimento:', establishmentData);

    const establishmentResponse = await fetch(`${SUPABASE_URL}/rest/v1/establishments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(establishmentData)
    });

    const establishmentResult = await establishmentResponse.json();
    console.log('🏪 Resposta Establishment:', establishmentResult);

    if (!establishmentResponse.ok) {
      console.error('❌ Erro ao criar estabelecimento:', establishmentResult);
      
      return res.status(400).json({
        status: 'error',
        message: 'Erro ao criar estabelecimento',
        details: establishmentResult.message || establishmentResult.hint || 'Erro desconhecido',
        debug: establishmentResult
      });
    }

    // 8. Sucesso total!
    console.log('✅ Usuário e estabelecimento criados com sucesso!');
    
    const result = {
      status: 'success',
      message: 'Usuário e estabelecimento criados com sucesso!',
      data: {
        user_id: userId,
        establishment_id: establishmentResult[0]?.id,
        email: email.toLowerCase().trim(),
        establishment_name: empresa.trim(),
        responsible_name: name.trim(),
        phone: cleanPhone,
        created_at: new Date().toISOString()
      }
    };

    console.log('🎉 Resultado final:', result);
    res.status(201).json(result);

  } catch (error) {
    console.error('💥 Erro no cadastro:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para validar dados apenas
app.post('/api/validate-establishment', (req, res) => {
  const { name, empresa, telefone, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }

  if (!empresa || empresa.trim().length < 2) {
    errors.push('Nome da empresa deve ter pelo menos 2 caracteres');
  }

  if (!telefone) {
    errors.push('Telefone é obrigatório');
  } else {
    const cleanPhone = telefone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      errors.push('Telefone deve ter 10 ou 11 dígitos');
    }
  }

  if (!email) {
    errors.push('Email é obrigatório');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Formato de email inválido');
    }
  }

  if (!password) {
    errors.push('Senha é obrigatória');
  } else if (password.length < 6) {
    errors.push('Senha deve ter pelo menos 6 caracteres');
  }

  res.json({
    isValid: errors.length === 0,
    errors: errors,
    validatedData: errors.length === 0 ? {
      name: name?.trim(),
      empresa: empresa?.trim(),
      telefone: telefone?.replace(/\D/g, ''),
      email: email?.toLowerCase().trim()
    } : null
  });
});

// Endpoint para verificar se usuário existe
app.post('/api/check-user', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email é obrigatório'
      });
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/establishments?email=eq.${email.toLowerCase().trim()}`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    const establishments = await response.json();
    
    res.json({
      exists: establishments.length > 0,
      count: establishments.length
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao verificar usuário',
      details: error.message
    });
  }
});

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('💥 Erro global:', error);
  
  res.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 API Supabase segura iniciada!');
  console.log(`🌍 Porta: ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📍 Test Supabase: http://localhost:${PORT}/test-supabase`);
  console.log(`📍 Signup: http://localhost:${PORT}/api/signup-establishment`);
  console.log(`📍 Validate: http://localhost:${PORT}/api/validate-establishment`);
  console.log(`📍 Check User: http://localhost:${PORT}/api/check-user`);
  console.log('🔐 Com Supabase Auth integrado!');
  console.log('✨ API REST segura e funcional!');
});