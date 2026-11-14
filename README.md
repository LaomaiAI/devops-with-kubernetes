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
- Ingress：k3s 內置 Traefik（ingressClassName: traefik），主機名 project.local / logoutput.local，經 localhost:8080（k3d 以 --port 8080:80@loadbalancer 映射）測試

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
- 2026-11-14 03:22-03:33 UTC 再次複查：picsum.photos 仍無法連通（宿主 curl 回 000；project Pod 內 wget 10 秒逾時，exit 1）；恢復 project 生產堆疊後，/image.jpg 回 503（應用自身回應 Image unavailable，18 字節），PVC 仍為空；代碼未改。
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

## Part 5（Chapter 6）練習

- 5.1 DIY CRD & controller：DummySite CRD（spec.website_url）與 Node.js 控制器（零依賴，直接呼叫 Kubernetes API）；為每個 DummySite 建立 Deployment（init container 下載網站）／Service／Ingress（DummySite 名稱.dummysite.local）；以 example.com 驗證，經 Ingress 取回 Example Domain 頁面。
- 5.2 Istio ambient 入門：以 istioctl 1.32.0 安裝 Istio（profile=ambient、global.platform=k3d），default 命名空間標註 ambient；部署 bookinfo 範例（6 個 Pod），經 Gateway API Gateway + HTTPRoute 從外部存取 productpage（HTTP 200，Simple Bookstore App）；恢復 Prometheus 並以 Helm 安裝 Kiali v2.34.1（Prometheus 位址 http://prom-prometheus-server.monitoring:80，控制台 /kiali/ 回 200，流量圖顯示 productpage）。安裝期間須修兩個問題（詳見 istio/README.md）：agent-0 的 containerd 內容庫損壞與 istio-cni 外掛裝錯目錄。
- 5.3 Log app, Service Mesh Edition：greeter 服務兩個版本（GREETING 環境變數）以 Service + HTTPRoute 分流（v1 權重 75、v2 權重 25）；log-output 以 GREETER_URL 經 greeter-svc 取問候，狀態頁顯示 greetings 行；exercises 命名空間為 ambient 模式，Service 掛載的 HTTPRoute 須有 waypoint 代理才生效（istioctl waypoint apply -n exercises，並為 greeter-svc 標註 istio.io/use-waypoint=waypoint；未標註時路由狀態顯示 route will not be respected）。40 次請求實測 v1 28 次、v2 12 次，約 75/25；Kiali 流量圖顯示 greeter、waypoint、log-output、pingpong、pingpong-db。清單在設定倉庫 greeter/manifests/ 與 log-output/manifests/（Gateway、HTTPRoute）。
- 5.4 Wikipedia with init and sidecar: Deployment（init container 以 curl 下載 https://en.wikipedia.org/wiki/Kubernetes 至 emptyDir 共享卷，主容器 nginx:alpine 提供該卷；sidecar 隨機等待 5-15 分鐘後下載 https://en.wikipedia.org/wiki/Special:Random 覆寫同一檔案，完成後重啟再等；命名空間 exercises；readinessProbe 為 GET /）。驗證：init 完成後 nginx 提供標題 Kubernetes - Wikipedia（597986 字節）；sidecar 首輪於 2026-11-14 約 03:30 UTC 換頁，標題變為 Marek Jan Chodakiewicz - Wikipedia。清單在設定倉庫 wikipedia/manifests/。
- 5.5 Platform comparison: 文字答案（限 150 詞），選 Rancher 優於 OpenShift：Rancher 免費開源、輕量、可管理任何 Kubernetes 集群；OpenShift 為自家發行版、須 Red Hat 訂閱、較重且意見較強；已於平台提交 1/1。
- 5.6 Trying serverless：為 Knative 建立新 k3d 集群 knative（k3s v1.35.5，停用 Traefik，埠 8081:80@loadbalancer、8082:30080@agent:0），裝 Knative Serving v1.24.0、Kourier 與 Magic DNS。課程命令的 k3s v1.34.1 不被 Knative 1.24 接受（要求 Kubernetes ≥ 1.35.0），故改用 v1.35.5-k3s1（主集群同款映像，已快取）。驗證：hello 服務回 Hello World（HTTP 200，冷啟動 3.19 秒）；閒置後縮至零、請求時由零擴展；第二版本回 Hello Knative；50/50 流量拆分 12 次請求恰為 6/6。主集群 k3s-default 已停（狀態保留，日後可用 k3d cluster start 恢復）。
- 5.7 Deploy to serverless：Ping-pong 改為 Knative Service（pingpong:latest、imagePullPolicy: Never、最小副本 1；log-output 的 PINGPONG_URL 改為完整 FQDN http://pingpong.exercises.svc.cluster.local/count）。驗證：經 Kourier（Host: pingpong.exercises.172.19.0.2.sslip.io，localhost:8081）依次回 pong 0、pong 1、pong 2、pong 3，/count 回 4，狀態頁顯示 Ping / Pongs: 4。Kourier 不處理標準 Ingress，課程提示的 URL 改寫規則無法實現（詳見 knative/README.md）。
- 5.8 Landscape: 文字答案（限 150 詞），按課程指引列出用過的產品：Kubernetes、k3d、k3s、Docker、containerd、Helm、Prometheus、Grafana、Loki、ArgoCD、Kustomize、Istio、Kiali、Traefik、Envoy Gateway、NGINX、PostgreSQL、Node.js、GitHub Actions；間接使用 Flannel、Envoy、CoreDNS、etcd；已於平台提交 1/1。

## 習題連結（Chapter 6：每題連結至該 release）

- [5.1](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/5.1) - DIY CRD & controller
- [5.2](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/5.2) - Istio ambient 入門（bookinfo + Kiali）
- [5.3](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/5.3) - Log app, Service Mesh Edition（greeter 分流 75/25 + waypoint）
- [5.4](https://github.com/LaomaiAI/devops-with-kubernetes/releases/tag/5.4) - Wikipedia with init and sidecar（設定倉庫 release：[5.4](https://github.com/LaomaiAI/devops-with-kubernetes-config/releases/tag/5.4)）

## 運行事件記錄（2026-11-13 至 2026-11-14）

- Traefik 曾故障並多次重啟（重啟 26 次）；Gateway 專用集群已於 2026-11-13 19:53 UTC 刪除，相關暴露改回主集群的 Traefik Ingress。
- 2026-11-13 集群曾出現 I/O 風暴（2 核負載逾 50、多個進程處於 D-state、kubectl 間歇 TLS 超時），重啟 Codespace 後平息；監控堆疊（Prometheus、Loki、Alloy）曾暫停至 0 副本；2026-11-14 為 Kiali 恢復 Prometheus Server 至 1 副本，Alloy、loki-canary、node-exporter DaemonSet 已刪除。
- log-output Application 長期為 Progressing：Deployment 0/1 就緒（Pod 1/2 容器就緒）。原因已查：reader 的 readiness probe 是 GET /healthz，而 /healthz 在 pingpong 不通時回 500，令 Pod 停在 1/2；2026-11-14 資料庫復原、環境變數修正後 log-output 恢復 2/2 就緒。
- 2026-11-14 Istio 安裝期間負載再次飆升（2 核負載逾 50、多個進程處於 D-state），編輯器連不上（deadline exceeded），經 Codespaces 頁面完全停止再啟動後恢復；agent-0 的 containerd 內容庫損壞（pause 映像層缺失），在該節點重拉 rancher/mirrored-pause:3.6 修復；Istio 1.32 的 k3d 預設把 istio-cni 外掛裝進 /bin，須手動複製 binary 至 /var/lib/rancher/k3s/data/cni（三節點）；恢復全量應用（ArgoCD）後負載再度飆升，應用已再次暫停至 0 副本，待 5.3 再逐項恢復；README 第 18 行曾多出一個「80」錯字，已修正。
- 2026-11-14 Codespace 兩度自行停止（編輯器連不上，deadline exceeded；GitHub 狀態頁顯示全部系統正常），經 Codespaces 頁面完全停止再以 Restart codespace 重新啟動後恢復；其後 agent-0 的 containerd 再次崩潰（containerd exited: exit status 2），節點陷入重啟循環，已停止該容器，集群現以 server-0 與 agent-1 兩個節點運行（機器負載隨即由約 10 降至 2.2）。
- 2026-11-14 pingpong-db 的 local-path PV 固定於已停的 agent-0，Pod 無法排程，刪除 PVC 重建後資料庫在健康節點上重新初始化（計數由 0 重新累計）；5.3 時 GREETER_URL 曾以錯誤縮排插入 deployment.yaml，使 PINGPONG_URL 失去值（YAML 重複鍵以後者為準，GREETER_URL 指向了 pingpong），已修正並重新部署。
- 2026-11-14 03:24 UTC 恢復 project 命名空間生產堆疊（以 Kustomize production overlay 套用）：原先 Deployment 全無、todo-db 為 0/0；todo-db PVC 的 PV 以 node affinity 固定於已停的 agent-0，刪 PVC 重建後 Postgres 重新初始化（待辦清空為預設三項）；broadcaster 與 message-receiver 映像缺失（ErrImageNeverPull），重建並匯入集群後恢復 6/6 與 1/1；project 三副本因 /healthz 依賴 todo-backend、liveness probe 連續以 137 終止容器，todo-db 就緒後回穩（3/3 1/1）。
- 2026-11-14 約 03:30 UTC wikipedia sidecar 完成首輪隨機等待並換頁：標題由 Kubernetes - Wikipedia 變為 Marek Jan Chodakiewicz - Wikipedia。

- 2026-11-14 主 Codespace 再次 CPU 100%（終端機 Pty 無回應、新殼層逾 4 分鐘未啟動）；經 Codespaces 頁面停止再重啟（04:14 至 04:23 UTC）恢復，隨即以 k3d cluster stop k3s-default 停主集群，負載回落。
- 2026-11-14 為 5.6 建立 Knative 集群 knative（k3s v1.35.5，Knative Serving v1.24.0、Kourier、Magic DNS）：課程命令的 k3s v1.34.1-k3s1 令 Knative 1.24 的 controller/webhook/activator/autoscaler 全部 CrashLoopBackOff（版本檢查要求 Kubernetes ≥ 1.35.0；default-domain Job 亦因 webhook 無端點而失敗）；刪集群後改用 v1.35.5-k3s1 重建，全部 Pod 1/1 Running，Magic DNS 網域為 172.19.0.2.sslip.io。- 2026-11-14 Knative 集群部署 pingpong 為 Serverless：config-deployment 加入 registriesSkippingTagResolving: index.docker.io（本機映像 tag 無法解析為 digest，Revision 報 ContainerMissing）；映像重匯一次後三節點皆有 pingpong:latest（初次匯入只到部分節點，agent-0 的 Pod 卡在 ErrImageNeverPull）。
- 2026-11-14 Kourier（Knative 1.24）不處理標準 Kubernetes Ingress：以 kubernetes.io/ingress.class: kourier 建的 Ingress 逾 10 分鐘仍無 ADDRESS，logoutput.local 與 pingpong.local 皆回 404；控制器日誌只對帳 Knative 內部 Ingress，Ingress 已刪除。
