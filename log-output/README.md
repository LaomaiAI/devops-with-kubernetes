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
