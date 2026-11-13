# DevOps with Kubernetes

赫爾辛基大學 DevOps with Kubernetes 課程練習倉庫。

部分練習使用了 AI 工具輔助。

## 課程

- 課程：DevOps with Kubernetes, 2026（courses.mooc.fi）
- 學分：5 ECTS；期限：2027 年 1 月 31 日；以練習計分，無期末考
- 完成方式：每章練習以 GitHub release 提交，詳見各章習題

## 環境（只用免費方案）

- GitHub Codespace（免費額度內使用），未使用付費雲服務、未綁定信用卡、未註冊新帳戶
- 本地集群：k3d（k3s v1.35.5）+ kubectl v1.37.2 + Docker 29.9.2
- 建立集群：k3d cluster create --port 8080:80@loadbalancer --port 8081:80@loadbalancer --agents 2
- Ingress：k3s 內置 Traefik（ingressClassName: traefik），主機名 project.local / logoutput.local，經 localhost:8080 測試

## Part 1（Chapter 2）練習

- 1.1 Log output：啟動時產生隨機字串，每 5 秒輸出時間戳 + 字串（kubectl logs 驗證）
- 1.2/1.4 Project：Web 伺服器輸出 Server started in port 3000，部署清單在 project/manifests/deployment.yaml
- 1.3 Log output 宣告式部署：log-output/manifests/deployment.yaml
- 1.5 Project 回應 HTML；1.6 Project NodePort 服務（已於 1.8 改為 ClusterIP + Ingress）
- 1.7 Log output 端點 + Ingress；1.8 Project Ingress
- 1.9 Ping-pong：回應 pong 0、pong 1、pong 2，與 log-output 共用 Ingress（路徑 /pingpong）
- 1.10 Log output 拆為 writer / reader 兩個容器，共用 emptyDir 卷
- 1.11 以 PVC（local-path，100Mi，ReadWriteOnce）共享 ping-pong 計數，log-output 顯示 Ping / Pongs: N；刪除 ping-pong Pod 後計數由 3 繼續
- 1.12 Project 每小時圖片：從 https://picsum.photos/1200 抓取，快取於 PVC（project-files）10 分鐘，經 /image.jpg 提供
- 1.13 Project 待辦：輸入框上限 140 字、Send 按鈕、硬編待辦清單

## 已知限制：1.12 圖片來源

- 2026-11-13 在此 Codespace 測試時，picsum.photos 完全無法連通（宿主 curl 回傳 000、Pod 內 fetch 回傳 522），其他圖片網站（如 Google 標誌）可正常下載。
- 程式預設仍按課程要求抓取 https://picsum.photos/1200，抓取失敗時回 503；快取邏輯已在本地以可用的圖片 URL 驗證：兩次請求檔案大小同為 13504 字節、MD5 完全相同。
- 待 picsum 恢復後，只需重新請求 /image.jpg 即可取得圖片並寫入 PVC。

## 各應用

- log-output/：Node.js，MODE=both / writer / reader
- project/：Node.js，PORT 預設 3000
- pingpong/：Node.js，計數寫入 COUNT_PATH（預設 /usr/src/app/files/pingpong.txt）
