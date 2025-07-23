const express = require('express');
const app = express();

// Básico
app.use(express.json());

// Simples CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  next();
});

// Log simples
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Rotas
app.get('/', (req, res) => {
  console.log('GET / accessed');
  res.send('Hello World - Server is working!');
});

app.post('/api/signup', (req, res) => {
  console.log('POST /api/signup accessed');
  console.log('Body:', req.body);
  res.json({ message: 'Signup working!', data: req.body });
});

// Start - IMPORTANTE: bind em 0.0.0.0 para Railway
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on ${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Railway URL should work now!`);
});

// Force update for Railway deployment