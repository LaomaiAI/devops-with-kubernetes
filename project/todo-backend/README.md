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
