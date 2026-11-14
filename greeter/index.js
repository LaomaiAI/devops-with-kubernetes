const http = require("http");

const PORT = Number(process.env.PORT);
if (PORT < 1) {
  console.error("PORT environment variable is required");
  process.exit(1);
}
const GREETING = process.env.GREETING || "Hello from greeter";
const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(GREETING + "\n");
});
server.listen(PORT, () => {
  console.log("Greeter started in port " + PORT + ", greeting: " + GREETING);
});
