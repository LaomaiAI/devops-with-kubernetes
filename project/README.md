# Project
課程主應用：Web 伺服器，啟動時輸出 Server started in port 3000；GET / 回應 HTML 頁面，內含每小時圖片與待辦清單。
每小時圖片：從 https://picsum.photos/1200 抓取，儲存於持久卷（project-files），10 分鐘內重用同一圖片，經 /image.jpg 提供。
待辦：輸入框上限 140 字、Send 按鈕，表單 POST /todos 後由 project 轉發至 todo-backend（GET/POST /todos），頁面顯示後端待辦，後端初始三筆待辦（2.2）。
部署：docker build -t project:latest .；k3d image import project:latest -c k3s-default；kubectl apply -f manifests/。
Ingress：project.local，路徑 /。

## Exercise 2.6

All configuration (PORT, IMAGE_URL, IMAGE_PATH, IMAGE_CACHE_MS, TODO_BACKEND_URL) is passed in through environment variables from the ConfigMap `project-config` (see `manifests/configmap.yaml`). The source code contains no hard-coded port, URL or cache setting and exits if a required variable is missing.
