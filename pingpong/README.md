# Ping-pong

回應 pong 0、pong 1、pong 2……，每次請求計數加一；計數寫入共享持久卷的檔案，Pod 重啟後繼續計數。

部署：docker build -t pingpong:latest .；k3d image import pingpong:latest -c k3s-default；kubectl apply -f manifests/。
與 log-output 共用 Ingress（logoutput.local，路徑 /pingpong）。
