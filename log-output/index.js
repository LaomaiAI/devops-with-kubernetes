const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const PORT = Number(process.env.PORT);
if (PORT < 1) {
  console.error("PORT environment variable is required");
  process.exit(1);
}

const MODE = process.env.MODE || "both";
const FILE_PATH = process.env.FILE_PATH;
if (FILE_PATH === undefined || FILE_PATH === "") {
  console.error("FILE_PATH environment variable is required");
  process.exit(1);
}
const PINGPONG_URL = process.env.PINGPONG_URL;
const INFO_FILE_PATH = process.env.INFO_FILE_PATH || "";
const MESSAGE = process.env.MESSAGE || "";
const uuid = crypto.randomUUID();
const NL = String.fromCharCode(10);
function line() {
  return new Date().toISOString() + ": " + uuid;
}
async function fetchPingCount() {
  try {
    const res = await fetch(PINGPONG_URL, { signal: AbortSignal.timeout(5000) });
    if (res.ok === false) { return null; }
    const text = (await res.text()).trim();
    const match = text.match(/([0-9]+)/);
    return match === null ? null : match[1];
  } catch (err) {
    return null;
  }
}
if (MODE === "writer" || MODE === "both") {
  setInterval(() => {
    const l = line();
    console.log(l);
    try {
      fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
      fs.appendFileSync(FILE_PATH, l + NL);
    } catch (err) {
      console.error(err);
    }
  }, 5000);
}
if (MODE === "reader" || MODE === "both") {
  const server = http.createServer(async (req, res) => {
    const lines = [];
    if (INFO_FILE_PATH !== "") {
      try {
        const info = fs.readFileSync(INFO_FILE_PATH, "utf8").trim();
        if (info !== "") { lines.push(info); }
      } catch (err) {}
    }
    if (MESSAGE !== "") {
      lines.push("env variable: MESSAGE=" + MESSAGE);
    }
    let body = "";
    if (MODE === "reader") {
      try {
        const content = fs.readFileSync(FILE_PATH, "utf8").trim();
        const lns = content.split(NL).filter(Boolean);
        body = lns.length > 0 ? lns[lns.length - 1] : line();
      } catch (err) {
        body = line();
      }
    } else {
      body = line();
    }
    lines.push(body);
    const count = await fetchPingCount();
    if (count !== null) {
      lines.push("Ping / Pongs: " + count);
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(lines.join(NL) + NL);
  });
  server.listen(PORT, () => {
    console.log("Server started in port " + PORT);
  });
}
