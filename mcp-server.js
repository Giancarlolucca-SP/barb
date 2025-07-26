import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class SupabaseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'supabase-establishment-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  setupTools() {
    // Handler para chamadas de ferramentas
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      console.log(`🔧 Chamando ferramenta: ${name}`);
      console.log(`📋 Argumentos:`, args);

      switch (name) {
        case 'create_establishment_complete':
          return await this.createEstablishmentComplete(args);
        case 'validate_establishment_data':
          return await this.validateEstablishmentData(args);
        case 'check_user_exists':
          return await this.checkUserExists(args);
        case 'get_establishment_by_email':
          return await this.getEstablishmentByEmail(args);
        default:
          throw new Error(`Ferramenta desconhecida: ${name}`);
      }
    });

    // Handler para listar ferramentas
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'create_establishment_complete',
            description: 'Cria usuário no Supabase Auth e estabelecimento no banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                name: { 
                  type: 'string', 
                  description: 'Nome completo do responsável' 
                },
                empresa: { 
                  type: 'string', 
                  description: 'Nome da empresa/estabelecimento' 
                },
                telefone: { 
                  type: 'string', 
                  description: 'Telefone de contato' 
                },
                email: { 
                  type: 'string', 
                  description: 'Email para login' 
                },
                password: { 
                  type: 'string', 
                  description: 'Senha para login' 
                }
              },
              required: ['name', 'empresa', 'telefone', 'email', 'password']
            }
          },
          {
            name: 'validate_establishment_data',
            description: 'Valida os dados do estabelecimento antes de criar',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                empresa: { type: 'string' },
                telefone: { type: 'string' },
                email: { type: 'string' },
                password: { type: 'string' }
              }
            }
          },
          {
            name: 'check_user_exists',
            description: 'Verifica se um usuário já existe no sistema',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string' }
              },
              required: ['email']
            }
          },
          {
            name: 'get_establishment_by_email',
            description: 'Busca estabelecimento por email',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string' }
              },
              required: ['email']
            }
          }
        ]
      };
    });
  }

  // 🏗️ FERRAMENTA PRINCIPAL - Criar usuário + estabelecimento completo
  async createEstablishmentComplete(args) {
    try {
      console.log('🚀 Iniciando criação completa de estabelecimento...');
      
      const { name, empresa, telefone, email, password } = args;

      // 1. Validar dados primeiro
      const validation = await this.validateEstablishmentData(args);
      const validationResult = JSON.parse(validation.content[0].text);
      
      if (!validationResult.isValid) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: 'Dados inválidos',
              errors: validationResult.errors
            })
          }]
        };
      }

      // 2. Verificar se usuário já existe
      const userCheck = await this.checkUserExists({ email });
      const userExists = JSON.parse(userCheck.content[0].text);
      
      if (userExists.exists) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: 'Usuário já existe com este email'
            })
          }]
        };
      }

      // 3. Criar usuário no Supabase Auth
      console.log('🔐 Criando usuário no Supabase Auth...');
      
      const authResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password
        })
      });

      const authResult = await authResponse.json();
      console.log('🔐 Resposta Auth:', authResult);

      if (!authResponse.ok) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: 'Erro ao criar usuário no sistema de autenticação',
              details: authResult.message || 'Erro desconhecido'
            })
          }]
        };
      }

      const userId = authResult.id || authResult.user?.id;
      
      if (!userId) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: 'User ID não foi retornado pelo sistema de autenticação'
            })
          }]
        };
      }

      // 4. Criar estabelecimento no banco
      console.log('🏪 Criando estabelecimento no banco...');
      
      const establishmentResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/establishments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: name.trim(),
          empresa: empresa.trim(),
          nome_responsavel: name.trim(),
          telefone: telefone.replace(/\D/g, ''),
          email: email.toLowerCase().trim(),
          user_id: userId
        })
      });

      const establishmentResult = await establishmentResponse.json();
      console.log('🏪 Resposta Establishment:', establishmentResult);

      if (!establishmentResponse.ok) {
        // Se falhou criar establishment, idealmente deletaríamos o usuário
        console.error('❌ Erro ao criar estabelecimento, mas usuário foi criado');
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: 'Erro ao criar estabelecimento',
              details: establishmentResult.message || 'Erro desconhecido',
              warning: 'Usuário foi criado mas estabelecimento falhou'
            })
          }]
        };
      }

      // 5. Sucesso total!
      console.log('✅ Usuário e estabelecimento criados com sucesso!');
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            message: 'Usuário e estabelecimento criados com sucesso!',
            data: {
              user_id: userId,
              establishment_id: establishmentResult[0]?.id,
              email: email.toLowerCase().trim(),
              establishment_name: empresa.trim(),
              responsible_name: name.trim(),
              created_at: new Date().toISOString()
            }
          })
        }]
      };

    } catch (error) {
      console.error('❌ Erro na criação completa:', error);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            message: 'Erro interno do servidor',
            details: error.message
          })
        }]
      };
    }
  }

  // 🔍 FERRAMENTA - Validar dados
  async validateEstablishmentData(args) {
    const { name, empresa, telefone, email, password } = args;
    const errors = [];

    // Validações de campos obrigatórios
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

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          isValid: errors.length === 0,
          errors: errors,
          validatedData: errors.length === 0 ? {
            name: name?.trim(),
            empresa: empresa?.trim(),
            telefone: telefone?.replace(/\D/g, ''),
            email: email?.toLowerCase().trim()
          } : null
        })
      }]
    };
  }

  // 👤 FERRAMENTA - Verificar se usuário existe
  async checkUserExists(args) {
    try {
      const { email } = args;
      
      // Verificar na tabela de establishments primeiro (mais rápido)
      const response = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/establishments?email=eq.${email.toLowerCase().trim()}`,
        {
          headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
          }
        }
      );

      const establishments = await response.json();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            exists: establishments.length > 0,
            count: establishments.length,
            establishments: establishments
          })
        }]
      };
      
    } catch (error) {
      console.error('❌ Erro ao verificar usuário:', error);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            exists: false,
            error: error.message
          })
        }]
      };
    }
  }

  // 🏪 FERRAMENTA - Buscar estabelecimento por email
  async getEstablishmentByEmail(args) {
    try {
      const { email } = args;
      
      const response = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/establishments?email=eq.${email.toLowerCase().trim()}`,
        {
          headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
          }
        }
      );

      const establishments = await response.json();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            found: establishments.length > 0,
            establishments: establishments
          })
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            found: false,
            error: error.message
          })
        }]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🤖 MCP Server para Supabase iniciado!');
    console.log('📡 Conectado via STDIO transport');
    console.log('🛠️ Ferramentas disponíveis: create_establishment_complete, validate_establishment_data, check_user_exists, get_establishment_by_email');
  }
}

// Inicializar e executar o servidor MCP
const server = new SupabaseMCPServer();
server.run().catch((error) => {
  console.error('💥 Erro fatal no MCP Server:', error);
  process.exit(1);
});