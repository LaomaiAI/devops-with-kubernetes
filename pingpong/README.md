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
