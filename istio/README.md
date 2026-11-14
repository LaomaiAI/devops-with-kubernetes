# Istio（5.2）

Istio 1.32.0（ambient 模式）安裝於 k3d 集群（k3s v1.35.5），用於課程第 6 章 5.2（Service Mesh）。

## 安裝

下載 istioctl（1.32.0，明定版本）：

    curl -sL https://istio.io/downloadIstio | ISTIO_VERSION=1.32.0 sh -

安裝前檢查：

    /tmp/istio-1.32.0/bin/istioctl x precheck

安裝（ambient 模式、k3d 平台預設）：

    /tmp/istio-1.32.0/bin/istioctl install --set profile=ambient --set values.global.platform=k3d -y

安裝結果（2026-11-14 00:46 UTC，第二次執行冪等確認）：Istio core installed、CNI installed、Ztunnel installed、Istiod installed，Installation complete。

## 安裝時遇到的兩個問題

1. agent-0 的 containerd 內容庫損壞：pause 映像 rancher/mirrored-pause:3.6 的層 sha256:fbe1a72f… 在內容庫中缺失，Pod 沙盒建立失敗（FailedCreatePodSandbox，x11）。修復：在 agent-0 執行 docker exec k3d-k3s-default-agent-0 crictl pull rancher/mirrored-pause:3.6，重拉缺失的層。

2. istio-cni 外掛裝錯目錄：Istio 1.32 的 k3d 預設把 istio-cni 外掛裝進節點的 /bin/istio-cni，但 k3s 的 containerd 只在 /var/lib/rancher/k3s/data/cni 找外掛，ztunnel 沙盒因此失敗（failed to find plugin "istio-cni" in path [/var/lib/rancher/k3s/data/cni]）。修復：在三個節點把 binary 複製進 containerd 的 CNI 目錄：docker exec k3d-k3s-default-<node> cp /bin/istio-cni /var/lib/rancher/k3s/data/cni/istio-cni（集群重建後須再做一次）。

## bookinfo 範例應用

default 命名空間掛入 ambient 網格：

    kubectl label namespace default istio.io/dataplane-mode=ambient

部署：

    kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.32/samples/bookinfo/platform/kube/bookinfo.yaml
    kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.32/samples/bookinfo/gateway-api/bookinfo-gateway.yaml

Gateway（Gateway API，class istio）在 default 命名空間建立 bookinfo-gateway-istio Deployment（1/1）與 LoadBalancer Service；以 port-forward 存取（k3d 已佔用本地 8080，改用 8082）：

    nohup kubectl port-forward svc/bookinfo-gateway-istio 8082:80 > /tmp/pf-bookinfo.log 2>&1 &

驗證（2026-11-14 00:53 UTC）：

    curl -s http://localhost:8082/productpage

得 HTTP 200、15068 字節、頁面含「Simple Bookstore App」。

## Kiali 與 Prometheus

監控堆疊於 2.10 安裝（Helm），為減載曾暫停；為 5.2 恢復 Prometheus Server 至 1 副本（其餘不動）：

    kubectl -n monitoring scale deploy prom-prometheus-server --replicas=1

（Alloy、loki-canary、node-exporter DaemonSet 已於 2026-11-14 刪除，不再恢復；Kiali 只需 Prometheus。）

以 Helm 安裝 Kiali v2.34.1（anonymous 認證、Prometheus 位址按課程要求設定）：

    helm repo add kiali https://kiali.org/helm-charts
    helm install kiali-server kiali/kiali-server --namespace istio-system --set auth.strategy=anonymous --set external_services.prometheus.url=http://prom-prometheus-server.monitoring:80

驗證（2026-11-14 00:59 UTC）：Kiali Pod 1/1 Running；port-forward 20001 後，根路徑 302 導向 /kiali/（HTTP 200，標題 Kiali）；namespaces graph API（default、versionedApp、600s）回 200，圖含 productpage、productpage-v1、productpage.default.svc.cluster.local。

## 目前狀態（2026-11-14 01:05 UTC）

- Istio、bookinfo、Prometheus、Kiali 正常運行；應用（ArgoCD 與 project／project-staging／exercises 各部署）曾兩度在恢復全量後令 2 核負載飆升（逾 50），已再次暫停至 0 副本，待 5.3 再逐項恢復。
- istioctl 位置：/tmp/istio-1.32.0/bin/istioctl（Codespace 停止後 /tmp 會清空，重裝時須重下）。
