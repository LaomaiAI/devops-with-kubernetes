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
async function fetchTodos() {
  try {
    const res = await fetch(TODO_BACKEND_URL, { signal: AbortSignal.timeout(5000) });
    if (res.ok === false) { throw new Error("Backend responded " + res.status); }
    const data = await res.json();
    if (Array.isArray(data) === false) { throw new Error("Backend did not return a list"); }
    return data.map((item) => item !== null && typeof item === "object" ? String(item.todo || item.content || "") : String(item)).filter((text) => text !== "");
  } catch (err) {
    console.error("Failed to fetch todos, using fallback list:", err);
    return FALLBACK_TODOS.slice();
  }
}
function page(todos) {
  return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>The project App</title></head><body><h1>The project App</h1><img src=/image.jpg alt=Hourly><form method=\"POST\" action=\"/todos\"><input type=\"text\" name=\"todo\" maxlength=\"140\" placeholder=\"New todo\"><button type=\"submit\">Send</button></form><ul><li>" + todos.map((todo) => escapeHtml(todo)).join("</li><li>") + "</li></ul></body></html>";
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}
const server = http.createServer(async (req, res) => {
  const pathname = req.url.split("?")[0];
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
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page(await fetchTodos()));
});
server.listen(PORT, () => {
  console.log("Server started in port " + PORT);
});
