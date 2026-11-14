# Greeter（5.3）

小型的問候服務，零依賴 Node.js 程式。
收到 HTTP GET 會回傳環境變數 GREETING 的內容（預設 "Hello from greeter"）；
/healthz 供 readiness probe 用。

部署清單在設定倉庫 greeter/manifests/（Deployment v1／v2、greeter-svc／greeter-svc-1／greeter-svc-2、HTTPRoute）。

建映像：docker build -t greeter:latest greeter；匯入 k3d：k3d image import greeter:latest。
