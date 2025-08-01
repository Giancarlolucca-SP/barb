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

// Configurações N8N
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN;

console.log('🌍 Configurações:');
console.log('📡 Supabase URL:', SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado');
console.log('🔑 Anon Key:', SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado');
console.log('🔒 Service Key:', SUPABASE_SERVICE_KEY ? '✅ Configurado' : '❌ Não configurado');
console.log('🤖 N8N Webhook:', N8N_WEBHOOK_URL ? '✅ Configurado' : '❌ Não configurado');

// =============================================
// FUNÇÕES AUXILIARES N8N
// =============================================

async function sendToN8N(eventType, userData, additionalData = {}) {
  try {
    if (!N8N_WEBHOOK_URL) {
      console.log('⚠️ N8N_WEBHOOK_URL não configurado');
      return false;
    }

    const payload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      user_data: userData,
      ...additionalData
    };

    console.log(`📡 Enviando evento ${eventType} para N8N...`);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': N8N_AUTH_TOKEN ? `Bearer ${N8N_AUTH_TOKEN}` : undefined
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`✅ Evento ${eventType} enviado para N8N com sucesso!`);
      return true;
    } else {
      console.error(`❌ Erro ao enviar ${eventType} para N8N:`, await response.text());
      return false;
    }
  } catch (error) {
    console.error(`💥 Erro no envio ${eventType} para N8N:`, error.message);
    return false;
  }
}

// =============================================
// ENDPOINTS
// =============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'supabase-api-secure',
    version: '3.1.0',
    supabase: {
      url_configured: !!SUPABASE_URL,
      anon_key_configured: !!SUPABASE_ANON_KEY,
      service_key_configured: !!SUPABASE_SERVICE_KEY
    },
    n8n: {
      webhook_configured: !!N8N_WEBHOOK_URL,
      auth_configured: !!N8N_AUTH_TOKEN
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

    // 2. Validar formato do email (REGEX MAIS PERMISSIVO)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const emailToTest = email.toLowerCase().trim();
    
    console.log('🔍 Validando email:', emailToTest);
    console.log('🔍 Regex test result:', emailRegex.test(emailToTest));
    
    if (!emailRegex.test(emailToTest)) {
      console.log('❌ Email rejeitado pelo regex:', emailToTest);
      return res.status(400).json({
        status: 'error',
        message: 'Formato de email inválido',
        email_tested: emailToTest
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
    console.log('🔍 Email para consulta:', emailToTest);
    
    const userCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/establishments?email=eq.${emailToTest}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    console.log('✅ Resposta da consulta recebida');
    const existingUsers = await userCheckResponse.json();
    console.log('📊 Usuários encontrados:', existingUsers.length);
    
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
        email: emailToTest,
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
      email: emailToTest,
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

    // 8. Sucesso total! + Integração N8N
    console.log('✅ Usuário e estabelecimento criados com sucesso!');

    // Preparar dados para N8N
    const userData = {
      user_id: userId,
      establishment_id: establishmentResult[0]?.id,
      name: name.trim(),
      empresa: empresa.trim(),
      telefone: cleanPhone,
      email: emailToTest,
      created_at: new Date().toISOString(),
      lead_source: 'website_signup',
      lead_score: 10
    };

    // Enviar para N8N (não bloqueia se der erro)
    try {
      const n8nSent = await sendToN8N('user_signup', userData, {
        actions: ['send_welcome', 'start_sales_flow', 'create_lead'],
        sales_priority: 'high',
        follow_up_schedule: {
          welcome: 'immediate',
          follow_up_1: '2_hours',
          follow_up_2: '24_hours',
          follow_up_3: '7_days'
        }
      });
      console.log('📡 N8N enviado:', n8nSent);
    } catch (error) {
      console.error('💥 Erro N8N (não crítico):', error.message);
    }

    // 9. Retornar sucesso
    const result = {
      status: 'success',
      message: 'Usuário e estabelecimento criados com sucesso!',
      data: {
        user_id: userId,
        establishment_id: establishmentResult[0]?.id,
        email: emailToTest,
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
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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

// Endpoint para receber respostas do WhatsApp
app.post('/api/whatsapp-interaction', async (req, res) => {
  try {
    console.log('📱 Interação WhatsApp recebida:', req.body);
    
    const { user_id, phone, message, interaction_type, lead_score_update } = req.body;
    
    // Atualizar score no Supabase
    if (user_id && lead_score_update) {
      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/establishments?user_id=eq.${user_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({
          lead_score: lead_score_update,
          last_interaction: new Date().toISOString()
        })
      });
      
      console.log('📊 Score atualizado:', lead_score_update);
    }
    
    res.json({ status: 'success', message: 'Interação registrada' });
    
  } catch (error) {
    console.error('💥 Erro na interação WhatsApp:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint para triggers manuais N8N
app.post('/api/trigger-sales-action', async (req, res) => {
  try {
    const { user_id, action_type, custom_message } = req.body;
    
    // Buscar dados do usuário
    const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/establishments?user_id=eq.${user_id}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    const userData = await userResponse.json();
    
    if (userData.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Usuário não encontrado' });
    }
    
    // Enviar para N8N
    const sent = await sendToN8N('sales_trigger', userData[0], {
      action_type,
      custom_message,
      triggered_by: 'manual'
    });
    
    res.json({ 
      status: 'success', 
      n8n_sent: sent,
      message: `Ação ${action_type} disparada`
    });
    
  } catch (error) {
    console.error('💥 Erro no trigger manual:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Endpoint para estatísticas de vendas
app.get('/api/sales-stats', async (req, res) => {
  try {
    // Buscar estatísticas do Supabase
    const statsResponse = await fetch(`${SUPABASE_URL}/rest/v1/establishments?select=lead_score,last_interaction,created_at`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    const establishments = await statsResponse.json();
    
    const stats = {
      total_leads: establishments.length,
      high_score_leads: establishments.filter(e => (e.lead_score || 0) >= 50).length,
      recent_interactions: establishments.filter(e => {
        if (!e.last_interaction) return false;
        const lastInteraction = new Date(e.last_interaction);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return lastInteraction > oneDayAgo;
      }).length,
      avg_lead_score: establishments.length > 0 ? 
        establishments.reduce((sum, e) => sum + (e.lead_score || 0), 0) / establishments.length : 0
    };
    
    res.json({ status: 'success', stats });
    
  } catch (error) {
    console.error('💥 Erro nas estatísticas:', error);
    res.status(500).json({ status: 'error', message: error.message });
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
  console.log(`📍 WhatsApp: http://localhost:${PORT}/api/whatsapp-interaction`);
  console.log(`📍 Sales Stats: http://localhost:${PORT}/api/sales-stats`);
  console.log('🔐 Com Supabase Auth integrado!');
  console.log('🤖 Sistema de Vendas IA integrado!');
  console.log('📱 WhatsApp automation configurado!');
  console.log('✨ API REST segura e funcional!');
});