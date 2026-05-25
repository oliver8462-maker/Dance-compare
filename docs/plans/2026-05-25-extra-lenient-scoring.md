# 放寬比對角度與計分門檻下調實作計劃

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 將關節夾角最大容忍差調寬至 2.6 弧度，並將最低相似度計分底線 `minSimilarity` 調降為 0.48，以完全根除跟跳過程中容易獲得 0 分的現象，並維持不動時的防呆機制。

**Architecture:**
* 修改 [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js)：
  * 將 `computeJointSimilarity` 中判定公式的除數由 `2.2` 改為 `2.6`：`Math.max(0, 1 - (diff / 2.6))`。
  * 將 `scaleScore` 的預設參數 `minSimilarity` 由 `0.55` 降為 `0.48`：`export function scaleScore(avgSim, minSimilarity = 0.48)`。
* 修改 [tests/math.test.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/tests/math.test.js) 對應更新 `scaleScore` 中 `0.48` 的測試斷言。

---

### Task 1: 放寬夾角比對除數與下調計分底線

**Files:**
* Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js)
* Modify: [tests/math.test.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/tests/math.test.js)

**Step 1: 修改 math-utils.js 中的判定除數與 minSimilarity**
替換 `computeJointSimilarity` 中的 `2.2` 限制為 `2.6`，並將 `scaleScore` 中的 `0.55` 改為 `0.48`：

```javascript
/* math-utils.js 中 computeJointSimilarity 替換內容 */
    if (refVis >= minVisibility && userVis >= minVisibility) {
      const refAngle = getAngle(refP1, refP2, refP3);
      const userAngle = getAngle(userP1, userP2, userP3);
      const diff = Math.abs(refAngle - userAngle);
      // 寬鬆夾角扣分：差異大於 2.6 弧度（約 149 度）以上才判定為 0 分
      const sim = Math.max(0, 1 - (diff / 2.6));
      totalSim += sim;
      validCount++;
    }

/* math-utils.js 中 scaleScore 替換內容 */
export function scaleScore(avgSim, minSimilarity = 0.48) {
  if (avgSim < minSimilarity) return 0;
```

**Step 2: 修改 tests/math.test.js 測試斷言**
更新 `tests/math.test.js` 中的斷言值（將 `0.55` 測試修改為 `0.48` 測試）：

```javascript
/* tests/math.test.js 中 scaleScore 測試替換 */
// 3. Test Score scaling
assert.strictEqual(scaleScore(1.0), 100, 'Similarity of 1.0 should map to 100');
assert.strictEqual(scaleScore(0.48), 0, 'Similarity of 0.48 should map to 0');
assert.ok(scaleScore(0.74) >= 45 && scaleScore(0.74) <= 55, 'Similarity of 0.74 (midpoint) should be around 50');
assert.strictEqual(scaleScore(0.4), 0, 'Similarity below minSimilarity should map to 0');
```

**Step 3: 執行單元測試**
執行單元測試確保沒有語法錯誤。
Run: `node tests/math.test.js`
Expected: 測試完全通過。

**Step 4: 提交**
```bash
git add math-utils.js tests/math.test.js
git commit -m "feat: change joint similarity divisor to 2.6 and scaleScore minSimilarity to 0.48"
```
