# 精細骨架與動態評分優化實作計劃

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 實作 MediaPipe 完整 33 點骨架的精細化繪製與更細小的點線樣式，擴展相似度角度比對至 24 組關節角，並使用 Sigmoid 非線性評分曲線優化分數分布，最終將等級評定改為 A~E 級距。

**Architecture:**
* 修改 [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js) 擴展 `JOINTS` 夾角定義至 24 組關節角，並重新實作 `scaleScore` 為歸一化 Sigmoid 映射公式。
* 修改 [tests/math.test.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/tests/math.test.js) 以匹配新的 24 組關節夾角與非線性評分映射，進行單元測試驗證。
* 修改 [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js) 更新 `drawSkeleton` 繪製 MediaPipe 的完整 33 點與對應的連接線，縮減點跟線條的大小，並在比對時使用 30fps 計算。修改 `endDanceSession` 中的等級評比級距（改為 A~E 等級）。

**Tech Stack:** JavaScript (ES6 Modules), Node.js (for unit tests), Canvas API.

---

### Task 1: 實作並測試核心夾角與 Sigmoid 評分演算法

**Files:**
* Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js)
* Modify: [tests/math.test.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/tests/math.test.js)

**Step 1: 修改 math-utils.js**
替換 `JOINTS` 字典，加入全新的 24 組夾角點位配置；同時替換 `scaleScore` 函數為 Sigmoid 映射。

```javascript
// math-utils.js 中 JOINTS 替換內容
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
  RIGHT_ANKLE: { name: 'Right Ankle', points: [26, 28, 32] },
  LEFT_NECK: { name: 'Left Neck', points: [7, 11, 12] },
  RIGHT_NECK: { name: 'Right Neck', points: [8, 12, 11] },
  LEFT_COLLAR: { name: 'Left Collar', points: [12, 11, 13] },
  RIGHT_COLLAR: { name: 'Right Collar', points: [11, 12, 14] },
  LEFT_HIP_ROT: { name: 'Left Hip Rot', points: [24, 23, 25] },
  RIGHT_HIP_ROT: { name: 'Right Hip Rot', points: [23, 24, 26] },
  LEFT_LAT_TORSO: { name: 'Left Lat Torso', points: [11, 23, 24] },
  RIGHT_LAT_TORSO: { name: 'Right Lat Torso', points: [12, 24, 23] },
  LEFT_ARMPIT: { name: 'Left Armpit', points: [12, 11, 23] },
  RIGHT_ARMPIT: { name: 'Right Armpit', points: [11, 12, 24] },
  HEAD_AXIS: { name: 'Head Axis', points: [7, 0, 8] },
  NOSE_SHOULDER: { name: 'Nose Shoulder', points: [0, 11, 13] }
};

// math-utils.js 中 scaleScore 替換內容
export function scaleScore(avgSim, minSimilarity = 0.55) {
  if (avgSim < minSimilarity) return 0;
  const k = 15.0;
  const m = 0.78;
  const sigmoid = (x) => 1 / (1 + Math.exp(-k * (x - m)));
  
  const f_sim = sigmoid(avgSim);
  const f_min = sigmoid(minSimilarity);
  const f_max = sigmoid(1.0);
  
  const score = ((f_sim - f_min) / (f_max - f_min)) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}
```

**Step 2: 修改 tests/math.test.js**
更新單元測試，使 mockLandmarks 能完整填充 33 個點，避免新關節點因為點位缺失而略過，並更新 `scaleScore` 評分預期值斷言。

```javascript
// tests/math.test.js 替換 mockLandmarks 與斷言
const mockLandmarks = Array(33).fill(null).map((_, idx) => ({ x: idx, y: idx * 2, visibility: 0.9 }));

// 3. Test Score scaling 斷言替換
assert.strictEqual(scaleScore(1.0), 100, 'Similarity of 1.0 should map to 100');
assert.strictEqual(scaleScore(0.55), 0, 'Similarity of 0.55 should map to 0');
assert.ok(scaleScore(0.78) >= 45 && scaleScore(0.78) <= 55, 'Similarity of 0.78 (midpoint) should be around 50');
assert.strictEqual(scaleScore(0.4), 0, 'Similarity below minSimilarity should map to 0');
```

**Step 3: 執行測試確認通過**
在 PowerShell 終端執行：
Run: `node tests/math.test.js`
Expected: "All math tests passed successfully!"

**Step 4: 提交**
```bash
git add math-utils.js tests/math.test.js
git commit -m "feat: expand to 24 joints and implement normalized sigmoid score scaling"
```

---

### Task 2: 更新畫布骨架繪製與 A~E 等級級距判定

**Files:**
* Modify: [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js)

**Step 1: 修改 app.js 中的 drawSkeleton 函數**
替換 `connections` 與關節點繪製代碼，實作 33 點的完整拓撲，縮小線條寬度和點的半徑。

```javascript
function drawSkeleton(ctx, landmarks) {
  if (!landmarks) return;

  const connections = [
    // Face
    [0, 1], [0, 4], [1, 2], [2, 3], [3, 7],
    [4, 5], [5, 6], [6, 8], [9, 10],
    // Upper body & Torso
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24],
    // Hands
    [15, 17], [15, 19], [15, 21], [17, 19],
    [16, 18], [16, 20], [16, 22], [18, 20],
    // Lower body
    [23, 25], [25, 27], [24, 26], [26, 28],
    // Feet
    [27, 29], [27, 31], [29, 31],
    [28, 30], [28, 32], [30, 32]
  ];

  ctx.save();
  ctx.lineWidth = 2.5; // 縮小線條寬度 (原 5)
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)'; // Neon Indigo
  ctx.shadowBlur = 6; // 減小發光模糊半徑 (原 10)
  ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';

  // Draw connectors
  connections.forEach(([i, j]) => {
    const p1 = landmarks[i];
    const p2 = landmarks[j];
    if (p1 && p2 && (p1.visibility || 0) > 0.5 && (p2.visibility || 0) > 0.5) {
      ctx.beginPath();
      ctx.moveTo(p1.x * webcamCanvas.width, p1.y * webcamCanvas.height);
      ctx.lineTo(p2.x * webcamCanvas.width, p2.y * webcamCanvas.height);
      ctx.stroke();
    }
  });

  // Draw joints
  const coreJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  for (let idx = 0; idx < landmarks.length; idx++) {
    const p = landmarks[idx];
    if (p && (p.visibility || 0) > 0.5) {
      const isCore = coreJoints.includes(idx);
      const radius = isCore ? 5 : 3; // 核心點 5px，細節點 3px (原 10px / 6px)
      const outerRadius = isCore ? 8 : 5;

      // Joint Fill (Hot Pink)
      ctx.beginPath();
      ctx.arc(p.x * webcamCanvas.width, p.y * webcamCanvas.height, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#ec4899';
      ctx.shadowBlur = isCore ? 10 : 5;
      ctx.shadowColor = '#ec4899';
      ctx.fill();

      // Outer rings (White border)
      ctx.beginPath();
      ctx.arc(p.x * webcamCanvas.width, p.y * webcamCanvas.height, outerRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.0;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
  }

  ctx.restore();
}
```

**Step 2: 修改 app.js 中的 endDanceSession 級距判定**
替換 `endDanceSession` 中的級距判定邏輯，從 `S, A, B, C` 改為 `A, B, C, D, E` 等級。

```javascript
  // app.js 中 endDanceSession 部分內容替換
  // Grade classification (A ~ E)
  let grade = 'E';
  if (finalAverage >= 85) grade = 'A';
  else if (finalAverage >= 70) grade = 'B';
  else if (finalAverage >= 55) grade = 'C';
  else if (finalAverage >= 40) grade = 'D';
```

**Step 3: 驗證代碼**
在瀏覽器啟動 dev server（若未啟動，使用 `npm run dev`）並上傳舞蹈影片。
確認：
1. 視訊畫面上呈現 33 點與其連接線（包含雙手、雙腳、臉部）。
2. 連接線及關節點大小顯著縮小，看起來更加細緻精細。
3. 實時顯示的分數變動範圍更具動態感。
4. 最終總成績級距顯示正確地歸類在 A ~ E 區間。

**Step 4: 提交**
```bash
git add app.js
git commit -m "feat: update skeleton renderer for 33-point posture and adapt final grade thresholds to A-E"
```
