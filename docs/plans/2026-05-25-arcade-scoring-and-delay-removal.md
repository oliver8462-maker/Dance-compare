# 移除延時與街機化寬鬆評分實作計劃

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 移除 0.3 秒延遲比對，將角度比對最大容許落差調至 $\pi$，下調 `minSimilarity` 至 0.40，並調降 Sigmoid 中位數為 0.70 與斜率為 12.0，以徹底杜絕個位數低分並提供高寬容度的跟跳體驗。

**Architecture:**
* 修改 [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js)：
  * 將 `computeJointSimilarity` 中的比對公式改為 `1 - (diff / Math.PI)`。
  * 將 `scaleScore` 預設的計分底線 `minSimilarity` 調為 `0.40`，中位數 `m` 設為 `0.70`，斜率 `k` 設為 `12.0`。
* 修改 [tests/math.test.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/tests/math.test.js) 對應更新測試斷言，驗證 `scaleScore` 當 `minSimilarity = 0.40` 時的邏輯。
* 修改 [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js) 的 `handleLiveWebcamResults` 函數，移除 0.3 秒延遲時間，直接使用 `currentTime` 取出 Landmarks 特徵。

---

### Task 1: 實作 Math 模組之街機化寬鬆評分算法

**Files:**
* Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js)
* Modify: [tests/math.test.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/tests/math.test.js)

**Step 1: 修改 math-utils.js 中的評分公式與 Sigmoid 參數**
替換 `computeJointSimilarity` 與 `scaleScore` 為全新街機化極限寬鬆版本：

```javascript
/* math-utils.js 中 computeJointSimilarity 替換內容 */
    if (refVis >= minVisibility && userVis >= minVisibility) {
      const refAngle = getAngle(refP1, refP2, refP3);
      const userAngle = getAngle(userP1, userP2, userP3);
      const diff = Math.abs(refAngle - userAngle);
      // 寬鬆夾角扣分：除以 Math.PI，極限角度偏差才為 0 分，對小幅度站姿等偏移極度寬容
      const sim = 1 - (diff / Math.PI);
      totalSim += sim;
      validCount++;
    }

/* math-utils.js 中 scaleScore 替換內容 */
export function scaleScore(avgSim, minSimilarity = 0.40) {
  if (avgSim < minSimilarity) return 0;
  const k = 12.0; // 斜率平滑化
  const m = 0.70; // 中位數下降
  const sigmoid = (x) => 1 / (1 + Math.exp(-k * (x - m)));
```

**Step 2: 修改 tests/math.test.js 測試斷言**
更新 `tests/math.test.js` 中的斷言值（將 `0.48` 測試修改為 `0.40` 測試，將 midpoint 0.78 改為 0.70 測試）：

```javascript
/* tests/math.test.js 中 scaleScore 測試替換 */
// 3. Test Score scaling
assert.strictEqual(scaleScore(1.0), 100, 'Similarity of 1.0 should map to 100');
assert.strictEqual(scaleScore(0.40), 0, 'Similarity of 0.40 should map to 0');
assert.ok(scaleScore(0.70) >= 45 && scaleScore(0.70) <= 55, 'Similarity of 0.70 (midpoint) should be around 50');
assert.strictEqual(scaleScore(0.3), 0, 'Similarity below minSimilarity should map to 0');
```

**Step 3: 執行單元測試**
執行單元測試確保沒有語法錯誤。
Run: `node tests/math.test.js`
Expected: 測試完全通過。

**Step 4: 提交**
```bash
git add math-utils.js tests/math.test.js
git commit -m "feat: adjust math scoring formulas to use Math.PI divisor and lenient arcade sigmoid parameters"
```

---

### Task 2: 移除 0.3 秒反應延遲比對

**Files:**
* Modify: [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js)

**Step 1: 移除 app.js 中的延遲計算**
修改 `handleLiveWebcamResults` 尋找 `targetIndex` 的計算邏輯，直接使用 `currentTime` 取代：

```javascript
/* app.js 中的 handleLiveWebcamResults 替換內容 */
function handleLiveWebcamResults(results) {
  if (!isPlayingState) return;

  // 更新最新的骨架點
  latestUserLandmarks = results.poseLandmarks ? results.poseLandmarks : null;

  // 直接獲取當前影片時間點對應特徵
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

**Step 2: 驗證**
運行網頁進行測試：
1. 視訊與影片播放流暢，評分無延時，動作完全同步。
2. 動作跟跳時，極度容易拿到 Good/Great/Perfect，且幾乎不會再出現個位數得分。
3. 若故意完全不動，平均相似度仍低於 40%，合理給予 0 分 (Miss) 防呆。

**Step 3: 提交**
```bash
git add app.js
git commit -m "feat: remove 0.3s reaction delay and use direct video currentTime for scoring lookup"
```
