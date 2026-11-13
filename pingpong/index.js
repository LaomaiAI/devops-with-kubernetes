const http = require("http");
const { Pool } = require("pg");
const PORT = Number(process.env.PORT);
const PGHOST = process.env.PGHOST;
const PGPORT = Number(process.env.PGPORT);
const PGUSER = process.env.PGUSER;
const PGPASSWORD = process.env.PGPASSWORD;
const PGDATABASE = process.env.PGDATABASE;
if (PORT < 1 || PGHOST === undefined || PGHOST === "" || PGPORT < 1 || PGUSER === undefined || PGUSER === "" || PGPASSWORD === undefined || PGPASSWORD === "" || PGDATABASE === undefined || PGDATABASE === "") {
  console.error("PORT, PGHOST, PGPORT, PGUSER, PGPASSWORD and PGDATABASE environment variables are required");
  process.exit(1);
}
const pool = new Pool({
  host: PGHOST,
  port: PGPORT,
  user: PGUSER,
  password: PGPASSWORD,
  database: PGDATABASE,
});
pool.on("error", (error) => {
  console.error("Idle Postgres client error: " + error.message);
});
async function waitForDatabase() {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query("SELECT 1");
      console.log("Connected to Postgres at " + PGHOST + ":" + PGPORT);
      return;
    } catch (error) {
      console.log("Waiting for Postgres (attempt " + attempt + "): " + error.message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
async function prepareTable() {
  await pool.query("CREATE TABLE IF NOT EXISTS pongs (id integer primary key, count integer not null default 0)");
  await pool.query("INSERT INTO pongs (id, count) VALUES (1, 0) ON CONFLICT (id) DO NOTHING");
}
async function nextPong() {
  const result = await pool.query("UPDATE pongs SET count = count + 1 WHERE id = 1 RETURNING count");
  return result.rows[0].count - 1;
}
async function currentCount() {
  const result = await pool.query("SELECT count FROM pongs WHERE id = 1");
  if (result.rows.length === 0) {
    return 0;
  }
  return result.rows[0].count;
}
const server = http.createServer(async (req, res) => {
  if (req.url === "/") {
    let pong;
    try {
      pong = await nextPong();
    } catch (error) {
      console.error("Database error: " + error.message);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Database unavailable");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("pong " + pong);
    console.log("GET " + req.url + " -> pong " + pong);
    return;
  }
  if (req.url === "/count") {
    let count;
    try {
      count = await currentCount();
    } catch (error) {
      console.error("Database error: " + error.message);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Database unavailable");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(String(count));
    console.log("GET /count -> " + count);
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});
server.listen(PORT, () => console.log("Server started in port " + PORT));
waitForDatabase().then(() => prepareTable()).then(() => {
  console.log("Database ready");
}).catch((error) => {
  console.error("Failed to set up the database: " + error.message);
});
