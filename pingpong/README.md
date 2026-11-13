# Ping-pong
回應 pong 0、pong 1、pong 2，每次請求計數加一；計數只保留在記憶體中（2.1 起不再寫入共享檔案）。
GET / 與 GET /pingpong 回應 pong N 並計數加一；GET /count 只回傳目前計數而不計數，供 log-output 經 HTTP 取得。
部署：docker build -t pingpong:latest .；k3d image import pingpong:latest -c k3s-default；kubectl apply -f manifests/。
與 log-output 共用 Ingress（logoutput.local，路徑 /pingpong）。

## Exercise 2.7

The ping counter is stored in Postgres, running as a StatefulSet (`pingpong-db`, 1 replica) with a 1Gi persistent volume (`local-path` storage class). The data stays in the `pongs` table, so deleting the pingpong Pod does not lose the counter.
Connection settings come from the ConfigMap `pingpong-config` and the password from the Secret `pingpong-db-secret`.
The app creates the `pongs` table on startup (if needed), waits up to 30 seconds for the database, and increments the counter atomically with `UPDATE ... RETURNING`.

Note: the Postgres image is pulled from Docker Hub by the kubelet (imagePullPolicy: IfNotPresent). Importing this multi-architecture image with `k3d image import` fails in this environment (every node reports a missing content digest), so it is not pre-loaded into the nodes.

## Exercise 3.4

Ping pong 不再回應 `/pingpong`，只回應 `/`（與 `/count`）。應用不再反映集群層級的 URL 結構；路徑重寫由集群層負責：
- Gateway 集群：HTTPRoute 的 `/pingpong` 規則加 `URLRewrite` filter（`ReplacePrefixMatch: /`），把 `/pingpong` 重寫為 `/`（見 `gateway/manifests/route.yaml`）。
- 主集群：Traefik Middleware `pingpong-strip-prefix`（`stripPrefix: /pingpong`），經 Ingress 註解掛接（見 `log-output/manifests/middleware.yaml` 與 `ingress.yaml`）。

驗證（2026-11-13）：
- Gateway：`curl http://localhost:8083/pingpong` 回 `pong 2`，首頁顯示 `Ping / Pongs: 3`。
- 主集群：經 Traefik（logoutput.local）的 `/pingpong` 回 `pong 4`，首頁顯示 `Ping / Pongs: 5`。
