# 反應延時補償與寬鬆角度比對實作計劃

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 實作 0.3 秒玩家模仿反應時間的延遲比對，並將關節角度的最大容許差調寬至 2.2 弧度，以在維持站立不動防呆的前提下，使比對判定更加寬鬆、體驗更佳。

**Architecture:**
* 修改 [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js) 中的 `computeJointSimilarity` 函數，將相似度判定公式的除數由 1.6 改為 2.2：`Math.max(0, 1 - (diff / 2.2))`。
* 修改 [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js) 的 `handleLiveWebcamResults` 函數，在尋找參考影片的 `currentTime` 時扣除 0.3 秒的延遲：`const delayedTime = Math.max(0, referenceVideo.currentTime - 0.3)`。

**Tech Stack:** JavaScript (ES6 Modules).

---

### Task 1: 實作寬鬆夾角比對公式

**Files:**
* Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js)
* Modify: [tests/math.test.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/tests/math.test.js)

**Step 1: 修改 math-utils.js 中的相似度公式**
替換 `computeJointSimilarity` 中的 `1.6` 限制，改為 `2.2` 以放寬容許度：

```javascript
/* math-utils.js 中 computeJointSimilarity 替換內容 */
    if (refVis >= minVisibility && userVis >= minVisibility) {
      const refAngle = getAngle(refP1, refP2, refP3);
      const userAngle = getAngle(userP1, userP2, userP3);
      const diff = Math.abs(refAngle - userAngle);
      // 寬鬆夾角扣分：差異大於 2.2 弧度（約 126 度）以上才判定為 0 分，大幅改善身體不動手動被扣分的問題
      const sim = Math.max(0, 1 - (diff / 2.2));
      totalSim += sim;
      validCount++;
    }
```

**Step 2: 執行單元測試**
執行單元測試確保沒有語法錯誤。
Run: `node tests/math.test.js`
Expected: 測試完全通過。

**Step 3: 提交**
```bash
git add math-utils.js
git commit -m "feat: loosen joint angle mismatch tolerance to 2.2 radians"
```

---

### Task 2: 實作 0.3 秒反應延遲補償

**Files:**
* Modify: [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js)

**Step 1: 在 app.js 中加入 0.3 秒延遲時間**
修改 `handleLiveWebcamResults` 尋找 `targetIndex` 的計算邏輯，引進反應延遲時間差：

```javascript
/* app.js 中的 handleLiveWebcamResults 替換內容 */
function handleLiveWebcamResults(results) {
  if (!isPlayingState) return;

  // 更新最新的骨架點
  latestUserLandmarks = results.poseLandmarks ? results.poseLandmarks : null;

  // 獲取 0.3 秒前的影片時間點對應特徵，實現反應延時補償
  const delayedTime = Math.max(0, referenceVideo.currentTime - 0.3);
  const targetIndex = Math.min(poseFeatures.length - 1, Math.round(delayedTime * 30));
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

**Step 2: 驗證延時與寬鬆度**
啟動專案，上傳影片並實際跟著跳舞測試。
Expected:
1. 玩家跟跳時不再需要預判影片動作，0.3 秒的延時對應讓分數判定非常符合直覺，跟上節奏即可獲得 Perfect/Great。
2. 當手有動、身體微幅傾斜但非完全一樣時，判定顯著變為寬鬆，不再容易直接被判 Miss，玩家體驗流暢滿意。

**Step 3: 提交**
```bash
git add app.js
git commit -m "feat: implement 0.3s reaction delay compensation for live scoring comparison"
```
