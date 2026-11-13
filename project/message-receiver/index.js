const http = require("http");

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const received = [];

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "POST" && url.pathname === "/") {
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      const entry = {
        receivedAt: new Date().toISOString(),
        messageId: parsed.messageId || "unknown",
        user: parsed.user || "",
        message: parsed.message || "",
      };
      received.push(entry);
      console.log("Received broadcast message " + entry.messageId + ": " + entry.message);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    } catch (err) {
      console.error("Failed to record broadcast message:", err.message);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
    return;
  }
  if (req.method === "GET" && url.pathname === "/received") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(received));
    return;
  }
  if (req.method === "GET" && url.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("OK");
    return;
  }
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ service: "message-receiver", receivedCount: received.length }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log("Message receiver listening on port " + PORT);
});
