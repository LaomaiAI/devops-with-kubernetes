# Todo backend
GET /todos 回傳待辦清單（JSON，{id, todo}），POST /todos 新增待辦（JSON {"todo": "..."} 或表單 todo 欄位），空內容回 400。
記憶體儲存（2.2），重啟後回到初始三筆待辦；2.8 改用 Postgres。
部署：docker build -t todo-backend:latest .；k3d image import todo-backend:latest -c k3s-default；kubectl apply -f manifests/。

## Exercise 2.6

All configuration (PORT) is passed in through environment variables from the ConfigMap `todo-backend-config` (see `manifests/configmap.yaml`). The source code contains no hard-coded port.

## Exercise 2.8

Todos are stored in Postgres, running as a StatefulSet (`todo-db`, 1 replica) with a 1Gi persistent volume (`local-path` storage class). The backend creates the `todos` table on startup and seeds the original three todos when the table is empty.
Connection settings come from the ConfigMap `todo-backend-config` and the password from the Secret `todo-db-secret`. Deleting the todo-backend Pod does not lose the todos.
Note: the Postgres image is pulled from Docker Hub by the kubelet (`imagePullPolicy: IfNotPresent`); `k3d image import` fails for this multi-architecture image in this environment.

## Exercise 2.9

A CronJob (`todo-generator`, schedule `0 * * * *`) creates a new todo every hour: `Read <URL>` with a random Wikipedia article URL. It requests `https://en.wikipedia.org/wiki/Special:Random` and uses the `location` header of the redirect (adding the `https:` scheme when it is protocol-relative), then POSTs the todo to the backend. The job uses the `curlimages/curl` image (pulled from Docker Hub by the kubelet, `imagePullPolicy: IfNotPresent`).
Verified by running a manual Job (`kubectl create job --from=cronjob/todo-generator`): it created the todo `Read https://en.wikipedia.org/wiki/H%C3%A9jek_(surname)`.

## Exercise 2.10

後端記錄每個請求，並限制待辦長度上限為 140 個字元。
— `GET /todos` 記錄回傳的待辦數量。
— `POST /todos` 記錄建立的待辦（id 與內容）；空內容或超長內容則記錄拒絕原因。
— 超過 140 個字元的待辦回 `400 {"error": "Todo too long: maximum 140 characters"}`，不會寫入資料庫。
— 驗證（2026-11-13）：以 141 個字元的待辦 POST 到後端，回 `400`，日誌出現 `Todo rejected: too long, length 141, maximum 140, todo: xxx...`。
— 後端日誌由 monitoring 命名空間的 Alloy 收集，經 Loki 儲存；可在 Grafana 以查詢 `{namespace="project"} |= "Todo rejected"` 查到（直接查 Loki API 時帶 `X-Scope-OrgID: 1` 標頭）。

## Exercise 4.5
待辦加 `done` 欄位（`boolean not null default false`）：建表時在 `CREATE TABLE` 加入該欄；既有表在啟動時以 `ALTER TABLE todos ADD COLUMN IF NOT EXISTS done boolean NOT NULL DEFAULT false` 遷移。`GET /todos` 與 `POST /todos` 回傳的物件含 `done`。
新增 `PUT /todos/<id>`：body 為 `{"done": <布林值>}` 時把該待辦設為該值；沒有 body 或沒有 `done` 欄位時切換現值。id 不是數字回 `400 {"error": "Invalid todo id"}`；id 不存在回 `404 {"error": "Todo not found"}`；成功回 200 與更新後的物件。
驗證（2026-11-13）：部署後 `GET /todos` 中既有待辦（包括種子三筆與 CronJob 產生的 Wikipedia 條目）皆為 `done: false`。`PUT /todos/1 {"done": true}` 回 200 及 `done: true`，再查 `GET /todos` 已持久化；無 body 的 `PUT /todos/1` 把它切回 `done: false`；`PUT /todos/99999` 回 404，`PUT /todos/abc` 回 400。

## Exercise 4.6

todo-backend 以 NATS 用戶端（`nats` 套件）連接 `NATS_URL`（`nats://my-nats.nats.svc.cluster.local:4222`），不阻塞啟動（背景無限重試，每 2 秒一次）；建立待辦（`POST /todos`）與更新待辦（`PUT /todos/<id>`）時，向 `todos` 主題發佈事件 `{messageId, event, id, todo, done, at}`（`messageId` 為隨機 UUID，供接收端去重）；未連線時跳過發佈（只記錄），不影響待辦的儲存。

驗證（2026-11-13）：日誌共 6 次 `Published to NATS`（3 次新建、1 次 CronJob 新建、2 次更新），與 message-receiver 收到的 6 條訊息一致。
