const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const ExcelJS = require("exceljs");

const app = express();
const path = require("path");

app.use(cors());
app.use(express.json());

// rota inicial abre login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

const db = mysql.createConnection({
  host: "ballast.proxy.rlwy.net",
  user: "root",
  password: "JneMlyKkxuFZWllAJRAwodADPNnXjUNo",
  database: "railway",
  port: 30323
});

db.connect(err => {
  if(err) {
    console.error("Erro ao conectar no banco:", err);
  } else {
    console.log("Conectado ao MySQL online!");
  }
});
app.post("/adicionar", (req, res) => {
  const { numero_pedido, numero_artigo, endereco, setor } = req.body;

  const sql = `
    INSERT INTO mapeamentos (numero_pedido, numero_artigo, endereco, setor)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [numero_pedido, numero_artigo, endereco, setor], (err, result) => {
    if (err) {
      res.status(500).send("Erro ao salvar");
    } else {
      res.send("Salvo com sucesso!");
    }
  });
});
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

  // Criar usuário de teste
  const insertAdmin = `
    INSERT IGNORE INTO usuarios (id, usuario, senha) VALUES (1, 'admin', '1234');
  `;
  db.query(insertAdmin, (err, result) => {
    if(err) console.error("Erro ao inserir admin:", err);
    else console.log("Usuário admin inserido com sucesso!");
  });
});
app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;

  const sql = "SELECT * FROM usuarios WHERE usuario = ? AND senha = ?";
  db.query(sql, [usuario, senha], (err, results) => {
    if(err) return res.status(500).send("Erro no servidor");

    if(results.length > 0) {
      res.send({ sucesso: true, msg: "Login realizado!" });
    } else {
      res.send({ sucesso: false, msg: "Usuário ou senha incorretos" });
    }
  });
});

// Rota para buscar TODOS os pedidos
app.get("/buscar", (req, res) => {
  const sql = "SELECT * FROM mapeamentos";
  db.query(sql, (err, results) => {
    if(err) throw err;
    res.json(results);
  });
});

// Rota para buscar apenas um pedido específico
app.get("/buscar/:pedido", (req, res) => {
  const pedido = req.params.pedido;
  const sql = "SELECT * FROM mapeamentos WHERE numero_pedido = ?";
  db.query(sql, [pedido], (err, results) => {
    if(err) throw err;
    res.json(results);
  });
});

app.put("/baixar/:id", (req, res) => {
  const id = req.params.id;

  const sql = `
    UPDATE mapeamentos 
    SET status = 'RECEBIDO'
    WHERE id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      res.status(500).send("Erro ao atualizar");
    } else {
      res.send("Atualizado!");
    }
  });
});
app.get("/exportar", (req, res) => {
  db.query("SELECT * FROM mapeamentos WHERE status='MAPEADO'", (err, results) => {
    if (err) throw err;

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

    results.forEach(item => {
      worksheet.addRow(item);
    });

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
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});

