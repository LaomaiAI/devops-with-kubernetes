const http = require("http");
const { connect: connectNats, StringCodec } = require("nats");

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const NATS_URL = process.env.NATS_URL || "nats://my-nats.nats.svc.cluster.local:4222";
const NATS_SUBJECT = process.env.NATS_SUBJECT || "todos";
const NATS_QUEUE = process.env.NATS_QUEUE || "broadcaster";
const BROADCAST_URL = process.env.BROADCAST_URL || "http://message-receiver/";
const FORWARD_ENABLED = process.env.FORWARD_ENABLED === "false" ? false : true;
const natsCodec = StringCodec();
let natsConnection = null;
let natsReady = false;

function formatMessage(data) {
  const action = data.event === "created" ? "created" : "updated";
  const state = data.done ? "done" : "not done";
  return "A todo was " + action + ": " + data.todo + " (id " + data.id + ", " + state + ")";
}

async function forward(data) {
  if (FORWARD_ENABLED === false) {
    console.log("Forwarding disabled (log-only mode): " + JSON.stringify(data));
    return;
  }
  const payload = {
    user: "bot",
    messageId: data.messageId || "unknown",
    message: formatMessage(data),
  };
  try {
    const res = await fetch(BROADCAST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("Forwarded message " + payload.messageId + " (" + data.event + " todo " + data.id + ") -> " + BROADCAST_URL + " " + res.status);
  } catch (err) {
    console.error("Failed to forward message " + payload.messageId + ":", err.message);
  }
}

async function connectNatsWithRetry() {
  while (natsConnection === null) {
    try {
      natsConnection = await connectNats({ servers: NATS_URL });
      natsReady = true;
      console.log("Connected to NATS at " + NATS_URL + ", subscribing to " + NATS_SUBJECT + " (queue " + NATS_QUEUE + ")");
      natsConnection.subscribe(NATS_SUBJECT, {
        queue: NATS_QUEUE,
        callback: async (err, msg) => {
          if (err) {
            console.error("NATS subscription error:", err.message);
            return;
          }
          try {
            const data = JSON.parse(natsCodec.decode(msg.data));
            await forward(data);
          } catch (e) {
            console.error("Failed to handle NATS message:", e.message);
          }
        },
      });
      natsConnection.closed().then(() => {
        console.log("NATS connection closed, reconnecting");
        natsReady = false;
        natsConnection = null;
        connectNatsWithRetry();
      });
    } catch (err) {
      console.error("Failed to connect to NATS, retrying in 2 seconds:", err.message);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("OK");
    return;
  }
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      service: "broadcaster",
      natsUrl: NATS_URL,
      subject: NATS_SUBJECT,
      queue: NATS_QUEUE,
      broadcastUrl: BROADCAST_URL,
      connected: natsReady,
    }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log("Broadcaster listening on port " + PORT);
  connectNatsWithRetry();
});
