const http = require("http");
const fs = require("fs");
const path = require("path");
const PORT = process.env.PORT || 3000;
const IMAGE_PATH = process.env.IMAGE_PATH || "/usr/src/app/files/image.jpg";
const CACHE_MS = parseInt(process.env.IMAGE_CACHE_MS || "600000", 10);
const IMAGE_URL = process.env.IMAGE_URL || "https://picsum.photos/1200";
const TODOS = ["Learn Kubernetes", "Learn Docker", "Complete exercise 1.13"];
async function getImage() {
  try { const st = fs.statSync(IMAGE_PATH); if (Date.now() - st.mtimeMs < CACHE_MS) return fs.readFileSync(IMAGE_PATH); } catch (e) {}
  const res = await fetch(IMAGE_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error("fetch failed " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  try { fs.mkdirSync(path.dirname(IMAGE_PATH), { recursive: true }); fs.writeFileSync(IMAGE_PATH, buf); } catch (e) { console.error(e.message); }
  return buf;
}
function page() { return "<!DOCTYPE html><html><head><title>The project App</title></head><body><h1>The project App</h1><img src=/image.jpg alt=Hourly><form><input type=text maxlength=140 placeholder=New todo><button type=submit>Send</button></form><ul><li>" + TODOS.join("</li><li>") + "</li></ul></body></html>"; }
const server = http.createServer(async (req, res) => {
  if (req.url === "/image.jpg") {
    try { const img = await getImage(); res.writeHead(200, { "Content-Type": "image/jpeg" }); res.end(img); } catch (e) { console.error(e.message); res.writeHead(503, { "Content-Type": "text/plain" }); res.end("Image unavailable" + String.fromCharCode(10)); }
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(page() + String.fromCharCode(10));
});
server.listen(PORT, () => console.log("Server started in port " + PORT));
