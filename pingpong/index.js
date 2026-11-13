const http = require("http");

const PORT = Number(process.env.PORT);
if (PORT < 1) {
  console.error("PORT environment variable is required");
  process.exit(1);
}

let counter = 0;

const server = http.createServer((req, res) => {
  const pathname = req.url.split("?")[0];
  if (pathname === "/count") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(String(counter) + String.fromCharCode(10));
    return;
  }
  const body = "pong " + counter;
  counter += 1;
  console.log(body);
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(body + String.fromCharCode(10));
});

server.listen(PORT, () => {
  console.log("Server started in port " + PORT);
});
