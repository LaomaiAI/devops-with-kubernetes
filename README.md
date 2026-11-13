# DevOps with Kubernetes

赫爾辛基大學 DevOps with Kubernetes 課程練習倉庫。

部分練習使用了 AI 工具輔助。

## 課程

- 課程：DevOps with Kubernetes, 2026（courses.mooc.fi）
- 學分：5 ECTS；期限：2027 年 1 月 31 日；以練習計分，無期末考
- 完成方式：每章練習以 GitHub release 提交，詳見各章習題

## 環境（只用免費方案）

- GitHub Codespace（免費額度內使用），未使用付費雲服務、未綁定信用卡、未註冊新帳戶
- 本地集群：k3d（k3s v1.35.5）+ kubectl v1.37.2 + Docker 29.9.2
- 建立集群：k3d cluster create --port 8080:80@loadbalancer --port 8081:80@loadbalancer --agents 2
- Ingress：k3s 內置 Traefik（ingressClassName: traefik），主機名 project.local / logoutput.local，經 localhost:8080（k3d 以 --port 8080:80@loadbalancer 映射）80 測試

## Part 1（Chapter 2）練習

- 1.1 Log output：啟動時產生隨機字串，每 5 秒輸出時間戳 + 字串（kubectl logs 驗證）
- 1.2/1.4 Project：Web 伺服器輸出 Server started in port 3000，部署清單在設定倉庫 project/manifests/deployment.yaml
- 1.3 Log output 宣告式部署：設定倉庫 log-output/manifests/deployment.yaml
- 1.5 Project 回應 HTML；1.6 Project NodePort 服務（已於 1.8 改為 ClusterIP + Ingress）
- 1.7 Log output 端點 + Ingress；1.8 Project Ingress
- 1.9 Ping-pong：回應 pong 0、pong 1、pong 2，與 log-output 共用 Ingress（路徑 /pingpong）
- 1.10 Log output 拆為 writer / reader 兩個容器，共用 emptyDir 卷
- 1.11 以 PVC（local-path，100Mi，ReadWriteOnce）共享 ping-pong 計數，log-output 顯示 .Ping/ Pongs:N；刪除 ping-pong Pod 後計數由 3 繼續
- 1.12 Project 每小時圖片：從 https://picsum.photos/1200 抓取，快取於 PVC（project-files）10 分鐘，經 /image.jpg 提供
- 1.13 Project 待辦：輸入框上限 140 字、Send 按鈕、硬編待辦清單

## 已知限制：1.12 圖片來源

- 2026-11-13 在此 Codespace 測試時，picsum.photos 完全無法連通（宿主 curl 回傳 000、Pod 內 fetch 回傳 522），其他圖片網站（如 Google 標誌）可正常下載。
- 2026-11-13 約 13:12 UTC（集群重建後，default 命名空間）重新請求 /image.jpg 仍為 503（Image unavailable），PVC 內 /usr/src/app/files/ 為空（total 0）。
- 2026-11-13 約 13:49 UTC（移入 project 命名空間後）再次複查：/image.jpg 仍為 503，PVC 仍為空。代碼未改。
- 程式預設仍按課程要求抓取 https://picsum.photos/1200，抓取失敗時回 503；快取邏輯已在本地以可用的圖片 URL 驗證：兩次請求檔案大小同為 13504 字節、MD5 完全相同。
- 待 picsum 恢復後，只需重新請求 /image.jpg 即可取得圖片並寫入 PVC。

## 各應用

- log-output/：Node.js，MODE=both / writer / reader
- project/：Node.js，PORT 預設 3000
- pingpong/：Node.js，計數寫入 COUNT_PATH（預設 /usr/src/app/files/pingpong.txt）

## 習題連結（每題連結至該 release 的相應應用版本）

- [1.1](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.1/log-output) — log-output
- [1.2](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.2/project) — project
- [1.3](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.3/log-output) — log-output（宣告式部署）
- [1.4](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.4/project) — project（宣告式部署）
- [1.5](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.5/project) — project（HTML）
- [1.6](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.6/project) — project（NodePort）
- [1.7](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.7/log-output) — log-output（Ingress）
- [1.8](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.8/project) — project（Ingress）
- [1.9](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.9/pingpong) — pingpong
- [1.10](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.10/log-output) — log-output（雙容器）
- [1.11](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.11/log-output) — log-output（共享 PVC，另見 pingpong）
- [1.12](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.12/project) — project（每小時圖片）
- [1.13](https://github.com/LaomaiAI/devops-with-kubernetes/tree/1.13/project) — project（待辦清單）

## Part 2（Chapter 3）練習

- 2.1 Log output 與 Ping pong 改以 HTTP 溝通（PINGPONG_URL），計數不再共用檔案；Ping pong 計數改為記憶體計數
- 2.2 新增 todo-backend（記憶體待辦），project 首頁表單經 POST /todos 轉發後端
- 2.3 Log output 與 Ping pong 移入命名空間 exercises
- 2.4 project 與 todo-backend 移入命名空間 project
- 2.5 Log output 經 ConfigMap 傳入 MESSAGE 與 information.txt
- 2.6 project 與 todo-backend 的設定全部改由 ConfigMap（環境變數）傳入，移除寫死設定
- 2.7 Ping pong 計數存入 Postgres（StatefulSet pingpong-db），刪除 Pod 後計數仍存活
- 2.8 待辦存入 Postgres（StatefulSet todo-db），刪除 todo-backend Pod 後待辦仍存活
- 2.9 新增 CronJob todo-generator（每小時），從 Wikipedia 隨機條目產生待辦
- 2.10 todo-backend 加入請求記錄與 140 字元上限（超長回 400）；以 Helm 安裝 Prometheus、Loki、k8smon（Alloy）與 Grafana，拒絕記錄可在 Grafana／Loki 查到

## 習題連結（Chapter 3：每題連結至該 release）

- [2.1](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/2.1) – Log output 與 Ping pong 以 HTTP 溝通
- [2.2](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/2.2) – todo-backend（記憶體待辦）
- [2.3](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/2.3) – 命名空間 exercises
- [2.4](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/2.4) – 命名空間 project
- [2.5](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/2.5) – ConfigMap（Log output）
- [2.6](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/2.6) – ConfigMap（project 與 todo-backend）
- [2.7](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/2.7) – Postgres（Ping pong 計數）
- [2.8](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/2.8) – Postgres（待辦）
- [2.9](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/2.9) – CronJob todo-generator
- [2.10](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/2.10) – 請求記錄、140 字元上限與監控

## Part 3（Chapter 4）練習

- 3.3 Log output 與 Ping pong 曾改以 Gateway API 暴露（k3d + Envoy Gateway，Gateway 專用集群），不再用 Ingress；該專用集群已於 2026-11-13 刪除，主集群仍以 Traefik Ingress 暴露
- 3.4 Ping pong 移除 `/pingpong` 路由，路徑重寫由集群層負責（Gateway：HTTPRoute URLRewrite；主集群：Traefik Middleware stripPrefix）
- 3.9 DBaaS（Google Cloud SQL）與自行架設 Postgres 的優缺點比較，寫進 project README（初始化工作與成本、維護、備份）
- 3.11 為專案設定資源 requests 與 limits（以 kubectl top pods 量度）
- 未完成：3.1、3.2、3.5、3.6、3.7、3.8、3.10、3.12 須用 GKE（Google Cloud 試用須綁卡），未開通，故未做

## 習題連結（Chapter 4：每題連結至該 release）

- [3.3](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/3.3) - Gateway API（Envoy Gateway）
- [3.4](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/3.4) - 路由重寫
- [3.9](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/3.9) - DBaaS 與自行架設比較
- [3.11](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/3.11) - 資源 requests 與 limits

## Part 4（Chapter 5）練習

- 4.1 Readines probe：為應用加入 readiness probe
- 4.2 The project, step 21
- 4.3 Prometheus
- 4.4 Your canary：金絲雀部署
- 4.5 The project, step 22
- 4.6 The project, step 23：訊息系統
- 4.7 Baby steps to GitOps：以 ArgoCD 管理 log-output，提交即自動同步
- 4.8 The project, step 24：project 改以 GitOps 部署；修正 ArgoCD directory exclude，令 package.json 不被誤作清單
- 4.9 The project, step 25：Kustomize base 加 staging / production overlays（staging broadcaster 只記錄不轉發、staging 不備份資料庫、生產 3 副本）；NATS 主題按環境隔離；每日 02:00 備份 todo-db
- 4.10 The project, the grande finale：程式碼與部署設定分倉；部署設定（ArgoCD Application、Kubernetes 清單、Kustomize）移至設定倉庫 https://github.com/LaomaiAI/devops-with-kubernetes-config，程式碼留於本倉庫；集群的 Application 已改指設定倉庫，production 跟隨設定倉庫的 tag 4.10

## 習題連結（Chapter 5：每題連結至該 release）

- [4.1](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/4.1) - Readines probe
- [4.2](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/4.2) - The project, step 21
- [4.3](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/4.3) - Prometheus
- [4.4](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/4.4) - Your canary
- [4.5](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/4.5) - The project, step 22
- [4.6](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/4.6) - The project, step 23
- [4.7](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/4.7) - Baby steps to GitOps
- [4.8](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/4.8) - The project, step 24
- [4.9](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/4.9) - The project, step 25
- [4.10](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/4.10) - The project, the grande finale（設定倉庫 release：[4.10](https://github.com/LaomaiAI/devops-with-kubernetes-config/releases/tag/4.10)）

## 運行事件記錄（2026-11-13）

- Traefik 曾故障並多次重啟（重啟 26 次）；Gateway 專用集群已於 2026-11-13 19:53 UTC 刪除，相關暴露改回主集群的 Traefik Ingress。
- 2026-11-13 集群曾出現 I/O 風暴（2 核負載逾 50、多個進程處於 D-state、kubectl 間歇 TLS 超時），重啟 Codespace 後平息；監控堆疊（Prometheus、Loki、Alloy）暫停至 0 副本。
- log-output Application 長期為 Progressing：Deployment 0/1 就緒（Pod 1/2 容器就緒），原因未查。
