const http = require("http");

const PORT = Number(process.env.PORT);
if (PORT < 1) {
  console.error("PORT environment variable is required");
  process.exit(1);
}

let todos = [
  { id: 1, todo: "Learn Kubernetes" },
  { id: 2, todo: "Learn Docker" },
  { id: 3, todo: "Complete exercise 1.13" },
];
let nextId = 4;
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}
function parseTodo(raw, contentType) {
  if (contentType.indexOf("application/x-www-form-urlencoded") >= 0) {
    return new URLSearchParams(raw).get("todo");
  }
  try {
    const parsed = JSON.parse(raw);
    const value = parsed.todo !== undefined ? parsed.todo : parsed.content;
    return value === undefined || value === null ? "" : String(value);
  } catch (err) {
    return "";
  }
}
const server = http.createServer(async (req, res) => {
  const pathname = req.url.split("?")[0];
  console.log(req.method + " " + pathname);
  if (pathname === "/todos" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(todos));
    return;
  }
  if (pathname === "/todos" && req.method === "POST") {
    const raw = await readBody(req);
    const todoText = String(parseTodo(raw, req.headers["content-type"] || "") || "").trim();
    if (todoText === "") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Todo text is required" }));
      return;
    }
    const item = { id: nextId, todo: todoText };
    nextId += 1;
    todos.push(item);
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(item));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});
server.listen(PORT, () => {
  console.log("Server started in port " + PORT);
});
