// server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const ExcelJS = require("exceljs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// arquivos estáticos (public)
app.use(express.static(path.join(__dirname, "public")));

// rota inicial abre login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Conexão com MySQL online Railway
const db = mysql.createConnection({
  host: "switchback.proxy.rlwy.net",
  user: "root",
  password: "ZLxXAZNoAuMydsHxwVskXLpuoQvLcwcx",
  database: "railway",
  port: 59728
});

db.connect(err => {
  if(err){
    console.error("Erro ao conectar no banco:", err);
  } else {
    console.log("Conectado ao MySQL online!");
  }
});

// =======================================
// CRIAR TABELA USUÁRIOS
// =======================================
const createUsuarios = `
CREATE TABLE IF NOT EXISTS usuarios (
    id INT NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);
`;

db.query(createUsuarios, (err, result) => {
  if(err) console.error("Erro ao criar tabela usuarios:", err);
  else console.log("Tabela usuarios pronta!");

  // Criar usuário admin
  const insertAdmin = `
    INSERT IGNORE INTO usuarios (id, usuario, senha) VALUES (1, 'admin', '1234');
  `;
  db.query(insertAdmin, (err, result) => {
    if(err) console.error("Erro ao inserir admin:", err);
    else console.log("Usuário admin inserido com sucesso!");
  });
});

// =======================================
// CRIAR TABELA MAPEAMENTOS2
// =======================================
const createMapeamentos = `
CREATE TABLE IF NOT EXISTS mapeamentos2 (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_pedido VARCHAR(255),
  numero_artigo VARCHAR(255),
  endereco VARCHAR(255),
  setor VARCHAR(255),
  status VARCHAR(10) DEFAULT 'MAPEADO',
  data_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.query(createMapeamentos, (err, result) => {
  if(err) console.error("Erro ao criar tabela mapeamentos2:", err);
  else console.log("Tabela mapeamentos2 pronta!");
});

// =======================================
// ROTA LOGIN
// =======================================
app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;

  const sql = "SELECT * FROM usuarios WHERE usuario = ? AND senha = ?";
  db.query(sql, [usuario, senha], (err, results) => {
    if(err) return res.status(500).send({ sucesso:false, msg:"Erro no servidor" });

    if(results.length > 0){
      res.send({ sucesso:true, msg:"Login realizado!" });
    } else {
      res.send({ sucesso:false, msg:"Usuário ou senha incorretos" });
    }
  });
});

// =======================================
// ROTA ADICIONAR MAPEAMENTO
// =======================================
app.post("/adicionar", (req, res) => {
  const { numero_pedido, numero_artigo, endereco, setor } = req.body;

  const sql = `
    INSERT INTO mapeamentos2 (numero_pedido, numero_artigo, endereco, setor)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [numero_pedido, numero_artigo, endereco, setor], (err, result) => {
    if(err){
      console.log(err);
      res.status(500).send("Erro ao salvar");
    } else {
      res.send("Salvo com sucesso!");
    }
  });
});

// =======================================
// ROTA BUSCAR TODOS OS PEDIDOS
// =======================================
app.get("/buscar", (req, res) => {
  const sql = "SELECT * FROM mapeamentos2";
  db.query(sql, (err, results) => {
    if(err) throw err;
    res.json(results);
  });
});

// =======================================
// ROTA BUSCAR PEDIDO ESPECÍFICO
// =======================================
app.get("/buscar/:pedido", (req, res) => {
  const pedido = req.params.pedido;
  const sql = "SELECT * FROM mapeamentos2 WHERE numero_pedido = ?";
  db.query(sql, [pedido], (err, results) => {
    if(err) throw err;
    res.json(results);
  });
});

// =======================================
// ROTA DAR BAIXA NO PEDIDO
// =======================================
app.put("/baixar/:id", (req, res) => {
  const id = req.params.id;
  const sql = `UPDATE mapeamentos2 SET status='RECEBIDO' WHERE id = ?`;

  db.query(sql, [id], (err, result) => {
    if(err){
      res.status(500).send("Erro ao atualizar");
    } else {
      res.send("Atualizado!");
    }
  });
});

// =======================================
// EXPORTAR EXCEL
// =======================================
app.get("/exportar", (req, res) => {
  db.query("SELECT * FROM mapeamentos2 WHERE status='MAPEADO'", (err, results) => {
    if(err) throw err;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mapeamentos');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Número Pedido', key: 'numero_pedido', width: 20 },
      { header: 'Número Artigo', key: 'numero_artigo', width: 20 },
      { header: 'Endereço', key: 'endereco', width: 20 },
      { header: 'Setor', key: 'setor', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Data Registro', key: 'data_registro', width: 20 }
    ];

    results.forEach(item => worksheet.addRow(item));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=mapeamentos.xlsx"
    );

    workbook.xlsx.write(res).then(() => res.end());
  });
});

// =======================================
// INICIAR SERVIDOR
// =======================================
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});

