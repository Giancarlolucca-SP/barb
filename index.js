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

console.log('🚀 API Supabase FORÇADA iniciada!');
