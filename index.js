const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// VERSÃO 4.0 - Com Supabase funcionando
console.log('🚀 NEW VERSION 4.0: Server with Supabase integration');
console.log('💾 Ready to save data to database!');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Supabase configuration
const supabaseUrl = 'https://gkpiaroqfrtuwtkdxgpo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrcGlhcm9xZnJ0dXd0a2R4Z3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzExOTQsImV4cCI6MjA2NzkwNzE5NH0.DixWKoKTwvPHpF8aksu3PpZZGPLNy8yhq7tEe2nOIRc';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('📡 Supabase connected:', supabaseUrl);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📝 Request body:', req.body);
  }
  next();
});

// Health check route
app.get('/', (req, res) => {
  console.log('✅ Health check accessed');
  res.status(200).json({
    status: 'success',
    message: 'MCP Server v4.0 with Supabase is running!',
    timestamp: new Date().toISOString(),
    supabase: 'connected',
    port: process.env.PORT
  });
});

// Debug route - mostra configurações
app.get('/debug', (req, res) => {
  res.json({
    url: supabaseUrl,
    key_start: supabaseKey.substring(0, 50),
    key_end: supabaseKey.substring(supabaseKey.length - 20),
    key_length: supabaseKey.length,
    has_anon: supabaseKey.includes('anon'),
    has_service: supabaseKey.includes('service_role')
  });
});

// Signup route - SAVES TO SUPABASE
app.post('/api/signup', async (req, res) => {
  try {
    console.log('🔐 Processing signup request...');
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    console.log(`📧 Creating user for email: ${email}`);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (authError) {
      console.log('❌ Supabase auth error:', authError.message);
      return res.status(400).json({
        status: 'error',
        message: authError.message,
        type: 'auth_error'
      });
    }

    console.log('✅ User created successfully in Supabase Auth');
    console.log('👤 User ID:', authData.user?.id);

    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'User created successfully!',
      data: {
        user_id: authData.user?.id,
        email: authData.user?.email,
        created_at: authData.user?.created_at,
        confirmation_sent_at: authData.user?.confirmation_sent_at
      },
      session: authData.session ? 'created' : 'pending_confirmation'
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      details: error.message
    });
  }
});

// Create establishment route
app.post('/api/establishments', async (req, res) => {
  try {
    console.log('🏪 Processing establishment creation...');
    const { name, empresa, nome_responsavel, telefone, email, user_id } = req.body;

    // Validate input
    if (!name || !empresa || !nome_responsavel || !telefone || !email || !user_id) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required: name, empresa, nome_responsavel, telefone, email, user_id'
      });
    }

    console.log(`🏢 Creating establishment: ${name} for user: ${user_id}`);

    // Insert establishment into Supabase
    const { data, error } = await supabase
      .from('establishments')
      .insert([{
        name: name,
        empresa: empresa,
        nome_responsavel: nome_responsavel,
        telefone: telefone,
        email: email,
        user_id: user_id,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.log('❌ Supabase error creating establishment:', error.message);
      return res.status(400).json({
        status: 'error',
        message: error.message,
        type: 'database_error'
      });
    }

    console.log('✅ Establishment created successfully');
    console.log('🏪 Establishment data:', data[0]);

    res.status(200).json({
      status: 'success',
      message: 'Establishment created successfully!',
      data: data[0]
    });

  } catch (error) {
    console.error('❌ Unexpected error creating establishment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      details: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Start server
const PORT = parseInt(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`✅ SUCCESS v4.0: Server with Supabase running on port ${PORT}`);
  console.log(`🌍 URL: https://mcp-server-ufzq.onrender.com`);
  console.log(`💾 Database: Supabase connected and ready`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});

server.on('error', (err) => {
  console.error('❌ Server failed:', err);
  process.exit(1);
});
console.log('🎯 Server v4.0 setup complete - ready to save users to Supabase!');

// ADICIONAR ao seu index.js existente no Render

// =============================================
// EVOLUTION API INTEGRATION
// =============================================

// Configurações Evolution (variáveis de ambiente)
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'barbershop';
const EVOLUTION_TOKEN = process.env.EVOLUTION_TOKEN || 'your-evolution-token';

// =============================================
// FUNÇÕES EVOLUTION API
// =============================================

// Função para enviar mensagem WhatsApp
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    console.log('📱 Enviando WhatsApp para:', phoneNumber);
    
    // Limpar número (remover +, espaços, etc)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    
    const whatsappPayload = {
      number: formattedPhone,
      text: message
    };
    
    console.log('📤 Payload WhatsApp:', whatsappPayload);
    
    // Se não tiver Evolution configurado, apenas loga
    if (!EVOLUTION_INSTANCE || EVOLUTION_INSTANCE === 'your-evolution-token') {
      console.log('⚠️ Evolution não configurado - simulando envio');
      console.log('📱 Mensagem que seria enviada:', message);
      return { success: true, simulated: true };
    }
    
    // Envio real via Evolution API (local)
    const response = await fetch(`http://localhost:8080/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_TOKEN
      },
      body: JSON.stringify(whatsappPayload)
    });
    
    const result = await response.json();
    console.log('✅ WhatsApp enviado:', result);
    
    return { success: response.ok, data: result };
    
  } catch (error) {
    console.error('💥 Erro no WhatsApp:', error.message);
    return { success: false, error: error.message };
  }
}

// =============================================
// ENDPOINT PARA BOAS-VINDAS WHATSAPP
// =============================================

// Endpoint que o N8N vai chamar
app.post('/api/send-welcome-whatsapp', async (req, res) => {
  try {
    console.log('🎉 Enviando boas-vindas WhatsApp...');
    console.log('📋 Dados recebidos:', req.body);
    
    const { telefone, nome_responsavel, empresa } = req.body;
    
    if (!telefone || !nome_responsavel || !empresa) {
      return res.status(400).json({
        status: 'error',
        message: 'Telefone, nome e empresa são obrigatórios'
      });
    }
    
    // Mensagem de boas-vindas
    const mensagem = `🎉 Olá ${nome_responsavel}!

Bem-vindo ao sistema da ${empresa}!

Seu cadastro foi realizado com sucesso! 

🚀 Agora você pode:
• Gerenciar agendamentos
• Acompanhar relatórios
• Receber notificações automáticas
• Controlar sua barbearia

Qualquer dúvida, estamos aqui! 💪

Atenciosamente,
Equipe Sistema Barbearia`;

    // Enviar WhatsApp
    const whatsappResult = await sendWhatsAppMessage(telefone, mensagem);
    
    // Resposta
    res.json({
      status: 'success',
      message: 'Boas-vindas enviadas',
      whatsapp: whatsappResult,
      dados: {
        telefone,
        nome_responsavel,
        empresa,
        mensagem_enviada: mensagem
      }
    });
    
  } catch (error) {
    console.error('💥 Erro nas boas-vindas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao enviar boas-vindas',
      details: error.message
    });
  }
});

// =============================================
// MODIFICAR O ENDPOINT SIGNUP EXISTENTE
// =============================================

// No final do endpoint /api/signup-establishment (após sucesso):

    // 8. Sucesso total! + Notificação N8N
    console.log('✅ Usuário e estabelecimento criados com sucesso!');

    // Preparar dados para N8N (boas-vindas)
    const welcomeData = {
      user_id: userId,
      establishment_id: establishmentResult[0]?.id,
      nome_responsavel: name.trim(),
      empresa: empresa.trim(),
      telefone: cleanPhone,
      email: emailToTest,
      created_at: new Date().toISOString()
    };

    // Enviar para N8N (boas-vindas) - não bloqueia se der erro
    try {
      if (N8N_WEBHOOK_URL) {
        console.log('📡 Enviando para N8N (boas-vindas)...');
        
        const n8nResponse = await fetch(N8N_WEBHOOK_URL.replace('sales-webhook', 'cadastro-boas-vindas'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event_type: 'welcome_signup',
            ...welcomeData
          })
        });

        if (n8nResponse.ok) {
          console.log('✅ Boas-vindas enviadas para N8N!');
        } else {
          console.error('❌ Erro ao enviar para N8N:', await n8nResponse.text());
        }
      }
    } catch (error) {
      console.error('💥 Erro N8N boas-vindas (não crítico):', error.message);
    }

// =============================================
// ENDPOINTS EVOLUTION API MANAGEMENT
// =============================================

// Status da instância WhatsApp
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    status: 'ok',
    evolution_configured: !!EVOLUTION_INSTANCE && EVOLUTION_INSTANCE !== 'your-evolution-token',
    instance: EVOLUTION_INSTANCE,
    message: EVOLUTION_INSTANCE === 'your-evolution-token' ? 
      'Evolution não configurado - mensagens simuladas' : 
      'Evolution configurado'
  });
});

// Teste de envio WhatsApp
app.post('/api/whatsapp/test', async (req, res) => {
  try {
    const { telefone, mensagem } = req.body;
    
    if (!telefone || !mensagem) {
      return res.status(400).json({
        status: 'error',
        message: 'Telefone e mensagem são obrigatórios'
      });
    }
    
    const result = await sendWhatsAppMessage(telefone, mensagem);
    
    res.json({
      status: 'success',
      result: result
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
app.post('/api/servicos', async (req, res) => {
  try {
    const { nome_servicos, duracao, comissao, ativo, preco_servico } = req.body;
    
    // Validações
    if (!nome_servicos) {
      return res.status(400).json({ error: 'Nome do serviço é obrigatório' });
    }
    
    // Inserir no Supabase
    const { data, error } = await supabase
      .from('servicos')
      .insert({
        nome_servicos,
        duracao: parseInt(duracao),
        comissao: parseFloat(comissao),
        ativo: ativo === 'yes' || ativo === true,
        preco_servico: parseFloat(preco_servico)
      })
      .select();
    
    if (error) {
      return res.status(500).json({ error: 'Erro ao salvar serviço' });
    }
    
    res.json({ success: true, data: data[0] });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/servicos
router.post('/servicos', async (req, res) => {
  try {
    const { nome_servicos, duracao, comissao, ativo, preco_servico } = req.body;
    
    // Validações
    if (!nome_servicos) {
      return res.status(400).json({ 
        error: 'Nome do serviço é obrigatório',
        status: 400
      });
    }

    // Inserir no banco
    const novoServico = await prisma.servicos.create({
      data: {
        nome_servicos: nome_servicos.trim(),
        duracao: parseInt(duracao) || 0,
        comissao: parseFloat(comissao) || 0,
        ativo: ativo === 'yes' || ativo === true || ativo === 'true',
        preco_servico: parseFloat(preco_servico) || 0,
      }
    });

    res.status(201).json({ 
      success: true, 
      data: novoServico,
      message: 'Serviço criado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      status: 500,
      message: error.message
    });
  }
});

// GET /api/servicos - listar serviços
router.get('/servicos', async (req, res) => {
  try {
    const servicos = await prisma.servicos.findMany({
      where: { ativo: true },
      orderBy: { created_at: 'desc' }
    });

    res.json({ 
      success: true, 
      data: servicos 
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao buscar serviços',
      status: 500 
    });
  }
});

export default router;

import servicosRouter from './servicos.router.js';

// ... suas outras rotas

// Adicionar esta linha
router.use('/api', servicosRouter); 

console.log('📱 Evolution API integrada!');
console.log(`📍 WhatsApp Status: http://localhost:${PORT}/api/whatsapp/status`);
console.log(`📍 WhatsApp Test: http://localhost:${PORT}/api/whatsapp/test`);
console.log(`📍 Welcome WhatsApp: http://localhost:${PORT}/api/send-welcome-whatsapp`);

console.log('🚀 API Supabase FORÇADA iniciada!');
console.log('🔥 CODIGO NOVO FUNCIONANDO - VERSION 2.0!');
