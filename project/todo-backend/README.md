# Todo backend
GET /todos 回傳待辦清單（JSON，{id, todo}），POST /todos 新增待辦（JSON {"todo": "..."} 或表單 todo 欄位），空內容回 400。
記憶體儲存（2.2），重啟後回到初始三筆待辦；2.8 改用 Postgres。
部署：docker build -t todo-backend:latest .；k3d image import todo-backend:latest -c k3s-default；kubectl apply -f manifests/。

## Exercise 2.6

All configuration (PORT) is passed in through environment variables from the ConfigMap `todo-backend-config` (see `manifests/configmap.yaml`). The source code contains no hard-coded port.
