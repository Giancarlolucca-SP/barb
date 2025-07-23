const express = require('express');
const app = express();

// NOVA VERSÃO 3.0 - Force update
console.log('🚀 NEW VERSION 3.0: Initializing Express server...');
console.log('🔥 COMPLETE REWRITE: This should fix the 502 error!');
console.log('⚡ Detailed logging enabled');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple CORS - essential for web apps
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

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health check route
app.get('/', (req, res) => {
  console.log('Root route accessed successfully!');
  res.status(200).json({
    status: 'success',
    message: 'MCP Server v3.0 is running perfectly!',
    timestamp: new Date().toISOString(),
    port: process.env.PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.post('/api/signup', (req, res) => {
  console.log('Signup endpoint accessed successfully!');
  console.log('Request body:', req.body);
  
  const { email, password } = req.body;
  
  res.status(200).json({
    status: 'success',
    message: 'Signup endpoint working perfectly!',
    data: { email, timestamp: new Date().toISOString() }
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Server configuration - CRITICAL FOR RAILWAY
const PORT = parseInt(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

console.log(`Attempting to start server on ${HOST}:${PORT}`);
console.log(`Environment variables:`, {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT
});

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ SUCCESS v3.0: Server is running on ${HOST}:${PORT}`);
  console.log(`🌍 External URL: https://barb-production.up.railway.app`);
  console.log(`📊 Process ID: ${process.pid}`);
  console.log(`🕐 Started at: ${new Date().toISOString()}`);
  console.log(`🔧 Server listening on all interfaces: ${HOST}`);
});

server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('🎯 Server v3.0 setup complete, ready for connections...');