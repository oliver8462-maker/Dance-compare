# 左右分屏與畫面卡頓效能優化實作計劃

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 實作 50/50 左右分屏對照佈局（左邊舞蹈影片，右邊鏡頭與霓虹骨架），並透過獨立的 60fps 畫布渲染迴圈與 MediaPipe 的 25fps 推理節流機制，完全解決畫面播放與相機顯示卡頓問題。

**Architecture:**
* 修改 [style.css](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/style.css)：將 `.test-container` 的 `flex-direction` 設為 `row-reverse` 以達成左影片右鏡頭，並將 `.camera-wrapper` 與 `.pip-container` 改為對等 50% 寬度分屏，去除子母畫面的浮動與絕對定位屬性。
* 修改 [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js)：
  * 引入 `latestUserLandmarks`、`drawLoopId`、`lastInferenceTime` 與 `isInferenceRunning` 變數。
  * `handleLiveWebcamResults` 僅負責更新全域骨架與相似度評分，移除其原有的畫圖與清除畫布邏輯。
  * 實作獨立的 `drawWebcamCanvas` 繪圖迴圈（以 `requestAnimationFrame` 進行 60fps 鏡像相機渲染與骨架繪製）。
  * 優化 `processWebcamFrame` 以進行 40ms（25fps）推理節流，並透過 `isInferenceRunning` 鎖定避免重疊執行。
  * 在測試開始與結束時正確啟動及停止該繪圖迴圈。

**Tech Stack:** Vanilla CSS (Flexbox), JavaScript (ES6), HTML Canvas API.

---

### Task 1: 實作 50/50 左右分屏 CSS 樣式

**Files:**
* Modify: [style.css](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/style.css)

**Step 1: 修改 style.css 中的測試容器與相機 wrapper 樣式**
搜尋並替換 `.test-container` 及其子元素樣式，改為 50/50 橫向排列：

```css
/* style.css 約第 326 行至 347 行替換 */
.test-container {
  display: flex;
  flex-direction: row-reverse; /* 左邊播放舞蹈影片，右邊顯示相機 */
  position: relative;
  width: 100%;
  height: calc(100vh - 130px);
  max-height: 800px;
  background: #000;
  border: 1px solid var(--border-glass);
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
}

/* Left side - camera frame with canvas overlay -> Now right side due to row-reverse */
.camera-wrapper {
  position: relative;
  flex: 0 0 50%; /* 剛好 50% 寬度 */
  height: 100%;
  background: #030712;
  display: flex;
  justify-content: center;
  align-items: center;
  border-left: 1px solid var(--border-glass);
}
```

**Step 2: 修改 style.css 中的影片容器與影片 wrapper 樣式**
搜尋並替換 `.pip-container` 及其子元素樣式，移除絕對定位並轉化為左分屏元件：

```css
/* style.css 約第 363 行至 401 行替換 */
.pip-container {
  position: relative; /* 改為相對定位 */
  bottom: auto;
  right: auto;
  flex: 0 0 50%; /* 剛好 50% 寬度 */
  height: 100%;
  background: #000;
  backdrop-filter: none;
  border: none;
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
  z-index: 5;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.pip-header {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-glass);
  background: rgba(0, 0, 0, 0.2);
  height: 32px;
}

.pip-video-wrapper {
  position: relative;
  width: 100%;
  height: calc(100% - 32px); /* 扣除 Header 後填滿高度 */
  background: #000;
  padding-top: 0; /* 移除原本 16:9 的 padding-top */
}

#reference-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain; /* 以內縮置中方式展示影片以看清完整動作 */
}
```

**Step 3: 驗證 CSS 排版**
在瀏覽器啟動 dev server（若未啟動，使用 `npm run dev`）並點擊上傳隨意影片到測試階段。
Expected: 畫面上呈現左右 50/50 佈局，且舞蹈原影片在左，玩家鏡頭與 Canvas 在右。

**Step 4: 提交**
```bash
git add style.css
git commit -m "style: adapt layout to 50/50 split screen with reverse rows for left reference video"
```

---

### Task 2: 實作獨立 60fps 畫布渲染與 25fps 推理節流

**Files:**
* Modify: [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js)

**Step 1: 宣告效能控制變數**
在 `app.js` 的狀態變數宣告區域加入以下變數：

```javascript
// app.js 約第 19 行附近插入
let latestUserLandmarks = null; // 儲存最新相機骨架偵測點
let drawLoopId = null; // 60fps 渲染迴圈的 ID
let lastInferenceTime = 0; // 上次推理的時間戳記
let isInferenceRunning = false; // 是否正在進行推理
```

**Step 2: 重構 handleLiveWebcamResults**
只保留全域變數更新與評分計算邏輯，移除清除 Canvas 與繪畫邏輯。

```javascript
// app.js 中 handleLiveWebcamResults 替換內容
function handleLiveWebcamResults(results) {
  if (!isPlayingState) return;

  // 更新最新的骨架點
  latestUserLandmarks = results.poseLandmarks ? results.poseLandmarks : null;

  // 獲取當前影片對應特徵格並計算相似度分數
  const currentTime = referenceVideo.currentTime;
  const targetIndex = Math.min(poseFeatures.length - 1, Math.round(currentTime * 30));
  const refFrame = poseFeatures[targetIndex];

  if (refFrame && refFrame.landmarks && results.poseLandmarks) {
    const similarity = computeJointSimilarity(refFrame.landmarks, results.poseLandmarks);
    const score = scaleScore(similarity);
    
    currentScoreEl.textContent = score;
    frameScores.push(score);
    allScores.push(score);
  } else {
    currentScoreEl.textContent = "0";
  }
}
```

**Step 3: 實作 60fps drawWebcamCanvas 繪圖迴圈**
新增 `drawWebcamCanvas` 函數至 `app.js`，用於獨立繪製畫面：

```javascript
// app.js 插入新函數位置（建議在 drawSkeleton 上方或下方）
function drawWebcamCanvas() {
  if (!isPlayingState) return;

  // 1. 清除畫布並繪製即時相機畫面
  webcamCtx.clearRect(0, 0, webcamCanvas.width, webcamCanvas.height);
  if (webcamVideo.readyState >= webcamVideo.HAVE_CURRENT_DATA) {
    webcamCtx.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
  }

  // 2. 疊加繪製最新的使用者骨骼
  if (latestUserLandmarks) {
    drawSkeleton(webcamCtx, latestUserLandmarks);
  }

  // 持續進行渲染
  drawLoopId = requestAnimationFrame(drawWebcamCanvas);
}
```

**Step 4: 優化 processWebcamFrame 以實作 FPS 推理節流**
替換 `processWebcamFrame` 限制發送速度在每 40 毫秒一次 (25 FPS)：

```javascript
// app.js 中 processWebcamFrame 替換內容
async function processWebcamFrame() {
  if (!isPlayingState) return;

  const now = Date.now();
  const inferenceInterval = 40; // 40ms = 25 FPS 運算頻率
  
  if (!isInferenceRunning && now - lastInferenceTime >= inferenceInterval) {
    if (webcamVideo.readyState === webcamVideo.HAVE_ENOUGH_DATA) {
      isInferenceRunning = true;
      lastInferenceTime = now;
      try {
        await poseModel.send({ image: webcamVideo });
      } catch (err) {
        console.error("MediaPipe 推理錯誤: ", err);
      } finally {
        isInferenceRunning = false;
      }
    }
  }

  requestAnimationFrame(processWebcamFrame);
}
```

**Step 5: 管理繪製迴圈的生命週期**
在 `startDanceSession` 啟動繪畫迴圈，在 `endDanceSession` 與 `resetToUploadState` 停止迴圈：

```javascript
// 1. 在 startDanceSession() 的開頭加入：
latestUserLandmarks = null;
lastInferenceTime = 0;
isInferenceRunning = false;
drawWebcamCanvas();

// 2. 在 endDanceSession() 與 resetToUploadState() 中分別加入：
if (drawLoopId) {
  cancelAnimationFrame(drawLoopId);
  drawLoopId = null;
}
```

**Step 6: 驗證效能優化**
啟動專案，上傳影片並測試。
Expected:
1. 視訊 Canvas 畫面和相機本身流暢無比（60 FPS 級別）。
2. 左半邊的舞蹈影片播放平滑流順，不再有明顯掉幀或卡頓。
3. 霓虹骨架動作緊密追隨玩家。

**Step 7: 提交**
```bash
git add app.js
git commit -m "feat: decouple webcam drawing loop to 60fps and throttle AI inference to 25fps"
```
