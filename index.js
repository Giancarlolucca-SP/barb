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