const http = require("http");
const { Pool } = require("pg");
const PORT = Number(process.env.PORT);
const PGHOST = process.env.PGHOST;
const PGPORT = Number(process.env.PGPORT);
const PGUSER = process.env.PGUSER;
const PGPASSWORD = process.env.PGPASSWORD;
const PGDATABASE = process.env.PGDATABASE;
if (PORT < 1 || PGHOST === undefined || PGHOST === "" || PGPORT < 1 || PGUSER === undefined || PGUSER === "" || PGPASSWORD === undefined || PGPASSWORD === "" || PGDATABASE === undefined || PGDATABASE === "") {
  console.error("PORT, PGHOST, PGPORT, PGUSER, PGPASSWORD and PGDATABASE environment variables are required");
  process.exit(1);
}
const pool = new Pool({
  host: PGHOST,
  port: PGPORT,
  user: PGUSER,
  password: PGPASSWORD,
  database: PGDATABASE,
});
const SEED_TODOS = ["Learn Kubernetes", "Learn Docker", "Complete exercise 1.13"];
async function waitForDatabase() {
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await pool.query("SELECT 1");
      console.log("Connected to Postgres at " + PGHOST + ":" + PGPORT);
      return;
    } catch (error) {
      console.log("Waiting for Postgres (attempt " + attempt + " of 30): " + error.message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.error("Could not connect to Postgres after 30 attempts");
  process.exit(1);
}
async function prepareTable() {
  await pool.query("CREATE TABLE IF NOT EXISTS todos (id serial primary key, content text not null, created_at timestamptz default now())");
  const countResult = await pool.query("SELECT COUNT(*) AS count FROM todos");
  if (Number(countResult.rows[0].count) === 0) {
    for (const seed of SEED_TODOS) {
      await pool.query("INSERT INTO todos (content) VALUES ($1)", [seed]);
    }
    console.log("Seeded " + SEED_TODOS.length + " todos");
  }
}
async function listTodos() {
  const result = await pool.query("SELECT id, content FROM todos ORDER BY id");
  return result.rows.map((row) => ({ id: row.id, todo: row.content }));
}
async function createTodo(text) {
  const result = await pool.query("INSERT INTO todos (content) VALUES ($1) RETURNING id, content", [text]);
  const row = result.rows[0];
  return { id: row.id, todo: row.content };
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
    req.on("error", (error) => reject(error));
  });
}
function parseTodoText(body, contentType) {
  if (contentType.includes("application/json")) {
    const parsed = JSON.parse(body);
    if (parsed.todo !== undefined) {
      return String(parsed.todo);
    }
    if (parsed.content !== undefined) {
      return String(parsed.content);
    }
    return "";
  }
  const params = new URLSearchParams(body);
  const value = params.get("todo");
  if (value === null) {
    return "";
  }
  return value;
}
const server = http.createServer(async (req, res) => {
  if (req.url === "/todos" && req.method === "GET") {
    const todos = await listTodos();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(todos));
    console.log("GET /todos -> " + todos.length + " todos");
    return;
  }
  if (req.url === "/todos" && req.method === "POST") {
    const body = await readBody(req);
    const contentType = req.headers["content-type"] || "";
    try {
      const text = parseTodoText(body, contentType);
      if (text.trim() === "") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Todo text is required" }));
        console.log("POST /todos -> rejected empty todo");
        return;
      }
      const created = await createTodo(text);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(created));
      console.log("POST /todos -> created todo " + created.id + ": " + created.todo);
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid request: " + error.message }));
    }
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});
waitForDatabase().then(() => prepareTable()).then(() => {
  server.listen(PORT, () => console.log("Server started in port " + PORT));
}).catch((error) => {
  console.error("Failed to start: " + error.message);
  process.exit(1);
});
