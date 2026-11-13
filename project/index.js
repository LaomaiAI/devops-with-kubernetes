const http = require("http");
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<!DOCTYPE html><html><head><title>The project App</title></head><body><h1>The project App</h1></body></html>" + String.fromCharCode(10));
});
server.listen(PORT, () => console.log("Server started in port " + PORT));
