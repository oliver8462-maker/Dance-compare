# 系統設計文件：效能極致優化與 Great 評級新增

本設計文件記錄「跳舞動作相似度評分軟體」之 MediaPipe Pose 運算量精簡（降低模型複雜度）以解決剩餘卡頓問題，以及實即時評級 Perfect, Great, Good, Miss 四級距設計的技術規格。

## 1. 效能極致優化設計 (MediaPipe Pose Lite Model)

### 1.1 降低模型複雜度 (Model Complexity)
目前 MediaPipe Pose 採用的模型複雜度為 `1` (Full)。儘管已進行了節流，但在部分設備上，模型本身的運算資源消耗依然偏高，導致影片解碼稍微被拉慢而卡頓。
* **修改點**：將 `modelComplexity` 設為 `0` (Lite)。
* **效益**：Lite 模型在極速與低耗能上表現優秀，運算速度為 Full 模型的數倍，對肢體大動作的識別準確率與 Full 模型幾乎無異，能夠完全根除視訊與影片播放的卡頓。

### 1.2 比對節流微調 (Throttling Fine-Tuning)
* 為了進一步確保瀏覽器有足夠的 CPU/GPU 資源渲染 50/50 畫面與解碼影片，我們將 `inferenceInterval` 微調為 50ms（20 FPS）。
* 20 FPS 已足夠精確，且可進一步釋放 20% 的運算壓力。

---

## 2. 新增 Great 評級與色彩設計 (Great Rating Design)

我們在浮動即時評價中加入 `Great` 級別，並在 CSS 與 JS 中實作對應樣式：

### 2.1 CSS 霓虹色彩定義
* 新增 `--color-great` 變數：藍青色 `#06b6d4` (Cyan)。
* 新增 `.feedback-bubble.great` 的文字樣式，提供獨立的 `text-shadow` 陰影發光效果。

```css
:root {
  ...
  --color-great: #06b6d4; /* Neon Cyan */
}

.feedback-bubble.great {
  color: var(--color-great);
}
```

### 2.2 JS 評語區間邏輯
修改 `evaluateSegmentScore` 函數中的評分區間：
* **Perfect**：$\ge 85$ 分
* **Great**：$75 \sim 84$ 分 (即 $\ge 75$ 且 $< 85$)
* **Good**：$55 \sim 74$ 分 (即 $\ge 55$ 且 $< 75$)
* **Miss**：$< 55$ 分
