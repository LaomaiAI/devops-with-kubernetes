# message-receiver

Exercise 4.6 的 Generic 接收端：模擬外部服務（Discord／Telegram／Slack 的 Generic 替代），記錄 broadcaster 轉發的訊息，方便驗證「恰好一次傳送」。

- `POST /`：記錄 `{receivedAt, messageId, user, message}`，回 200 `{"status":"ok"}`；無效 JSON 回 400。
- `GET /received`：回傳全部記錄（驗證用）。
- `GET /healthz`：回 `OK`；`GET /`：回 `{service, receivedCount}`。
- 部署：`replicas: 1`，Service（ClusterIP，80 → 3000）；只留在叢集內，無 Ingress。

## Exercise 4.6 驗證（2026-11-13）

- `GET /received` 共 6 條：新建 3 條（待辦 id 11、12、13）、CronJob 新建 1 條（id 14）、更新 2 條（id 11、12 設為完成）；`messageId` 6 個全部不同，無重複；內容格式為 `A todo was created/updated: <todo> (id <id>, done/not done)`。
