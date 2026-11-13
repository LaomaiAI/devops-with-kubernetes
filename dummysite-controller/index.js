const fs = require("fs");
const https = require("https");
const GROUP = "stable.dwk";
const VERSION = "v1";
const PLURAL = "dummysites";
const HOST = process.env.KUBERNETES_SERVICE_HOST;
const PORT = process.env.KUBERNETES_SERVICE_PORT || "443";
const TOKEN = fs.readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/token", "utf8").trim();
const CA = fs.readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt");
function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: HOST, port: PORT, path: path, method: method, ca: CA, headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json", Accept: "application/json" } }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) { resolve(data ? JSON.parse(data) : {}); } else { reject(new Error(method + " " + path + " -> " + res.statusCode + " " + data)); }
      });
    });
    req.on("error", reject);
    if (body) { req.write(JSON.stringify(body)); }
    req.end();
  });
}
function owner(site) { return { apiVersion: GROUP + "/" + VERSION, kind: "DummySite", name: site.metadata.name, uid: site.metadata.uid }; }
function baseName(site) { return "dummysite-" + site.metadata.name; }
function deploymentFor(site) {
  const name = baseName(site);
  const url = site.spec.website_url;
  return { apiVersion: "apps/v1", kind: "Deployment", metadata: { name: name, namespace: site.metadata.namespace, labels: { app: name, dummysite: site.metadata.name }, ownerReferences: [owner(site)] }, spec: { replicas: 1, selector: { matchLabels: { app: name } }, template: { metadata: { labels: { app: name, dummysite: site.metadata.name } }, spec: { volumes: [{ name: "www", emptyDir: {} }], initContainers: [{ name: "fetch", image: "curlimages/curl:8.10.1", command: ["sh", "-c", "curl -fsSL --max-time 30 -o /www/index.html $WEBSITE_URL"], env: [{ name: "WEBSITE_URL", value: url }], volumeMounts: [{ name: "www", mountPath: "/www" }] }], containers: [{ name: "nginx", image: "nginx:alpine", ports: [{ containerPort: 80 }], volumeMounts: [{ name: "www", mountPath: "/usr/share/nginx/html" }] }] } } } };
}
function serviceFor(site) {
  const name = baseName(site);
  return { apiVersion: "v1", kind: "Service", metadata: { name: name, namespace: site.metadata.namespace, labels: { app: name, dummysite: site.metadata.name }, ownerReferences: [owner(site)] }, spec: { selector: { app: name }, ports: [{ port: 80, targetPort: 80 }] } };
}
function ingressFor(site) {
  const name = baseName(site);
  const host = site.metadata.name + ".dummysite.local";
  return { apiVersion: "networking.k8s.io/v1", kind: "Ingress", metadata: { name: name, namespace: site.metadata.namespace, labels: { app: name, dummysite: site.metadata.name }, ownerReferences: [owner(site)] }, spec: { ingressClassName: "traefik", rules: [{ host: host, http: { paths: [{ path: "/", pathType: "Prefix", backend: { service: { name: name, port: { number: 80 } } } }] } }] } };
}
async function ensureOne(kind, getPath, createPath, obj) {
  try { await api("GET", getPath); } catch (e) { if (String(e.message).indexOf("-> 404") < 0) { throw e; } await api("POST", createPath, obj); console.log("created " + kind + " " + obj.metadata.name); }
}
async function ensure(site) {
  const ns = site.metadata.namespace;
  const name = baseName(site);
  const wantUrl = site.spec.website_url;
  try {
    const cur = await api("GET", "/apis/apps/v1/namespaces/" + ns + "/deployments/" + name);
    const inits = cur.spec.template.spec.initContainers || [];
    const envs = (inits[0] || {}).env || [];
    const curUrl = envs.find((e) => e.name === "WEBSITE_URL");
    if (!curUrl || curUrl.value !== wantUrl) { const dep = deploymentFor(site); dep.metadata.resourceVersion = cur.metadata.resourceVersion; await api("PUT", "/apis/apps/v1/namespaces/" + ns + "/deployments/" + name, dep); console.log("updated deployment " + name + " (" + wantUrl + ")"); } else { console.log("deployment " + name + " up to date"); }
  } catch (e) {
    if (String(e.message).indexOf("-> 404") < 0) { throw e; }
    await api("POST", "/apis/apps/v1/namespaces/" + ns + "/deployments", deploymentFor(site));
    console.log("created deployment " + name + " (" + wantUrl + ")");
  }
  await ensureOne("service", "/api/v1/namespaces/" + ns + "/services/" + name, "/api/v1/namespaces/" + ns + "/services", serviceFor(site));
  await ensureOne("ingress", "/apis/networking.k8s.io/v1/namespaces/" + ns + "/ingresses/" + name, "/apis/networking.k8s.io/v1/namespaces/" + ns + "/ingresses", ingressFor(site));
}
async function reconcileAll() {
  const list = await api("GET", "/apis/" + GROUP + "/" + VERSION + "/" + PLURAL);
  for (const item of list.items || []) { try { await ensure(item); } catch (e) { console.error("reconcile failed for " + item.metadata.name + ": " + e.message); } }
  return list.metadata.resourceVersion;
}
function watch(rv) {
  const req = https.request({ hostname: HOST, port: PORT, path: "/apis/" + GROUP + "/" + VERSION + "/" + PLURAL + "?watch=true&resourceVersion=" + rv, method: "GET", ca: CA, headers: { Authorization: "Bearer " + TOKEN, Accept: "application/json" } }, (res) => {
    let buf = "";
    res.on("data", (chunk) => {
      buf += chunk;
      let i = buf.indexOf("\n");
      while (i >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line) { let ev; try { ev = JSON.parse(line); } catch (err) { console.error("bad watch line: " + line); ev = null; } if (ev && ev.object && ev.object.spec && ev.object.spec.website_url && (ev.type === "ADDED" || ev.type === "MODIFIED")) { console.log(ev.type + " DummySite " + ev.object.metadata.namespace + "/" + ev.object.metadata.name + " url=" + ev.object.spec.website_url); ensure(ev.object).catch((e) => console.error("ensure failed: " + e.message)); } }
        i = buf.indexOf("\n");
      }
    });
    res.on("end", () => { console.log("watch closed, reconnecting"); setTimeout(main, 2000); });
    res.on("error", (e) => { console.error("watch error: " + e.message); setTimeout(main, 2000); });
  });
  req.on("error", (e) => { console.error("watch request error: " + e.message); setTimeout(main, 2000); });
  req.end();
}
async function main() {
  try { const rv = await reconcileAll(); console.log("reconciled, resourceVersion=" + rv); watch(rv); } catch (e) { console.error("startup failed: " + e.message); setTimeout(main, 5000); }
}
main();
