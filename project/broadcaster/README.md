# broadcaster

Exercise 4.6 的新服務：訂閱 NATS 的 `todos` 主題，把待辦事件轉發到外部服務（Generic 端點）。

## 設計

- 以 NATS queue group（`broadcaster`）訂閱：每條訊息只會送到群組內的一個副本，6 個副本不會重複傳送。
- 外部服務用 Generic 格式：POST `{"user":"bot","messageId":"<uuid>","message":"<文字>"}` 到 `BROADCAST_URL`（預設 `http://message-receiver/`，即叢集內的 message-receiver 服務，便於驗證恰好一次傳送）。
- 訊息格式：`A todo was created/updated: <todo> (id <id>, done/not done)`。
- 環境變數（`broadcaster-config` ConfigMap）：`NATS_URL`、`NATS_SUBJECT`（`todos`）、`NATS_QUEUE`（`broadcaster`）、`BROADCAST_URL`、`PORT`（3000）。
- 部署：`replicas: 6`、`imagePullPolicy: Never`、readinessProbe `GET /healthz`；Service（ClusterIP，80 → 3000）只供健康檢查用。
- NATS 伺服器以 Helm 安裝：`helm upgrade --install my-nats nats/nats --namespace nats --create-namespace`（命名空間 `nats`，StatefulSet `my-nats`，`nats://my-nats.nats.svc.cluster.local:4222`）。

## Exercise 4.6 驗證（2026-11-13）

- 日誌：`Connected to NATS at nats://my-nats.nats.svc.cluster.local:4222, subscribing to todos (queue broadcaster)`。
- 6 個副本共轉發 6 次，分佈為 1 / 0 / 2 / 0 / 2 / 1（6 條事件各由恰好一個副本轉發，無重複）。
- 事件：新建 3 條（待辦 id 11、12、13）、CronJob 新建 1 條（id 14，Wikipedia）、更新 2 條（id 11、12 設為完成）；message-receiver 收到的 6 條 `messageId` 全部不同。
- 備註：NATS exporter（port 7777）的 Prometheus 抓取未在本練習加入（練習要求是訊息傳送，監控整合不在範圍內）。
