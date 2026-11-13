# DummySite 控制器（Exercise 5.1）

- 自訂資源 DummySite：API 群組 stable.dwk，版本 v1，欄位 spec.website_url（字串，必填）。
- 控制器（Node.js，零依賴，以內置 https 直接呼叫 Kubernetes API）：啟動時列出全部 DummySite 並逐一同步，其後以 watch 監看 ADDED / MODIFIED 事件；斷線後重新列出並繼續監看。
- 控制器為每個 DummySite 在其命名空間建立 Deployment、Service、Ingress：
  - Deployment：初始化容器以 curl 下載 website_url 到 emptyDir 卷，主容器 nginx:alpine 提供該卷；網站位址改變時更新 Deployment。
  - Service：ClusterIP，連接埠 80。
  - Ingress：Traefik，主機名 <name>.dummysite.local。
  - 三者皆設 ownerReferences，刪除 DummySite 時由垃圾收集器一併清理。
- 權限：ClusterRole（dummysites：get/list/watch；deployments、services、ingresses：get/list/watch/create/update/patch）綁定 ServiceAccount dummysite-controller-account。
- 套用順序：先套用 CRD、ServiceAccount、ClusterRole、ClusterRoleBinding，再套用控制器 Deployment，最後套用 DummySite。

## 驗證（2026-11-13 約 23:42–23:45 UTC）

- DummySite example（website_url: https://example.com/）：控制器日誌見 ADDED DummySite default/example，隨即建立 dummysite-example Deployment、Service、Ingress。
- 複本：Pod dummysite-example-5df79dd5b5-9dvd7 1/1 Running；初始化容器 curl 下載完成（Initialized: True）。
- 經 Ingress（Host: example.dummysite.local，http://localhost:8080/）取回 example.com 的 HTML（Example Domain），Endpoints 為 10.42.1.139:80。
