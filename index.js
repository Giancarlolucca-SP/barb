const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs"); // Adicione esta linha

const app = express();

app.use(cors());
app.use(express.json());

// Configuração do Supabase (suas chaves aqui)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Rota de cadastro de estabelecimento
app.post("/api/signup-establishment", async (req, res) => {
  console.log("🚀 Iniciando cadastro completo...");
  const { name, empresa, telefone, email, password } = req.body;

  // 1. Verificar se usuário já existe
  console.log("👤 Verificando se usuário já existe...");
  const { data: existingUser, error: checkError } = await supabase
    .from("establishments")
    .select("email")
    .eq("email", email)
    .single();

  if (existingUser) {
    return res.status(409).json({ message: "Usuário já existe." });
  }

  if (checkError && checkError.code !== "PGRST116") {
    console.error("Erro ao verificar usuário existente:", checkError);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }

  // 2. Hashear a senha antes de armazenar
  const saltRounds = 10; // Custo do hash, um valor entre 10-12 é comum
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 3. Inserir novo estabelecimento com a senha hasheada
  const { data, error } = await supabase
    .from("establishments")
    .insert([
      {
        name: name, // Nome do estabelecimento (se for o nome do estabelecimento)
        empresa: empresa, // Nome da empresa (se for o nome da empresa)
        nome_responsavel: name, // Assumindo que 'name' da API é o nome do responsável
        telefone: telefone,
        email: email,
        password: hashedPassword // Armazena a senha HASHEADA
      }
    ]);

  if (error) {
    console.error("Erro ao inserir no Supabase:", error);
    return res.status(500).json({ message: "Erro ao cadastrar estabelecimento.", error: error.message });
  }

  res.status(200).json({ message: "Estabelecimento cadastrado com sucesso!" });
});

// ... (o restante do seu código, como app.listen)
