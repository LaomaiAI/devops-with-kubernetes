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
async function waitForDatabase() {
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await pool.query("SELECT 1");
      console.log("Connected to Postgres at " + PGHOST + ":" + PGPORT);
      return;
    } catch (error) {
      console.log("Waiting for Postgres (attempt " + attempt + " of 30): " + error.message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.error("Could not connect to Postgres after 30 attempts");
  process.exit(1);
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
    const pong = await nextPong();
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("pong " + pong);
    console.log("GET " + req.url + " -> pong " + pong);
    return;
  }
  if (req.url === "/count") {
    const count = await currentCount();
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(String(count));
    console.log("GET /count -> " + count);
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});
waitForDatabase().then(() => prepareTable()).then(() => {
  server.listen(PORT, () => console.log("Server started in port " + PORT));
}).catch((error) => {
  console.error("Failed to start: " + error.message);
  process.exit(1);
});
