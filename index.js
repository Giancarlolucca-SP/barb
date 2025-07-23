const express = require('express');
const app = express();

// Log de inicialização
console.log('🚀 Starting server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port from env:', process.env.PORT);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS manual
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Rota raiz
app.get('/', (req, res) => {
  console.log('Root route accessed');
  res.json({ 
    status: 'OK',
    message: 'MCP Server is running',
    timestamp: new Date().toISOString(),
    port: process.env.PORT,
    method: 'GET',
    path: '/'
  });
});

// Health check
app.get('/health', (req, res) => {
  console.log('Health check accessed');
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Rota de signup
app.post('/api/signup', (req, res) => {
  console.log('=== SIGNUP REQUEST ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Query:', req.query);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }
    
    console.log('Signup successful for:', email);
    res.json({
      status: 'success',
      message: 'Signup endpoint working perfectly!',
      data: {
        email: email,
        receivedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Catch all 404
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.path);
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log('✅ Server successfully started!');
  console.log(`🌍 Server running on http://${HOST}:${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('🎯 Server setup complete, waiting for requests...');