# Ping-pong
回應 pong 0、pong 1、pong 2，每次請求計數加一；計數只保留在記憶體中（2.1 起不再寫入共享檔案）。
GET / 與 GET /pingpong 回應 pong N 並計數加一；GET /count 只回傳目前計數而不計數，供 log-output 經 HTTP 取得。
部署：docker build -t pingpong:latest .；k3d image import pingpong:latest -c k3s-default；kubectl apply -f manifests/。
與 log-output 共用 Ingress（logoutput.local，路徑 /pingpong）。
