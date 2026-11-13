const http = require("http");
const fs = require("fs");
const path = require("path");
const PORT = Number(process.env.PORT);
const IMAGE_PATH = process.env.IMAGE_PATH;
const CACHE_MS = parseInt(process.env.IMAGE_CACHE_MS, 10);
const IMAGE_URL = process.env.IMAGE_URL;
const TODO_BACKEND_URL = process.env.TODO_BACKEND_URL;
const FALLBACK_TODOS = ["Learn Kubernetes", "Learn Docker", "Complete exercise 1.13"];
if (PORT < 1 || Number.isNaN(CACHE_MS) || IMAGE_PATH === undefined || IMAGE_PATH === '' || IMAGE_URL === undefined || IMAGE_URL === '' || TODO_BACKEND_URL === undefined || TODO_BACKEND_URL === '') {
  console.error('PORT, IMAGE_PATH, IMAGE_CACHE_MS, IMAGE_URL and TODO_BACKEND_URL environment variables are required');
  process.exit(1);
}
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function getImage() {
  try {
    const stats = await fs.promises.stat(IMAGE_PATH);
    if (Date.now() - stats.mtimeMs < CACHE_MS) {
      return fs.readFileSync(IMAGE_PATH);
    }
  } catch (err) {}
  const image = await fetch(IMAGE_URL, { signal: AbortSignal.timeout(10000) });
  if (image.ok === false) { throw new Error("Failed to fetch image: " + image.status); }
  const buffer = Buffer.from(await image.arrayBuffer());
  fs.mkdirSync(path.dirname(IMAGE_PATH), { recursive: true });
  fs.writeFileSync(IMAGE_PATH, buffer);
  return buffer;
}
function toTodoEntry(item) {
  if (item !== null && typeof item === "object") {
    return { id: item.id === undefined ? null : item.id, todo: String(item.todo || item.content || ""), done: item.done === true };
  }
  return { id: null, todo: String(item), done: false };
}
function renderTodoItems(todos) {
  return todos.map((item) => {
    const text = escapeHtml(item.todo);
    if (item.id === null || item.id === undefined) {
      return "<li>" + text + "</li>";
    }
    const checked = item.done === true ? " checked" : "";
    const label = item.done === true ? "<s>" + text + "</s>" : text;
    return "<li><input type=\"checkbox\" data-todo-id=\"" + item.id + "\"" + checked + " onchange=\"toggleTodo(this)\"> " + label + "</li>";
  }).join("");
}
async function fetchTodos() {
  try {
    const res = await fetch(TODO_BACKEND_URL, { signal: AbortSignal.timeout(5000) });
    if (res.ok === false) { throw new Error("Backend responded " + res.status); }
    const data = await res.json();
    if (Array.isArray(data) === false) { throw new Error("Backend did not return a list"); }
    return data.map((item) => toTodoEntry(item)).filter((entry) => entry.todo.length > 0);
  } catch (err) {
    console.error("Failed to fetch todos, using fallback list:", err);
    return FALLBACK_TODOS.map((text) => ({ id: null, todo: text, done: false }));
  }
}
function page(todos) {
  const items = renderTodoItems(todos);
  return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>The project App</title><script>async function toggleTodo(checkbox) { const id = checkbox.getAttribute(\"data-todo-id\"); await fetch(\"/todos/\" + id, { method: \"PUT\", headers: { \"Content-Type\": \"application/json\" }, body: JSON.stringify({ done: checkbox.checked }) }); window.location.reload(); }</script></head><body><h1>The project App</h1><img src=\"/image.jpg\" alt=\"Hourly image\"><form method=\"POST\" action=\"/todos\"><input type=\"text\" name=\"todo\" maxlength=\"140\" placeholder=\"New todo\"><button type=\"submit\">Send</button></form><form method=\"POST\" action=\"/break\"><button type=\"submit\">Break the app</button></form><ul>" + items + "</ul></body></html>";
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}
let isHealthy = true;
const server = http.createServer(async (req, res) => {
  const pathname = req.url.split("?")[0];
  if (pathname === "/healthz") {
    if (isHealthy === false) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Broken");
      console.log("GET /healthz -> 500 (broken)");
      return;
    }
    let backendOk = false;
    try {
      const backend = await fetch(TODO_BACKEND_URL, { signal: AbortSignal.timeout(2000) });
      backendOk = backend.ok;
    } catch (error) {
      console.error("Health check failed: " + error.message);
    }
    if (backendOk === false) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Todo backend unavailable");
      console.log("GET /healthz -> 500 (backend)");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    console.log("GET /healthz -> 200");
    return;
  }
  if (pathname === "/break" && req.method === "POST") {
    isHealthy = false;
    console.log("POST /break -> app broken");
    res.writeHead(303, { Location: "/" });
    res.end();
    return;
  }
  if (pathname === "/image.jpg") {
    try {
      const img = await getImage();
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(img);
    } catch (err) {
      console.error(err);
      res.writeHead(503, { "Content-Type": "text/plain" });
      res.end("Image unavailable" + String.fromCharCode(10));
    }
    return;
  }
  if (pathname === "/todos" && req.method === "POST") {
    try {
      const form = new URLSearchParams(await readBody(req));
      const todoText = String(form.get("todo") || "").trim();
      if (todoText !== "") {
        const backend = await fetch(TODO_BACKEND_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ todo: todoText }) });
        console.log("POST /todos -> " + TODO_BACKEND_URL + " " + backend.status + " " + todoText);
      }
    } catch (err) {
      console.error(err);
    }
    res.writeHead(303, { Location: "/" });
    res.end();
    return;
  }
  if (pathname.startsWith("/todos/") && req.method === "PUT") {
    const id = pathname.slice("/todos/".length);
    try {
      const body = await readBody(req);
      const backend = await fetch(TODO_BACKEND_URL + "/" + id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: body });
      const text = await backend.text();
      res.writeHead(backend.status, { "Content-Type": "application/json" });
      res.end(text);
      console.log("PUT /todos/" + id + " -> " + TODO_BACKEND_URL + "/" + id + " " + backend.status);
    } catch (err) {
      console.error(err);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Todo backend unavailable" }));
    }
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page(await fetchTodos()));
});
server.listen(PORT, () => {
  console.log("Server started in port " + PORT);
});
