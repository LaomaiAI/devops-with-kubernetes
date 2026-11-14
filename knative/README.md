# Knative（5.6、5.7）

本目錄放 Knative 集群（k3d 集群 knative）的範例服務清單與相關記錄。安裝步驟見 Knative 官方文件（Install Serving with YAML）與課程 Beyond Kubernetes 一頁。

## 集群

建立（課程命令，命名 knative 以免覆蓋主集群 k3s-default）：
`k3d cluster create knative --port 8082:30080@agent:0 -p 8081:80@loadbalancer --agents 2 --k3s-arg "--disable=traefik@server:0" --image rancher/k3s:v1.35.5-k3s1`
注意：課程原文的映像為 rancher/k3s:v1.34.1-k3s1，但 Knative 1.24.0 的 controller/webhook 會以版本檢查拒絕 Kubernetes 1.34（要求至少 1.35.0），Pod 全部 CrashLoopBackOff；改用 v1.35.5-k3s1（主集群同款映像，已快取）後全部正常。
主集群已停：k3d cluster stop k3s-default（狀態與 PVC 保留，日後 k3d cluster start k3s-default 恢復），以免兩集群同時加重 2 核機器負荷。
當前上下文：kubectl config current-context 應為 k3d-knative。

## 安裝（Knative Serving v1.24.0）

1. CRDs：kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.24.0/serving-crds.yaml
2. 核心：kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.24.0/serving-core.yaml
3. Kourier：kubectl apply -f https://github.com/knative-extensions/net-kourier/releases/download/knative-v1.24.0/kourier.yaml
4. ingress-class：kubectl patch configmap/config-network --namespace knative-serving --type merge --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'
5. Magic DNS：kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.24.0/serving-default-domain.yaml
6. 驗證：kubectl get pods -n knative-serving（activator、autoscaler、controller、webhook 皆 1/1）與 kubectl get pods -n kourier-system（3scale-kourier-gateway 與 net-kourier-controller 皆 1/1）；kubectl get configmap config-domain -n knative-serving 顯示預設網域為 172.19.0.2.sslip.io（kourier LoadBalancer 第一個外部 IP；課程範例 IP 為 192.168.240.3，視集群而定）。

## 範例服務與驗證（5.6）

knative/hello.yaml：Knative Service hello（映像 ghcr.io/knative/helloworld-go:latest，TARGET=World）。
存取（主機經 k3d 負載平衡器 8081，以 Host 標頭指定服務網址）：
curl -H "Host: hello.default.172.19.0.2.sslip.io" http://localhost:8081
回應 Hello World!（HTTP 200；首請求冷啟動 3.19 秒）。
自動擴縮：閒置後 Pod 自動縮至零（kubectl get pods -l serving.knative.dev/service=hello 無資源）；再請求時由零擴展，新 Pod 2/2 Running。
流量拆分：改 TARGET=Knative 套用，產生第二版本 hello-00002（回 Hello Knative!），再以 spec.traffic 設最新版本與 hello-00001 各 50%，12 次請求恰為 Hello Knative! 6 次、Hello World! 6 次。
