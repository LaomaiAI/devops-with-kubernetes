# Log output
啟動時產生一個隨機字串（UUID），每 5 秒以時間戳輸出一次，例如 2020-03-30T12:15:17.705Z:8523ecb1-。
模式由 MODE 環境變數控制：both 記錄並提供 HTTP 端點；writer 只寫入檔案；reader 只讀取檔案並提供 HTTP 端點。
writer 與 reader 在同一 Pod 內經 emptyDir 共享 log.txt；reader 經 HTTP（PINGPONG_URL）向 ping-pong 取得計數，不再讀取共享檔案（2.1）。
設定由 ConfigMap log-output-config 提供（2.5）：information.txt 掛載於 /usr/src/app/config，MESSAGE 環境變數為 hello world；reader 依序輸出檔案內容、env variable: MESSAGE=hello world、時間戳行與 Ping / Pongs 行。
部署：docker build -t log-output:latest .；k3d image import log-output:latest -c k3s-default；kubectl apply -f manifests/。
Ingress：logoutput.local，路徑 /。

## Exercise 3.4

主集群仍用 Traefik Ingress 暴露 `/pingpong`；因 Ping pong 應用已移除 `/pingpong` 路由，Ingress 經 Traefik Middleware `pingpong-strip-prefix`（`stripPrefix: /pingpong`，`log-output/manifests/middleware.yaml`）把該前綴除去後才轉發。Middleware 經 Ingress 註解 `traefik.ingress.kubernetes.io/router.middlewares: exercises-pingpong-strip-prefix@kubernetescrd` 掛接；`/` 路徑不受影響（前綴不符，不作處理）。

驗證（2026-11-13）：經 Ingress（logoutput.local）的 `/pingpong` 回 `pong 4`，首頁顯示 `Ping / Pongs: 5`。

## Exercise 4.1

Readiness probe：reader 容器的 readinessProbe 以 HTTP GET 檢查 `/healthz`（port 3000，initialDelaySeconds 5、periodSeconds 5、timeoutSeconds 10；逾時設 10 秒是因為 Ping-pong 查詢本身最長 5 秒）。`/healthz` 會取 ping-pong 的 `/count`，成功回 200 `OK`，失敗回 500 `Ping-pong unavailable`；該檢查只讀，不會令計數增加。

驗證（2026-11-13）：`pingpong-db` 縮至 0 副本時，kubectl get pods 顯示 log-output 1/2（writer 就緒、reader 未就緒）、pingpong 0/1；恢復至 1 副本後，自動回到 2/2 與 1/1。

## Exercise 4.7

以 ArgoCD 實作 GitOps：集群安裝 ArgoCD（`argocd` 命名空間，官方清單，以 server-side apply 安裝，因 CRD 註解超過 262144 bytes，client-side apply 會失敗；第二輪 server-side apply 須加 `--force-conflicts`，因第一次 client-side apply 已建立 NetworkPolicy，欄位管理權衝突）。Application 清單在 `argocd/log-output-application.yaml`（宣告式定義，不用 ArgoCD UI 或 LoadBalancer patch）：來源為本倉庫 `log-output/manifests`（targetRevision HEAD），目的地為本集群 `exercises` 命名空間，`syncPolicy.automated`（prune、selfHeal）。

驗證（2026-11-13）：Application 初次同步即為 Synced / Healthy（收編現有資源）；把 ConfigMap `MESSAGE` 改為 `hello world (GitOps)` 並 push（commit 7613c0c）後，ArgoCD 自動同步到集群（`kubectl get configmap log-output-config -n exercises` 讀回 `hello world (GitOps)`）；重啟 log-output Pod 後，首頁顯示 `env variable: MESSAGE=hello world (GitOps)`。
