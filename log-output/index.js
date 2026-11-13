const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const MODE = process.env.MODE || "both";
const FILE_PATH = process.env.FILE_PATH || "/usr/src/app/files/log.txt";
const COUNT_PATH = process.env.COUNT_PATH || "/usr/src/app/files/pingpong.txt";
const uuid = crypto.randomUUID();
const NL = String.fromCharCode(10);
function line() { return new Date().toISOString() + ":" + uuid; }
if (MODE === "writer" || MODE === "both") { setInterval(() => { const l = line(); console.log(l); if (MODE === "writer") { try { fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true }); fs.appendFileSync(FILE_PATH, l + NL); } catch (e) { console.error(e.message); } } }, 5000); }
if (MODE === "reader" || MODE === "both") { const server = http.createServer((req, res) => { let body = ""; if (MODE === "reader") { try { const content = fs.readFileSync(FILE_PATH, "utf8").trim(); const lines = content.split(NL).filter(Boolean); body = lines.pop() || line(); } catch (e) { body = line(); } try { const count = fs.readFileSync(COUNT_PATH, "utf8").trim(); if (count !== "") body = body + ".Ping/ Pongs:" + count; } catch (e) {} } else { body = line(); } res.writeHead(200, { "Content-Type": "text/plain" }); res.end(body + NL); }); server.listen(PORT, () => console.log("Server started in port " + PORT)); }
