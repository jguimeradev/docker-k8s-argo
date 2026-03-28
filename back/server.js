const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the 'front' directory
app.use(express.static(path.join(__dirname, '../front')));

// Set up SQLite database
const db = new sqlite3.Database(':memory:'); // Using memory for simplicity, replace with file for persistence

// Initialize database with a table and some users
db.serialize(() => {
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
  )`);

  const stmt = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
  const users = [
    ["Alice Johnson", "alice@example.com"],
    ["Bob Smith", "bob@example.com"],
    ["Charlie Brown", "charlie@example.com"],
    ["Diana Prince", "diana@example.com"],
    ["Edward Norton", "edward@example.com"]
  ];

  users.forEach(user => stmt.run(user));
  stmt.finalize();
});

// GET /users/ - Get all users
app.get('/users', (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET /user/:id - Get user by ID
app.get('/user/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(row);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
