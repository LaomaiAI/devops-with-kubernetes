const http = require("http");
const fs = require("fs");
const PORT = process.env.PORT || 3000;
const COUNT_PATH = process.env.COUNT_PATH || "/usr/src/app/files/pingpong.txt";
let counter = 0;
try { counter = parseInt(fs.readFileSync(COUNT_PATH, "utf8").trim(), 10) || 0; } catch (e) {}
const server = http.createServer((req, res) => {
  const body = "pong " + counter;
  counter += 1;
  try { fs.mkdirSync(require("path").dirname(COUNT_PATH), { recursive: true }); fs.writeFileSync(COUNT_PATH, String(counter)); } catch (e) {}
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(body + String.fromCharCode(10));
});
server.listen(PORT, () => console.log("Server started in port " + PORT));
