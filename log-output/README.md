# Log output
啟動時產生一個隨機字串（UUID），每 5 秒以時間戳輸出一次，例如 2020-03-30T12:15:17.705Z:8523ecb1-。
模式由 MODE 環境變數控制：both 記錄並提供 HTTP 端點；writer 只寫入檔案；reader 只讀取檔案並提供 HTTP 端點。
writer 與 reader 在同一 Pod 內經 emptyDir 共享 log.txt；reader 經 HTTP（PINGPONG_URL）向 ping-pong 取得計數，不再讀取共享檔案（2.1）。
部署：docker build -t log-output:latest .；k3d image import log-output:latest -c k3s-default；kubectl apply -f manifests/。
Ingress：logoutput.local，路徑 /。
