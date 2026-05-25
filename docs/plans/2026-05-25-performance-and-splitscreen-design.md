# 系統設計文件：左右分屏與畫面卡頓效能優化

本設計文件記錄「跳舞動作相似度評分軟體」之左右 50/50 分屏佈局及雙迴圈非同步優化以解決畫面卡頓的技術細節。

## 1. 50/50 左右分屏佈局設計 (Split Screen Layout)

### 1.1 CSS 樣式調整
我們將原先的子母畫面 (PiP) 浮動設計改為左右對等分屏佈局：
* **容器佈局**：`.test-container` 的 `display` 設為 `flex`，`flex-direction` 設為 `row` (橫向分佈)。
* **左側 (參考影片區)**：
  * 原先的 `.pip-container` 重新命名或樣式調整為 `.reference-wrapper` (寬度 50%，高度 100%)。
  * 去除絕對定位、陰影與圓角。
  * 影片 `#reference-video` 設為 `width: 100%; height: 100%; object-fit: contain;`，確保舞蹈動作完整呈現不裁剪。
* **右側 (使用者鏡頭區)**：
  * 寬度佔 50%，高度 100%。
  * 使用者畫布 `#webcam-canvas` 設為 `width: 100%; height: 100%; object-fit: cover;`，保持鏡像顯示。
* **倒數與評價覆蓋層**：
  * 倒數覆蓋層 `#countdown-overlay` 調整為僅覆蓋在右側鏡頭區之上，或覆蓋全螢幕，為保持畫面乾淨，以覆蓋全螢幕為佳。
  * 浮動評價 `#feedback-container` 設於右側鏡頭區上方，增加動作打擊感的視覺效果。

---

## 2. 畫布獨立繪製與節流優化 (Performance Optimization)

為了解決 MediaPipe Pose 模型推理運算佔用主線程，導致相機繪製與影片播放掉幀卡頓的問題，本方案進行以下架構優化：

### 2.1 雙迴圈非同步渲染架構
將「相機影像渲染」與「AI 模型推理」解耦 (Decoupling) 成兩個獨立執行的平行流程：

```mermaid
graph TD
    A[Start Dance Session] --> B[60 FPS Drawing Loop]
    A --> C[AI Inference Loop]
    
    subgraph Drawing Loop (60 FPS)
        B --> D[Draw Mirrored Camera Frame]
        D --> E{Latest User/Ref Pose Available?}
        E -- Yes --> F[Draw 33-point Skeletons on top]
        E -- No --> G[Skip drawing skeletons]
        F --> H[requestAnimationFrame]
        G --> H
        H --> B
    end

    subgraph AI Inference Loop (Throttled to 25 FPS)
        C --> I{Time since last run >= 40ms?}
        I -- Yes --> J[poseModel.send camera video]
        J --> K[Update Latest User Landmarks]
        K --> L[Calculate Similarity & Score]
        L --> I
        I -- No --> M[Wait for next frame]
        M --> I
    end
```

### 2.2 推理節流機制 (Inference Throttling)
* 限制 `poseModel.send` 呼叫頻率在每秒最多 25 次 (即大約每 40ms 進行一次推理)。
* 透過時間差判斷 `currentTime - lastInferenceTime >= 40`，若未達到時間閾值，則跳過該幀的推理，釋放 CPU/GPU 資源給瀏覽器進行影片解碼，消除影片卡頓。

---

## 3. 程式碼修改對應點

1. **`index.html`**:
   * 移除或改寫 `#pip-container` 樣式，使其成為左側的對等分屏。
2. **`style.css`**:
   * 修改 `.test-container` 為 flex-row。
   * 修改 `.camera-wrapper` 寬度為 50%，高度 100%。
   * 修改 `.pip-container` (參考影片) 寬度為 50%，高度 100%，改為相對定位，去除 bottom/right 等浮動樣式。
   * 確保即時分數 `#current-score` 與時間進度條維持在合適的覆蓋位置。
3. **`app.js`**:
   * 引進全域變數 `latestUserLandmarks` 儲存相機偵測到的最新人體骨骼點。
   * 修改 `handleLiveWebcamResults`：僅更新 `latestUserLandmarks`、計算相似度與分數，**不**在該 callback 內直接進行 Canvas 清除與繪圖。
   * 實作獨立的 `drawWebcamCanvas` 繪製迴圈 (60fps)，負責繪製相機畫面、最新的使用者骨骼與背景影片參考骨骼。
   * 修改 `processWebcamFrame`，增加時間閾值控制 (40ms 節流)。
