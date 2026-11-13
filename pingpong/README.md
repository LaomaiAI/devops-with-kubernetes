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

## Exercise 4.1

Readiness probe：deployment 的 readinessProbe 以 HTTP GET 檢查 `/count`（port 3000，initialDelaySeconds 5、periodSeconds 5、timeoutSeconds 5）。只有與 Postgres 連線正常時，`/count` 才回 200，Pod 標示為 Ready；資料庫未就緒時，`/count` 回 500，Pod 保持 0/1。

為配合探針，啟動流程改為先監聽 HTTP，再在背景無限重試連接資料庫（以往最多 30 次後退出）；資料庫中途斷線時，`GET /` 與 `GET /count` 的查詢失敗回 500，不再令進程崩潰；另加 `pool.on("error", ...)` 監聽，避免連接池閒置客戶端斷線時觸發未處理事件導致進程退出。

驗證（2026-11-13）：`pingpong-db` 縮至 0 副本時，kubectl get pods 顯示 log-output 1/2、pingpong 0/1（Running，0 次重啟）；恢復至 1 副本後，自動回到 log-output 2/2、pingpong 1/1。計數保存在 PVC，恢復後主集群 `/pingpong` 回 `pong 5`，首頁顯示 `Ping / Pongs: 6`。

## Exercise 4.4：金絲雀發佈（Argo Rollouts）

主集群已安裝 Argo Rollouts（控制器 argo-rollouts，命名空間 argo-rollouts）：先 kubectl create namespace argo-rollouts，再以 kubectl apply --server-side -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml 安裝（一般 apply 會因 CRD 註解超過 262144 位元組而失敗，必須用 server-side apply）。

AnalysisTemplate pingpong-cpu-usage（pingpong/manifests/analysistemplate.yaml）：
- 指標：sum(rate(container_cpu_usage_seconds_total{namespace="exercises"}[5m]))，以 Prometheus 量度 exercises 命名空間全部容器的 CPU 使用率之和。
- 閾值 0.05：2026-11-13 量度閒置時約 0.0047 cores，取約 10 倍。
- initialDelay: 30s、interval: 10s、count: 1；successCondition: result[0] <= 0.05；failureLimit: 0。
- Argo 的 failureLimit 是容許的失敗次數：count: 1 配 failureLimit: 1 時，唯一一次量度失敗仍判整體成功（初版測試即因此誤晉級），故改為 0。

Rollout pingpong（pingpong/manifests/rollout.yaml）：canary 步驟 setWeight: 50 → analysis（pingpong-cpu-usage）→ setWeight: 100。主集群的 pingpong Deployment 已刪除，改由 Rollout 管理；deployment.yaml 保留，僅供 Gateway 集群（3.3／3.4）使用。

測試記錄（2026-11-13 17:26–17:41 UTC，主集群）：

- 首次測試（閾值臨時改為 0.0001，只改集群內物件，不改檔案；failureLimit: 1）：量度值 0.00502 高於閾值，量度 Failed，但 AnalysisRun pingpong-85cf976494-2-1 卻 Successful，更新照樣晉級。原因見上，遂把檔案的 failureLimit 改為 0。
- 修正後重測（閾值 0.0001，failureLimit: 0）：量度值 0.00418，AnalysisRun pingpong-7d9cf98845-3-1 Failed，Rollout 變為 Degraded，金絲雀回滾，穩定版（pingpong-85cf976494-9c4wk）繼續提供服務。
- 恢復閾值 0.05 後更新：AnalysisRun pingpong-5bd6799c67-4-1 Successful，晉級到新 Pod；再把測試用的環境變數移除（與檔案一致），AnalysisRun pingpong-579b85bbf9-5-1 Successful，Rollout 回到 Healthy。
- 最終驗證：kubectl get rollout pingpong -n exercises 為 phase=Healthy（stableRS=579b85bbf9）；curl /pingpong 回 pong 8，首頁 Ping / Pongs: 9。

環境故障記錄：2026-11-13 約 16:29–17:00 UTC，Codespace 主機負載升至約 95（2 核），kubectl 與 Docker 呼叫延遲以分鐘計；重啟 Codespace 後恢復，兩個 k3d 集群自行復起（k3d cluster list 顯示 gateway 1/1 2/2、k3s-default 1/1 2/2）。重啟前誤裝到 Gateway 集群的 Argo 已清理（刪除命名空間與全部 5 個 Argo CRD，grep argoproj 無殘留）。
