import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🌍 Configurações:');
console.log('📡 Supabase URL:', SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado');
console.log('🔑 Anon Key:', SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado');
console.log('🔒 Service Key:', SUPABASE_SERVICE_KEY ? '✅ Configurado' : '❌ Não configurado');

// Classe para gerenciar comunicação com MCP
class MCPClient {
  constructor() {
    this.requestId = 1;
  }

  async callTool(toolName, args) {
    return new Promise((resolve, reject) => {
      console.log(`🔧 Chamando ferramenta MCP: ${toolName}`);
      console.log(`📋 Args:`, args);

      // Spawnar processo MCP
      const mcpProcess = spawn('node', [join(__dirname, 'mcp-server.js')], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env,
          SUPABASE_URL,
          SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_KEY
        }
      });

      let output = '';
      let errorOutput = '';

      // Capturar stdout
      mcpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Capturar stderr
      mcpProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log('📺 MCP stderr:', data.toString());
      });

      // Quando processo terminar
      mcpProcess.on('close', (code) => {
        console.log(`🏁 MCP processo terminou com código: ${code}`);
        
        if (code !== 0) {
          console.error('❌ MCP Error output:', errorOutput);
          reject(new Error(`MCP process failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          // Parse das linhas de resposta
          const lines = output.split('\n').filter(line => line.trim());
          
          // Encontrar a linha de resposta JSON
          let responseFound = false;
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.id && parsed.result) {
                console.log('✅ Resposta MCP recebida');
                resolve(parsed.result);
                responseFound = true;
                break;
              }
            } catch (e) {
              // Linha não é JSON válido, continuar
              continue;
            }
          }
          
          if (!responseFound) {
            console.error('❌ Resposta MCP não encontrada no output:', output);
            reject(new Error('Resposta válida não encontrada'));
          }
          
        } catch (error) {
          console.error('❌ Erro ao parsear resposta MCP:', error);
          reject(new Error(`Erro ao parsear resposta: ${error.message}`));
        }
      });

      // Preparar requests MCP
      const initRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'supabase-api-gateway',
            version: '1.0.0'
          }
        }
      };

      const toolRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      // Enviar requests
      mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');
      mcpProcess.stdin.write(JSON.stringify(toolRequest) + '\n');
      mcpProcess.stdin.end();

      // Timeout de segurança
      setTimeout(() => {
        if (!mcpProcess.killed) {
          mcpProcess.kill();
          reject(new Error('MCP timeout - processo demorou mais que 30s'));
        }
      }, 30000);
    });
  }
}

const mcpClient = new MCPClient();

// =============================================
// ENDPOINTS DA API
// =============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'mcp-api-gateway',
    version: '1.0.0',
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

// Endpoint principal - Signup + Establishment via MCP
app.post('/api/signup-establishment', async (req, res) => {
  try {
    console.log('🚀 Recebida requisição signup-establishment');
    console.log('📋 Body:', req.body);

    // Validar se tem todos os campos obrigatórios
    const { name, empresa, telefone, email, password } = req.body;
    
    if (!name || !empresa || !telefone || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Todos os campos são obrigatórios',
        required: ['name', 'empresa', 'telefone', 'email', 'password'],
        received: Object.keys(req.body)
      });
    }

    // Chamar ferramenta MCP
    console.log('🤖 Chamando MCP para criar estabelecimento...');
    
    const mcpResult = await mcpClient.callTool('create_establishment_complete', req.body);
    
    console.log('🎯 Resultado MCP:', mcpResult);
    
    // Parse do resultado
    const result = JSON.parse(mcpResult.content[0].text);
    
    // Responder baseado no status
    if (result.status === 'success') {
      console.log('✅ Sucesso total!');
      res.status(201).json(result);
    } else {
      console.log('❌ Erro no processo:', result.message);
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('💥 Erro no endpoint signup-establishment:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para validar dados (via MCP)
app.post('/api/validate-establishment', async (req, res) => {
  try {
    const mcpResult = await mcpClient.callTool('validate_establishment_data', req.body);
    const result = JSON.parse(mcpResult.content[0].text);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao validar dados',
      details: error.message
    });
  }
});

// Endpoint para verificar se usuário existe (via MCP)
app.post('/api/check-user', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email é obrigatório'
      });
    }

    const mcpResult = await mcpClient.callTool('check_user_exists', { email });
    const result = JSON.parse(mcpResult.content[0].text);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao verificar usuário',
      details: error.message
    });
  }
});

// Endpoint para buscar estabelecimento (via MCP)
app.get('/api/establishment/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const mcpResult = await mcpClient.callTool('get_establishment_by_email', { email });
    const result = JSON.parse(mcpResult.content[0].text);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar estabelecimento',
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
  console.log('🚀 API Gateway MCP iniciado!');
  console.log(`🌍 Porta: ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📍 Test Supabase: http://localhost:${PORT}/test-supabase`);
  console.log(`📍 Signup: http://localhost:${PORT}/api/signup-establishment`);
  console.log('🤖 MCP Tools: create_establishment_complete, validate_establishment_data, check_user_exists');
});