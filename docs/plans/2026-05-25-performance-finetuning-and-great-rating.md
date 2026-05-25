# 效能極致優化與 Great 評級新增實作計劃

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 將 MediaPipe Pose 模型複雜度調降為 `0` (Lite)，並將 AI 比對節流微調為 50ms (20 FPS) 以徹底解決剩餘卡頓；同時在 CSS 與 JS 中新增 `Great` 級別與對應的霓虹藍青色發光樣式，更新實時評分邏輯。

**Architecture:**
* 修改 [style.css](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/style.css) 以定義 `--color-great` 青藍色，並加上 `.feedback-bubble.great` 的文字樣式。
* 修改 [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js) 以：
  * 在 `initPoseModel` 中將 `modelComplexity` 設為 `0` (Lite 模型)。
  * 在 `processWebcamFrame` 中將節流時間間隔 `inferenceInterval` 從 40ms 微調為 50ms。
  * 在 `evaluateSegmentScore` 中重新配置 4 等級實時區間：Perfect (>=85)、Great (75~84)、Good (55~74)、Miss (<55)。

**Tech Stack:** Vanilla CSS, JavaScript (ES6 Modules), MediaPipe Pose.

---

### Task 1: 實作 style.css 中 Great 評級樣式

**Files:**
* Modify: [style.css](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/style.css)

**Step 1: 增加 Great 評級的色碼**
在 style.css 最上方的 `:root` 宣告中，在 `--color-good` 與 `--color-miss` 之間加入 `--color-great`：

```css
/* style.css 約第 17 行附近替換 */
  --color-perfect: #fbbf24; /* Amber Gold */
  --color-great: #06b6d4; /* Neon Cyan */
  --color-good: #10b981; /* Emerald Green */
  --color-miss: #ef4444; /* Rose Red */
```

**Step 2: 增加 Great 評語泡泡樣式**
在 style.css 中，在 `.feedback-bubble.perfect` 與 `.feedback-bubble.good` 之間加入 `.feedback-bubble.great` 樣式：

```css
/* style.css 約第 466 行附近替換 */
.feedback-bubble.perfect {
  color: var(--color-perfect);
}

.feedback-bubble.great {
  color: var(--color-great);
}

.feedback-bubble.good {
  color: var(--color-good);
}
```

**Step 3: 驗證樣式檔**
確認 CSS 沒有語法錯誤。

**Step 4: 提交**
```bash
git add style.css
git commit -m "style: define neon cyan great rating bubble styling in CSS"
```

---

### Task 2: 調降模型複雜度與優化即時評語判定區間

**Files:**
* Modify: [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js)

**Step 1: 修改 MediaPipe 設定為 Lite 模型 (Complexity 0)**
在 `initPoseModel` 中，調整 `modelComplexity` 為 `0`：

```javascript
/* app.js 約第 68 行附近替換 */
  poseModel.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
```

**Step 2: 微調 AI 偵測節流間隔為 50ms**
在 `processWebcamFrame` 中將 `inferenceInterval` 修改為 50ms (每秒 20 次)：

```javascript
/* app.js 內 processWebcamFrame 約第 326 行附近替換 */
  const now = Date.now();
  const inferenceInterval = 50; // 50ms = 20 FPS 運算頻率，減輕硬體負擔
```

**Step 3: 重構 evaluateSegmentScore 等級判定**
在 `evaluateSegmentScore` 函數中，重構為 Perfect (>=85)、Great (75~84)、Good (55~74)、Miss (<55) 四級，並套用對應的 class name：

```javascript
/* app.js 中 evaluateSegmentScore 約第 480 行至 489 行替換 */
  let rating = 'Miss';
  let className = 'miss';

  if (average >= 85) {
    rating = 'Perfect';
    className = 'perfect';
  } else if (average >= 75) {
    rating = 'Great';
    className = 'great';
  } else if (average >= 55) {
    rating = 'Good';
    className = 'good';
  }
```

**Step 4: 驗證效能與評級功能**
啟動本機開發伺服器，進行影片測試。
Expected:
1. 視訊與影片播放流暢度達到完美流暢（無任何卡頓感覺）。
2. 在比對進行中，每 1.5 秒彈出的漂浮評價除了原本的 Perfect、Good、Miss 之外，能正常彈出藍青色的 Great 字樣。
3. 四種評價的觸發門檻完全符合自訂的分數區間。

**Step 5: 提交**
```bash
git add app.js
git commit -m "feat: switch to MediaPipe Lite model complexity 0 and implement 4-tier live ratings with Great rating"
```
