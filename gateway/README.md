# Gateway API（練習 3.3）

Log output 與 Ping pong 改以 Gateway API 暴露，不再用 Ingress。

## 集群

教材的 GKE 路徑用 `gke-l7-gxlb` GatewayClass；本倉庫在本地以 k3d + Envoy Gateway 實作（教材同一節的 k3d 說明）。

建立 Gateway 專用集群（主集群 `k3s-default` 仍保留 Traefik，本集群停用 Traefik）：
```bash
k3d cluster create gateway --agents 2 -p 8083:80@loadbalancer --port 8084:30080@agent:0 --k3s-arg '--disable=traefik@server:0'
```

主機連接埠 8080／8081 已由主集群佔用，故 Gateway 集群用 8083 映射 LoadBalancer 的 80；另設的 8084（對應 agent 的 30080）未被使用：本安裝的 Envoy 服務 nodePort 是 30112，流量實際經 LoadBalancer 走 8083。

安裝 Envoy Gateway（yaml 安裝，含 Gateway API CRD 與控制器）：
```bash
kubectl --context k3d-gateway apply --server-side -f https://github.com/envoyproxy/gateway/releases/latest/download/install.yaml
```

GatewayClass（安裝清單不會建立，需自行建立）：
- `manifests/gatewayclass.yaml`：`eg`，controllerName `gateway.envoyproxy.io/gatewayclass-controller`。

## 路由

- `manifests/gateway.yaml`：Gateway `my-gateway`（命名空間 `exercises`），`gatewayClassName: eg`，監聽 HTTP 80。
- `manifests/route.yaml`：HTTPRoute `my-route`，`/pingpong` 指向 pingpong 服務，`/` 指向 log-output 服務。

應用部署：沿用 `log-output/manifests/` 與 `pingpong/manifests/`（命名空間 `exercises`，Postgres 用 StatefulSet），不套用 `log-output/manifests/ingress.yaml`（由 Gateway 取代）。

## 驗證（2026-11-13）

- Gateway `my-gateway` 狀態 PROGRAMMED True，ADDRESS 172.19.0.3；GatewayClass `eg` ACCEPTED True。
- Envoy 代理位於 `envoy-gateway-system` 命名空間（`envoy-exercises-my-gateway-*`，LoadBalancer 服務）。
- `curl http://localhost:8083/` 回 log-output 輸出（`Ping / Pongs: 0`）；`curl http://localhost:8083/pingpong` 回 `pong 0`；再請求一次後回 `pong 1`，首頁顯示 `Ping / Pongs: 2`。
