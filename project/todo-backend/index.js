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
const MAX_TODO_LENGTH = 140;
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
  await pool.query("CREATE TABLE IF NOT EXISTS todos (id serial primary key, content text not null, done boolean not null default false, created_at timestamptz default now())");
    await pool.query("ALTER TABLE todos ADD COLUMN IF NOT EXISTS done boolean NOT NULL DEFAULT false");
  const countResult = await pool.query("SELECT COUNT(*) AS count FROM todos");
  if (Number(countResult.rows[0].count) === 0) {
    for (const seed of SEED_TODOS) {
      await pool.query("INSERT INTO todos (content) VALUES ($1)", [seed]);
    }
    console.log("Seeded " + SEED_TODOS.length + " todos");
  }
}
async function listTodos() {
  const result = await pool.query("SELECT id, content, done FROM todos ORDER BY id");
  return result.rows.map((row) => ({ id: row.id, todo: row.content, done: row.done }));
}
async function createTodo(text) {
  const result = await pool.query("INSERT INTO todos (content) VALUES ($1) RETURNING id, content, done", [text]);
  const row = result.rows[0];
  return { id: row.id, todo: row.content, done: row.done };
}
async function updateTodoDone(id, done) {
  const result = await pool.query("UPDATE todos SET done = $2 WHERE id = $1 RETURNING id, content, done", [id, done]);
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0];
  return { id: row.id, todo: row.content, done: row.done };
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
      if (text.length > MAX_TODO_LENGTH) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Todo too long: maximum 140 characters" }));
        console.log("Todo rejected: too long, length " + text.length + ", maximum " + MAX_TODO_LENGTH + ", todo: " + text);
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
  if (req.method === "PUT" && req.url.startsWith("/todos/")) {
    const id = Number(req.url.slice("/todos/".length));
    if (Number.isInteger(id) === false || id < 1) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid todo id" }));
      return;
    }
    const body = await readBody(req);
    let done = null;
    if (body !== "") {
      try {
        const parsed = JSON.parse(body);
        if (parsed.done !== undefined) {
          done = parsed.done === true;
        }
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request: " + error.message }));
        return;
      }
    }
    if (done === null) {
      const current = await pool.query("SELECT done FROM todos WHERE id = $1", [id]);
      if (current.rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Todo not found" }));
        return;
      }
      done = current.rows[0].done === false;
    }
    const updated = await updateTodoDone(id, done);
    if (updated === null) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Todo not found" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(updated));
    console.log("PUT /todos/" + id + " -> done " + updated.done);
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
