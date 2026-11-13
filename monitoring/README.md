# Monitoring

以 Helm 在 `monitoring` 命名空間安裝 Prometheus、Loki、k8smon（Grafana Alloy）與 Grafana。

## 安裝

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
kubectl create namespace monitoring
helm upgrade --install prom prometheus-community/prometheus --namespace monitoring --create-namespace --values monitoring/prom-values.yaml
helm upgrade --install loki grafana/loki --namespace monitoring --values monitoring/loki-values.yaml
helm upgrade --install k8smon grafana/k8s-monitoring --namespace monitoring --values monitoring/k8smon-values.yaml
helm upgrade --install grafana grafana/grafana --namespace monitoring --values monitoring/grafana-values.yaml
```

## Values 檔

— `prom-values.yaml`：停用 Alertmanager 與 Pushgateway，`server.remoteWrite` 為空。
— `loki-values.yaml`：SingleBinary 模式，1 副本，`replication_factor: 1`，檔案系統儲存。另將 `chunksCache.allocatedMemory` 由預設 8192 改為 128。
— 預設值要求約 9830Mi 記憶體，多於本集群任一節點的約 7.75GiB，`loki-chunks-cache-0` 因此永遠無法排程（`Insufficient memory`）；改為 128 後可正常運行。
— `k8smon-values.yaml`：集群名稱 `my-cluster`，日誌經 Alloy（`filesystem-log-reader`）送到 Loki（租戶 `1`）。
— `grafana-values.yaml`：管理員帳號 `admin`／密碼 `admin`；數據源為 Prometheus（預設）與 Loki（查詢時帶 `X-Scope-OrgID: 1`）。

## 驗證（2026-11-13）

— 全部監控 Pod 皆 Running，包括 `loki-chunks-cache-0` 2/2。
— `kubectl port-forward -n monitoring svc/grafana 3000:80` 後，`http://localhost:3000/api/health` 回 `{"database": "ok", ...}`；以 `admin`／`admin` 查 `/api/datasources`，可見 Prometheus 與 Loki。
— Loki 查詢 `{namespace="project"} |= "Todo rejected"` 回傳後端的拒絕記錄。
— Prometheus 查詢 `count(kube_pod_info)` 回 34。

注意：圖表版本行為——`prom-values.yaml` 雖停用 Pushgateway，圖表仍建立並運行 `prom-prometheus-pushgateway`；不影響監控功能。

## Exercise 4.3

4.3 的答案是 Prometheus 查詢字串（不是倉庫連結）。Prometheus 經 port-forward 暴露：`kubectl port-forward svc/prom-prometheus-server -n monitoring 9090:80`，再於 http://localhost:9090 查詢。

查詢：`count(kube_pod_info{created_by_kind="StatefulSet", namespace="monitoring"})`

驗證（2026-11-13）：該查詢回 `3`，即 monitoring 命名空間內三個 StatefulSet Pod：`loki-0`、`loki-chunks-cache-0`、`loki-results-cache-0`。不加命名空間篩選時總數為 5（另外兩個是 exercises 的 `pingpong-db-0` 與 project 的 `todo-db-0`），故命名空間篩選不可少。題目所說的「prometheus namespace」即 Prometheus 所在的 monitoring 命名空間。
