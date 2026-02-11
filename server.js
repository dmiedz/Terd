// =============================
// TERDGLER'S TRASH CREW WEBSITE
// Full minimal Node + Express + SQLite app
// Ready for GitHub repo
// =============================

/*
SETUP:
1. Create empty repo
2. Save this file as: server.js
3. Create folders:
   /public
   /public/images
4. Run:
   npm init -y
   npm install express sqlite3 multer express-session
5. Start:
   node server.js
*/

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;

// ================= DB =================
const db = new sqlite3.Database("site.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY,
    title TEXT,
    content TEXT,
    image TEXT,
    section TEXT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.get("SELECT * FROM users WHERE username='admin'", (err, row) => {
    if (!row) {
      db.run("INSERT INTO users VALUES (NULL,'admin','password')");
    }
  });
});

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({ secret: "trashcrew", resave: false, saveUninitialized: true })
);

// ================= UPLOAD =================
const storage = multer.diskStorage({
  destination: "public/images",
  filename: (req, file, cb) => cb(null, Date.now() + file.originalname),
});
const upload = multer({ storage });

// ================= AUTH =================
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

// ================= ROUTES =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/login", (req, res) => {
  res.send(`
    <h2>Admin Login</h2>
    <form method='POST'>
      <input name='username' placeholder='Username'/><br>
      <input type='password' name='password' placeholder='Password'/><br>
      <button>Login</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, user) => {
      if (user) {
        req.session.user = user;
        res.redirect("/admin");
      } else res.send("Login failed");
    }
  );
});

app.get("/admin", requireLogin, (req, res) => {
  res.send(`
    <h2>Create Post</h2>
    <form method='POST' enctype='multipart/form-data' action='/post'>
      <input name='title' placeholder='Title'/><br>
      <select name='section'>
        <option>Power Rankings</option>
        <option>The Dumps</option>
      </select><br>
      <textarea name='content'></textarea><br>
      <input type='file' name='image'/><br>
      <button>Publish</button>
    </form>
  `);
});

app.post("/post", requireLogin, upload.single("image"), (req, res) => {
  db.run(
    "INSERT INTO posts(title,content,image,section) VALUES(?,?,?,?)",
    [
      req.body.title,
      req.body.content,
      req.file ? "/images/" + req.file.filename : "",
      req.body.section,
    ]
  );
  res.redirect("/");
});

app.get("/section/:name", requireLogin, (req, res) => {
  db.all(
    "SELECT * FROM posts WHERE section=? ORDER BY created DESC",
    [req.params.name],
    (err, rows) => {
      let html = `<h1>${req.params.name}</h1>`;
      rows.forEach((p) => {
        html += `
          <h2>${p.title}</h2>
          <p>${p.content}</p>
          ${p.image ? `<img width=300 src='${p.image}'/>` : ""}
          <hr>
        `;
      });
      res.send(html);
    }
  );
});

// ================= START =================
app.listen(PORT, () => console.log("Running on " + PORT));


// ================= PUBLIC FILES =================
// Create file: /public/index.html

/*
<!DOCTYPE html>
<html>
<head>
<title>Terdgler's Trash Crew</title>
<style>
body {
  font-family: Comic Sans MS, cursive;
  background: linear-gradient(#1c1c1c, #2b2b2b);
  color: white;
  text-align: center;
}

h1 { font-size: 60px; }

.card {
  background: #333;
  margin: 20px auto;
  padding: 20px;
  width: 300px;
  border-radius: 20px;
}

a { color: #7cff7c; font-size: 20px; }

</style>
</head>
<body>

<h1>🗑️ Terdgler's Trash Crew 🏈</h1>

<img src="https://i.imgur.com/MH7pGxF.png" width="200" />

<div class="card">
  <a href="/section/Power Rankings">Power Rankings</a>
</div>

<div class="card">
  <a href="/section/The Dumps">The Dumps</a>
</div>

<div class="card">
  <a href="https://football.fantasysports.yahoo.com/" target="_blank">
  Yahoo Fantasy Home</a>
</div>

<div class="card">
  <a href="/login">Admin Login</a>
</div>

</body>
</html>
*/
