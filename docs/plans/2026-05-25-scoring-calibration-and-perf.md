# 評分精準度校準與效能深度優化實作計劃

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 實作相機影格 256x256 下採樣（減少 MediaPipe 推理耗時以消除畫面卡頓），精簡比對關節至 12 組核心動態關節並實作大角度差（超過90度）直接判定為 0 分的嚴格相似度扣分公式，並更新評語門檻至：Perfect (>=80)、Great (70-79)、Good (55-69)、Miss (<55)。

**Architecture:**
* 修改 [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js) 將比對夾角 `JOINTS` 限制在決定肢體動作的 12 組核心活動關節，並將 `computeJointSimilarity` 中的角度相似度公式改為更嚴格的 `Math.max(0, 1 - (diff / 1.6))`，夾角落差達約 90 度以上即直接得 0 分。
* 修改 [tests/math.test.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/tests/math.test.js) 對應更新單元測試，驗證嚴格角度相似度計算結果。
* 修改 [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js)：
  * 宣告在記憶體中運作的離屏縮圖畫布 `smallCanvas` 與 `smallCtx` (尺寸為 $256 \times 256$)。
  * 修改 `processWebcamFrame` 推理迴圈：每次 `poseModel.send` 前，先將 webcam 畫面繪製並縮圖到 `smallCanvas`，並把 `smallCanvas` 傳給 poseModel 進行推理以消除主線程堵塞。
  * 重新調整 `evaluateSegmentScore` 函數中的評分區間門檻。

---

### Task 1: 實作 core 12 關節夾角與嚴格扣分計算

**Files:**
* Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js)
* Modify: [tests/math.test.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/tests/math.test.js)

**Step 1: 修改 math-utils.js 中的 JOINTS 與比對計算**
替換 `JOINTS` 為 12 組核心動態關節（手腕手肘肩膀、腳踝膝蓋髖關節），並更新 `computeJointSimilarity` 為大於 90 度極限扣分公式：

```javascript
/* math-utils.js 中 JOINTS 替換內容 */
export const JOINTS = {
  LEFT_ELBOW: { name: 'Left Elbow', points: [11, 13, 15] },
  RIGHT_ELBOW: { name: 'Right Elbow', points: [12, 14, 16] },
  LEFT_SHOULDER: { name: 'Left Shoulder', points: [23, 11, 13] },
  RIGHT_SHOULDER: { name: 'Right Shoulder', points: [24, 12, 14] },
  LEFT_KNEE: { name: 'Left Knee', points: [23, 25, 27] },
  RIGHT_KNEE: { name: 'Right Knee', points: [24, 26, 28] },
  LEFT_HIP: { name: 'Left Hip', points: [11, 23, 25] },
  RIGHT_HIP: { name: 'Right Hip', points: [12, 24, 26] },
  LEFT_WRIST: { name: 'Left Wrist', points: [13, 15, 19] },
  RIGHT_WRIST: { name: 'Right Wrist', points: [14, 16, 20] },
  LEFT_ANKLE: { name: 'Left Ankle', points: [25, 27, 31] },
  RIGHT_ANKLE: { name: 'Right Ankle', points: [26, 28, 32] }
};

/* math-utils.js 中 computeJointSimilarity 替換內容 */
export function computeJointSimilarity(refLandmarks, userLandmarks, minVisibility = 0.5) {
  let totalSim = 0;
  let validCount = 0;

  for (const key in JOINTS) {
    const [i1, i2, i3] = JOINTS[key].points;
    const refP1 = refLandmarks[i1], refP2 = refLandmarks[i2], refP3 = refLandmarks[i3];
    const userP1 = userLandmarks[i1], userP2 = userLandmarks[i2], userP3 = userLandmarks[i3];

    // Ensure points exist
    if (!refP1 || !refP2 || !refP3 || !userP1 || !userP2 || !userP3) continue;

    // Check visibility
    const refVis = Math.min(refP1.visibility || 0, refP2.visibility || 0, refP3.visibility || 0);
    const userVis = Math.min(userP1.visibility || 0, userP2.visibility || 0, userP3.visibility || 0);

    if (refVis >= minVisibility && userVis >= minVisibility) {
      const refAngle = getAngle(refP1, refP2, refP3);
      const userAngle = getAngle(userP1, userP2, userP3);
      const diff = Math.abs(refAngle - userAngle);
      // 嚴格夾角扣分：差異大於 1.6 弧度（約 91.6 度）以上直接為 0 分
      const sim = Math.max(0, 1 - (diff / 1.6));
      totalSim += sim;
      validCount++;
    }
  }

  return validCount > 0 ? totalSim / validCount : 0;
}
```

**Step 2: 執行單元測試並修復斷言**
更新 `tests/math.test.js` 中的斷言值（因為公式改變），然後在 PowerShell 中執行：
Run: `node tests/math.test.js`
Expected: 順利通過。

**Step 3: 提交**
```bash
git add math-utils.js tests/math.test.js
git commit -m "feat: use 12 active joints for matching and implement strict angle mismatch penalty"
```

---

### Task 2: 實作離屏 256x256 下採樣與重定義評語區間

**Files:**
* Modify: [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js)

**Step 1: 宣告離屏縮小畫布變數**
在 `app.js` 的狀態變數宣告區域加入 `smallCanvas` 與 `smallCtx`：

```javascript
/* app.js 約第 23 行附近插入 */
const smallCanvas = document.createElement('canvas');
smallCanvas.width = 256;
smallCanvas.height = 256;
const smallCtx = smallCanvas.getContext('2d');
```

**Step 2: 更新 processWebcamFrame 下採樣推理**
修改 `processWebcamFrame`，將 webcamVideo 預先縮小繪製到 `smallCanvas`，並把 `smallCanvas` 送去進行 AI 推理以消除主線程卡死：

```javascript
/* app.js 中的 processWebcamFrame 替換內容 */
async function processWebcamFrame() {
  if (!isPlayingState) return;

  const now = Date.now();
  const inferenceInterval = 50; // 50ms = 20 FPS 運算頻率
  
  if (!isInferenceRunning && now - lastInferenceTime >= inferenceInterval) {
    if (webcamVideo.readyState === webcamVideo.HAVE_ENOUGH_DATA) {
      isInferenceRunning = true;
      lastInferenceTime = now;
      try {
        // 先繪製與縮圖至離屏小畫布，再將小畫布送出，大幅減少 MediaPipe 的縮放開銷，徹底消除卡頓
        smallCtx.drawImage(webcamVideo, 0, 0, 256, 256);
        await poseModel.send({ image: smallCanvas });
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

**Step 3: 修改 evaluateSegmentScore 評語閾值**
重新配置 Perfect (>=80)、Great (70~79)、Good (55~69)、Miss (<55)：

```javascript
/* app.js 中 evaluateSegmentScore 評分替換 */
  let rating = 'Miss';
  let className = 'miss';

  if (average >= 80) {
    rating = 'Perfect';
    className = 'perfect';
  } else if (average >= 70) {
    rating = 'Great';
    className = 'great';
  } else if (average >= 55) {
    rating = 'Good';
    className = 'good';
  }
```

**Step 4: 驗證**
運行網頁並進行手部與腳步動作測試：
1. 視訊畫面已徹底流暢無任何卡頓（主線程完全解脫）。
2. 在參考影片播完結算時，若站立不動，由於四肢動作角度與影片有巨大落差，現在分數將顯著降至 20~40 左右 (Miss 等級)，站立不動拿高分的漏洞被成功修復。
3. 實時跳出的 4 個打擊感評價與設定的 Perfect (>=80), Great (70-79), Good (55-69), Miss (<55) 完全符合。

**Step 5: 提交**
```bash
git add app.js
git commit -m "feat: downscale pose input image to 256x256 offscreen canvas to avoid main thread lag and update rating ranges"
```
