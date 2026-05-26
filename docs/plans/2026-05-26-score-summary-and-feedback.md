# Score Summary and Feedback Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Add a detailed score statistics grid (Perfect, Great, Good, Miss counts) and personal AI feedback comments indicating the user's lowest-performing joint to the summary screen at the end of the dance test.

**Architecture:** 
1. Add `computeJointSimilarities` in `math-utils.js` to return independent similarities of all visible joints.
2. In `app.js`, track segment rating counts and accumulate per-joint similarity scores frame-by-frame.
3. In `index.html` and `style.css`, create and style a premium glassmorphic statistics grid and a feedback advice card.
4. On session end, render counts and determine the lowest-performing joint, look up friendly advice, and display it.

**Tech Stack:** Vanilla JS, CSS, HTML5 Canvas, MediaPipe Pose.

---

### Task 1: Implement `computeJointSimilarities` and Add Unit Test
**Files:**
- Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/math-utils.js`
- Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/tests/math.test.js`

**Step 1: Write the failing test**
Open `tests/math.test.js` and add a test case checking the imports and behavior of `computeJointSimilarities` on mock landmarks:
```javascript
// Test joint similarities
import { computeJointSimilarities } from '../math-utils.js';

const mockUserLandmarks = Array(33).fill(null).map((_, idx) => ({ x: idx, y: idx * 2, visibility: 0.9 }));
// Make Left Elbow slightly different
mockUserLandmarks[13] = { x: 13, y: 30, visibility: 0.9 }; 

const details = computeJointSimilarities(mockLandmarks, mockUserLandmarks);
assert.ok(details.LEFT_ELBOW !== undefined, 'LEFT_ELBOW should be evaluated');
assert.ok(details.LEFT_ELBOW < 1.0, 'LEFT_ELBOW similarity should be less than 1.0');
assert.strictEqual(details.RIGHT_ELBOW, 1.0, 'RIGHT_ELBOW similarity should be exactly 1.0');
```

**Step 2: Run test to verify it fails**
Run: `node tests/math.test.js`
Expected: SyntaxError or ReferenceError because `computeJointSimilarities` is not yet exported/defined in `math-utils.js`.

**Step 3: Write minimal implementation**
Modify `math-utils.js` to implement and export `computeJointSimilarities`:
```javascript
export function computeJointSimilarities(refLandmarks, userLandmarks, minVisibility = 0.5) {
  const details = {};
  for (const key in JOINTS) {
    const [i1, i2, i3] = JOINTS[key].points;
    const refP1 = refLandmarks[i1], refP2 = refLandmarks[i2], refP3 = refLandmarks[i3];
    const userP1 = userLandmarks[i1], userP2 = userLandmarks[i2], userP3 = userLandmarks[i3];

    if (!refP1 || !refP2 || !refP3 || !userP1 || !userP2 || !userP3) continue;

    const refVis = Math.min(refP1.visibility || 0, refP2.visibility || 0, refP3.visibility || 0);
    const userVis = Math.min(userP1.visibility || 0, userP2.visibility || 0, userP3.visibility || 0);

    if (refVis >= minVisibility && userVis >= minVisibility) {
      const refAngle = getAngle(refP1, refP2, refP3);
      const userAngle = getAngle(userP1, userP2, userP3);
      const diff = Math.abs(refAngle - userAngle);
      const sim = Math.max(0, 1 - (diff / Math.PI));
      details[key] = sim;
    }
  }
  return details;
}
```

**Step 4: Run test to verify it passes**
Run: `node tests/math.test.js`
Expected: PASS with "All math tests passed successfully!"

**Step 5: Commit**
```bash
git add math-utils.js tests/math.test.js
git commit -m "feat: implement computeJointSimilarities and unit test"
```

---

### Task 2: Implement UI layout in `index.html`
**Files:**
- Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/index.html:121-127`

**Step 1: Add stats grid and advice card to HTML**
Locate the `.final-score-box` inside the `#summary-section` and append the new `.stats-grid` and `.advice-card` markup:
```html
                    <div class="stats-grid">
                        <div class="stat-item perfect">
                            <span class="stat-label">Perfect</span>
                            <span id="perfect-count" class="stat-count">0</span>
                        </div>
                        <div class="stat-item great">
                            <span class="stat-label">Great</span>
                            <span id="great-count" class="stat-count">0</span>
                        </div>
                        <div class="stat-item good">
                            <span class="stat-label">Good</span>
                            <span id="good-count" class="stat-count">0</span>
                        </div>
                        <div class="stat-item miss">
                            <span class="stat-label">Miss</span>
                            <span id="miss-count" class="stat-count">0</span>
                        </div>
                    </div>

                    <div class="advice-card">
                        <div class="advice-header">💡 AI 動作改進評語</div>
                        <p id="advice-text" class="advice-text">正在分析您的動作習慣...</p>
                    </div>
```

**Step 2: Verify markup correctness**
Inspect file or run dev server to verify there are no HTML parse/load errors.

**Step 3: Commit**
```bash
git add index.html
git commit -m "style: add stats grid and advice card markup to summary overlay"
```

---

### Task 3: Style the new summary elements in `style.css`
**Files:**
- Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/style.css`

**Step 1: Add new CSS classes**
Add styling rules for `.stats-grid`, `.stat-item`, `.advice-card`, `.advice-header`, `.advice-text`, and specific badge colors:
```css
/* Stats Grid & Summary Breakdown */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  width: 100%;
  margin: 20px 0;
}

.stat-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-count {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
}

/* Badge specific color schemes */
.stat-item.perfect {
  border-color: rgba(234, 179, 8, 0.4);
  box-shadow: inset 0 0 10px rgba(234, 179, 8, 0.05);
}
.stat-item.perfect .stat-label { color: #facc15; }
.stat-item.perfect .stat-count { color: #facc15; text-shadow: 0 0 8px rgba(234, 179, 8, 0.4); }

.stat-item.great {
  border-color: rgba(236, 72, 153, 0.4);
  box-shadow: inset 0 0 10px rgba(236, 72, 153, 0.05);
}
.stat-item.great .stat-label { color: #ec4899; }
.stat-item.great .stat-count { color: #ec4899; text-shadow: 0 0 8px rgba(236, 72, 153, 0.4); }

.stat-item.good {
  border-color: rgba(16, 185, 129, 0.4);
  box-shadow: inset 0 0 10px rgba(16, 185, 129, 0.05);
}
.stat-item.good .stat-label { color: #10b981; }
.stat-item.good .stat-count { color: #10b981; text-shadow: 0 0 8px rgba(16, 185, 129, 0.4); }

.stat-item.miss {
  border-color: rgba(156, 163, 175, 0.4);
  box-shadow: inset 0 0 10px rgba(156, 163, 175, 0.05);
}
.stat-item.miss .stat-label { color: #9ca3af; }
.stat-item.miss .stat-count { color: #9ca3af; }

/* AI Advice Card style */
.advice-card {
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 16px;
  padding: 16px;
  width: 100%;
  margin: 15px 0 25px 0;
  text-align: left;
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.05);
  backdrop-filter: blur(8px);
}

.advice-header {
  font-size: 0.95rem;
  font-weight: 700;
  color: #a5b4fc;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.advice-text {
  font-size: 0.88rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}
```

**Step 2: Commit**
```bash
git add style.css
git commit -m "style: design layout and neon highlights for feedback components"
```

---

### Task 4: Integrate scoring and advice flow in `app.js`
**Files:**
- Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js`

**Step 1: Import new utility & define state**
Import `computeJointSimilarities` at the top:
```javascript
import { computeJointSimilarity, scaleScore, computeJointSimilarities } from './math-utils.js';
```
Define tracking variables at the module level:
```javascript
let ratingsCount = { perfect: 0, great: 0, good: 0, miss: 0 };
let jointAccumulators = {}; // { JOINT_KEY: { sum: 0, count: 0 } }
```

**Step 2: Add Chinese advice mapping**
Define the `JOINT_ADVICE` constant mapping keys to their user-friendly labels and details:
```javascript
const JOINT_ADVICE = {
  LEFT_ELBOW: { name: '左手肘', advice: '可以多注意左手臂彎曲的伸展度，讓動作更到位。' },
  RIGHT_ELBOW: { name: '右手肘', advice: '可以多注意右手手臂的彎曲與伸展角度。' },
  LEFT_SHOULDER: { name: '左肩膀', advice: '左側肩膀的擺幅或抬高高度可以再做大一些，讓動作更舒展。' },
  RIGHT_SHOULDER: { name: '右肩膀', advice: '右側肩膀的開合或抬高高度可以再加強一些，增加表現力。' },
  LEFT_KNEE: { name: '左膝蓋', advice: '左腳膝蓋的彎曲下蹲幅度可以再深一些，這能讓你的重心更穩。' },
  RIGHT_KNEE: { name: '右膝蓋', advice: '右腳膝蓋的下蹲或伸直細節可以做得更確實，有助於高分。' },
  LEFT_HIP: { name: '左髖部/臀部', advice: '左半邊身體的扭轉或骨盆重心擺放可以更穩定，保持姿態流暢。' },
  RIGHT_HIP: { name: '右髖部/臀部', advice: '右半邊身體的扭轉或下盤重心維持可以更明確，提升動作美感。' },
  LEFT_WRIST: { name: '左手腕', advice: '左手手掌或手腕的延伸角度可以再精準一點。' },
  RIGHT_WRIST: { name: '右手腕', advice: '右手手掌或手腕的指引方向與擺放位置可以再精緻一些。' },
  LEFT_ANKLE: { name: '左腳踝', advice: '左腳跨步的重心或步幅可以再精準確實一些。' },
  RIGHT_ANKLE: { name: '右腳踝', advice: '右腳跨步的重心或步幅可以再精準確實一些。' }
};
```

**Step 3: DOM binding**
Get references to new DOM elements inside DOM section:
```javascript
const perfectCountEl = document.getElementById('perfect-count');
const greatCountEl = document.getElementById('great-count');
const goodCountEl = document.getElementById('good-count');
const missCountEl = document.getElementById('miss-count');
const adviceTextEl = document.getElementById('advice-text');
```

**Step 4: Update lifecycle resets**
Initialize/Reset the accumulators in `initiateDanceTest()`:
```javascript
  ratingsCount = { perfect: 0, great: 0, good: 0, miss: 0 };
  jointAccumulators = {};
```
And do the same in `resetToUploadState()`.

**Step 5: Accumulate joint similarities during frame calculations**
Inside `handleLiveWebcamResults(results)` (where frame is evaluated):
```javascript
  if (refFrame && refFrame.landmarks && results.poseLandmarks) {
    const similarity = computeJointSimilarity(refFrame.landmarks, results.poseLandmarks);
    const score = scaleScore(similarity);
    
    currentScoreEl.textContent = score;
    frameScores.push(score);
    allScores.push(score);

    // Track detailed joints
    const jointSims = computeJointSimilarities(refFrame.landmarks, results.poseLandmarks);
    for (const key in jointSims) {
      if (!jointAccumulators[key]) {
        jointAccumulators[key] = { sum: 0, count: 0 };
      }
      jointAccumulators[key].sum += jointSims[key];
      jointAccumulators[key].count++;
    }
  }
```

**Step 6: Count segment ratings in 1.5-second evaluator**
Inside `evaluateSegmentScore()`:
```javascript
  let rating = 'Miss';
  let className = 'miss';

  if (average >= 80) {
    rating = 'Perfect';
    className = 'perfect';
    ratingsCount.perfect++;
  } else if (average >= 70) {
    rating = 'Great';
    className = 'great';
    ratingsCount.great++;
  } else if (average >= 55) {
    rating = 'Good';
    className = 'good';
    ratingsCount.good++;
  } else {
    ratingsCount.miss++;
  }
```

**Step 7: Render counters and look up advice on ending session**
Modify `endDanceSession()` to render counts and compute the worst joint suggestions:
```javascript
  // Display rating counters
  perfectCountEl.textContent = ratingsCount.perfect;
  greatCountEl.textContent = ratingsCount.great;
  goodCountEl.textContent = ratingsCount.good;
  missCountEl.textContent = ratingsCount.miss;

  // Generate AI advice
  let lowestJoints = [];
  for (const key in jointAccumulators) {
    if (jointAccumulators[key].count > 5) { // Filter out joints with very few samples
      const avg = jointAccumulators[key].sum / jointAccumulators[key].count;
      lowestJoints.push({ key, avg });
    }
  }

  // Sort lowest joint similarity ascending
  lowestJoints.sort((a, b) => a.avg - b.avg);

  let adviceHTML = '';
  const overallAvg = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  if (overallAvg >= 85 && lowestJoints.length > 0 && lowestJoints[0].avg >= 0.85) {
    adviceHTML = '🌟 <strong>表現無懈可擊！</strong>您的所有動作配合得極為完美，各關節的角度拿捏非常精準，繼續保持！';
  } else if (lowestJoints.length > 0) {
    // Pick top 2 worst joints
    const worstCount = Math.min(2, lowestJoints.length);
    const worstLabels = [];
    for (let i = 0; i < worstCount; i++) {
      const item = lowestJoints[i];
      const adviceInfo = JOINT_ADVICE[item.key];
      if (adviceInfo) {
        worstLabels.push(`<strong>${adviceInfo.name}</strong>（${adviceInfo.advice}）`);
      }
    }
    if (worstLabels.length > 0) {
      adviceHTML = `根據數據分析，您的整體動作非常棒！但若想挑戰更高分，可以特別調整以下部位：<br/>• ${worstLabels.join('<br/>• ')}`;
    } else {
      adviceHTML = '做得好！動作的整體完成度很高，下次嘗試挑戰更大的擺幅或更高強度的舞蹈影片吧！';
    }
  } else {
    adviceHTML = '未收集到足夠的關節比對數據，請確保您的全身都完整進入鏡頭畫面中！';
  }
  
  adviceTextEl.innerHTML = adviceHTML;
```

**Step 8: Verify it works or fails**
Check for any typos or bugs in `app.js`.

**Step 9: Commit**
```bash
git add app.js
git commit -m "feat: track rating counts and generate detailed AI feedback on session end"
```

---

### Task 5: Final Integration Verification
1. Run `node tests/math.test.js` to ensure the core helper works and hasn't broken anything.
2. Manually load page and mock camera session / verify elements appear correctly.
3. Write walkthrough.md.
