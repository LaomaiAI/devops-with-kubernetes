# Project
課程主應用：Web 伺服器，啟動時輸出 Server started in port 3000；GET / 回應 HTML 頁面，內含每小時圖片與待辦清單。
每小時圖片：從 https://picsum.photos/1200 抓取，儲存於持久卷（project-files），10 分鐘內重用同一圖片，經 /image.jpg 提供。
待辦：輸入框上限 140 字、Send 按鈕，表單 POST /todos 後由 project 轉發至 todo-backend（GET/POST /todos），頁面顯示後端待辦，後端初始三筆待辦（2.2）。
部署：docker build -t project:latest .；k3d image import project:latest -c k3s-default；kubectl apply -f manifests/。
Ingress：project.local，路徑 /。

## Exercise 2.6

All configuration (PORT, IMAGE_URL, IMAGE_PATH, IMAGE_CACHE_MS, TODO_BACKEND_URL) is passed in through environment variables from the ConfigMap `project-config` (see `manifests/configmap.yaml`). The source code contains no hard-coded port, URL or cache setting and exits if a required variable is missing.
## Exercise 3.9：DBaaS 與自行架設的比較

本專案的待辦資料庫目前是自行架設：Postgres 16 以 StatefulSet 跑在集群內，1Gi 持久卷、Secret 存密碼、ConfigMap 存連線設定（見 `todo-backend/manifests/`）。以下比較此做法與 DBaaS（例如 Google Cloud SQL）的有意義差異。

### 初始化：所需工作與成本

- DBaaS
  - 優點：控制台或一行 gcloud 指令，幾分鐘建立實例；不用寫 StatefulSet／PVC／Service／Secret／ConfigMap，不用處理映像架構（2.7 曾遇多架構映像匯入失敗）與資料庫就緒重試；連線資訊由雲端提供。
  - 缺點：要付費（實例、儲存、備份與流量按量收費，免費額度有限；閒置也要收費）；要開雲端帳戶與計費（本課程的 GKE 試用須綁卡）。
- 自行架設（DIY）
  - 優點：無額外服務費，只用集群既有節點與儲存；本倉庫用 local-path 儲存類別，邊際成本接近零；設定即程式碼，清單入庫。
  - 缺點：初始化工作多：StatefulSet、1Gi PVC、Service、Secret、ConfigMap，還要處理啟動順序（應用重試連線 30 次）與映像拉取；出錯時要自己除錯。

### 維護

- DBaaS
  - 優點：雲端負責修補、版本升級、監控、故障轉移與高可用；可一鍵擴充 CPU／記憶體／儲存。
  - 缺點：版本、參數與擴充功能受供應商限制；設定錯誤或停機要等供應商；供應商綁定，遷出要自己匯出／匯入。
- 自行架設（DIY）
  - 優點：版本、參數、映像、儲存類別完全自定；資料留在自己的集群內；可攜性高（換集群只需套用清單）。
  - 缺點：升級、修補、監控、磁碟空間、節點故障全部自己負責；本倉庫的 todo-db 與 pingpong-db 皆為單副本，節點故障即停機，要高可用須自己做複寫。

### 備份及其易用性

- DBaaS
  - 優點：自動排程備份、時間點還原（PITR）與跨區複本皆內建；還原是一鍵操作，不用寫 Job；備份保留期與加密由雲端管理。
  - 缺點：備份儲存與還原操作也要付費；還原選項與速度受供應商限制。
- 自行架設（DIY）
  - 優點：備份排程、位置與保留期完全自定；可以只備份需要的資料庫。
  - 缺點：要自己建立與維護備份流程：本倉庫至今沒有資料庫備份（2.9 的 CronJob 只產生待辦），要寫 CronJob 跑 pg_dump、把備份檔送到物件儲存（例如 GCS，見 3.10）並定期測試還原；忘記做或做錯，還原時才發現。

### 結論

這個待辦專案規模小、資料不重要，用自行架設最划算：免費、設定全在倉庫、不用開雲端帳戶。若是生產環境、資料丟失成本高，DBaaS 更划算：自動備份與高可用省下的維護工作，值得付服務費。
