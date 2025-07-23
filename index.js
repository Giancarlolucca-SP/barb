const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 Iniciando servidor...');

// ✅ Rota de teste simples
app.get('/', (req, res) => {
  console.log('✅ Rota / foi acessada!');
  res.json({ 
    message: 'MCP Server is alive!', 
    timestamp: new Date().toISOString(),
    status: 'running',
    port: process.env.PORT || 3000
  });
});

// Rota de teste adicional
app.get('/health', (req, res) => {
  console.log('✅ Health check acessado');
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Rota de signup simples para teste
app.post('/api/signup', async (req, res) => {
  try {
    console.log('🔐 Signup acessado com dados:', req.body);
    const { email, password } = req.body;
    
    // Resposta de teste sem Supabase por enquanto
    res.json({ 
      message: 'Teste de signup funcionando!',
      received: { email, password: '***' }
    });
    
  } catch (err) {
    console.log('❌ Erro no signup:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Error handlers
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ Rota não encontrada:', req.path);
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Porta dinâmica para Railway
const PORT = process.env.PORT || 3000;

console.log('🔧 Tentando iniciar na porta:', PORT);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor RODANDO com sucesso na porta ${PORT}`);
  console.log(`🌍 URL: http://0.0.0.0:${PORT}`);
  console.log(`📅 Iniciado em: ${new Date().toISOString()}`);
});

server.on('error', (err) => {
  console.error('❌ Erro ao iniciar servidor:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});