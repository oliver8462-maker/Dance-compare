# Dance Recognition Scoring Software Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a browser-based dance similarity scoring app that runs MediaPipe Pose on an uploaded video in the background, starts a 3-second countdown with webcam tracking, plays the video in a PiP layout, compares joint angles via cosine similarity, and displays 2-second ratings and a final average score.

**Architecture:** A static HTML/CSS/JS frontend application utilizing MediaPipe Pose v0.5 CDN. Video preprocessing seeks frame-by-frame programmatically. Real-time scoring calculates cosine similarity on 8 key joint angles, maps the average to a calibrated scale, aggregates it every 2 seconds for feedback popups, and presents a total average summary upon video completion.

**Tech Stack:** HTML5, Vanilla CSS3 (Glassmorphism), Vanilla JS (ES6 Modules), MediaPipe Pose CDN, Node.js (for running local unit tests).

---

### Task 1: Initialize Project Structure & Dev Scripts

**Files:**
* Create: `package.json`
* Create: `index.html`
* Create: `style.css`
* Create: `math-utils.js`
* Create: `app.js`

**Step 1: Write package.json**
Configure standard dev server script. We use `http-server` via npx for a quick static server.
```json
{
  "name": "dance-similarity-score",
  "version": "1.0.0",
  "description": "Dance Similarity Scoring Software",
  "main": "app.js",
  "scripts": {
    "dev": "npx http-server -p 8080 -c-1"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

**Step 2: Initialize basic static files**
Create empty files to prepare for Task 2 and Task 3.
Create `index.html` with basic skeleton and CDN scripts:
```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dance similarity scoring software</title>
    <link rel="stylesheet" href="style.css">
    <!-- MediaPipe Pose CDN -->
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="app.js"></script>
</body>
</html>
```
Create empty `style.css`, `app.js`, and `math-utils.js`.

**Step 3: Verify Initialization**
Run: `npm run dev` in a terminal (approved command) and check if it starts on port 8080.
Expected: server runs.

**Step 4: Commit**
```bash
git add package.json index.html style.css math-utils.js app.js
git commit -m "chore: initialize project skeleton"
```

---

### Task 2: Implement & Unit Test Core Math Utilities

**Files:**
* Modify: `math-utils.js`
* Create: `tests/math.test.js`

**Step 1: Implement math-utils.js**
Define the 8 key joints, vector operations, angle calculations, and score mapping.
```javascript
export const JOINTS = {
  LEFT_ELBOW: { name: 'Left Elbow', points: [11, 13, 15] },
  RIGHT_ELBOW: { name: 'Right Elbow', points: [12, 14, 16] },
  LEFT_SHOULDER: { name: 'Left Shoulder', points: [23, 11, 13] },
  RIGHT_SHOULDER: { name: 'Right Shoulder', points: [24, 12, 14] },
  LEFT_KNEE: { name: 'Left Knee', points: [23, 25, 27] },
  RIGHT_KNEE: { name: 'Right Knee', points: [24, 26, 28] },
  LEFT_HIP: { name: 'Left Hip', points: [11, 23, 25] },
  RIGHT_HIP: { name: 'Right Hip', points: [12, 24, 26] }
};

export function getAngle(p1, p2, p3) {
  const u = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v = { x: p3.x - p2.x, y: p3.y - p2.y };
  const dot = u.x * v.x + u.y * v.y;
  const lenU = Math.sqrt(u.x * u.x + u.y * u.y);
  const lenV = Math.sqrt(v.x * v.x + v.y * v.y);
  if (lenU === 0 || lenV === 0) return 0;
  const cos = dot / (lenU * lenV);
  return Math.acos(Math.max(-1, Math.min(1, cos)));
}

export function computeJointSimilarity(refLandmarks, userLandmarks, minVisibility = 0.5) {
  let totalSim = 0;
  let validCount = 0;

  for (const key in JOINTS) {
    const [i1, i2, i3] = JOINTS[key].points;
    const refP1 = refLandmarks[i1], refP2 = refLandmarks[i2], refP3 = refLandmarks[i3];
    const userP1 = userLandmarks[i1], userP2 = userLandmarks[i2], userP3 = userLandmarks[i3];

    if (!refP1 || !refP2 || !refP3 || !userP1 || !userP2 || !userP3) continue;

    // Check visibility
    const refVis = Math.min(refP1.visibility || 0, refP2.visibility || 0, refP3.visibility || 0);
    const userVis = Math.min(userP1.visibility || 0, userP2.visibility || 0, userP3.visibility || 0);

    if (refVis >= minVisibility && userVis >= minVisibility) {
      const refAngle = getAngle(refP1, refP2, refP3);
      const userAngle = getAngle(userP1, userP2, userP3);
      const diff = Math.abs(refAngle - userAngle);
      const sim = 1 - (diff / Math.PI); // Range 0 to 1
      totalSim += sim;
      validCount++;
    }
  }

  return validCount > 0 ? totalSim / validCount : 0;
}

export function scaleScore(avgSim, minSimilarity = 0.65) {
  if (avgSim < minSimilarity) return 0;
  return Math.round(((avgSim - minSimilarity) / (1 - minSimilarity)) * 100);
}
```

**Step 2: Create unit tests in tests/math.test.js**
Write assertions to verify correctness.
```javascript
import assert from 'assert';
import { getAngle, computeJointSimilarity, scaleScore } from '../math-utils.js';

console.log('Running math-utils tests...');

// 1. Test Angle calculation
const p1 = { x: 1, y: 0 };
const p2 = { x: 0, y: 0 };
const p3 = { x: 0, y: 1 };
const angle90 = getAngle(p1, p2, p3);
assert.ok(Math.abs(angle90 - Math.PI / 2) < 1e-5, 'Angle should be 90 degrees (pi/2)');

// 2. Test perfect similarity
const mockLandmarks = Array(33).fill(null).map(() => ({ x: 0, y: 0, visibility: 0.9 }));
mockLandmarks[11] = { x: 0, y: 1, visibility: 0.9 };
mockLandmarks[13] = { x: 0, y: 0, visibility: 0.9 };
mockLandmarks[15] = { x: 1, y: 0, visibility: 0.9 };
// Set others to bypass undefined errors
[12, 14, 16, 23, 24, 25, 26, 27, 28].forEach(i => {
  mockLandmarks[i] = { x: 0, y: 0, visibility: 0.9 };
});

const simPerfect = computeJointSimilarity(mockLandmarks, mockLandmarks);
assert.strictEqual(simPerfect, 1.0, 'Perfect matches should yield 1.0 similarity');

// 3. Test Score scaling
assert.strictEqual(scaleScore(1.0), 100, 'Similarity of 1.0 should map to 100');
assert.strictEqual(scaleScore(0.65), 0, 'Similarity of 0.65 should map to 0');
assert.strictEqual(scaleScore(0.825), 50, 'Similarity of 0.825 should map to 50');
assert.strictEqual(scaleScore(0.5), 0, 'Similarity below minSimilarity should map to 0');

console.log('All math tests passed successfully!');
```

**Step 3: Run the unit test using Node.js**
Run: `node tests/math.test.js`
Expected: "All math tests passed successfully!"

**Step 4: Commit**
```bash
git add math-utils.js tests/math.test.js
git commit -m "feat: implement math scoring utilities and add unit tests"
```

---

### Task 3: Build UI Markup & Premium Stylesheet

**Files:**
* Modify: `index.html`
* Modify: `style.css`

**Step 1: Write HTML markup in index.html**
Define layouts for the different application states (Upload/Preprocess, 3s Countdown, Playing, Game Over).
Include slots for videos, canvas drawing, progress bar, feedback notifications, and total score overlay.

**Step 2: Write CSS rules in style.css**
Include dark mode style, custom neon colors, glassmorphism overlays, PiP layout placing, progress indicator design, floating scoring word animation classes, and score modal.

**Step 3: Verification**
Start the dev server and view the static page locally. Verify elements are loaded and match the layout.

**Step 4: Commit**
```bash
git add index.html style.css
git commit -m "style: implement modern responsive layout with glassmorphism styling"
```

---

### Task 4: Implement Video Preprocessing Logic

**Files:**
* Modify: `app.js`

**Step 1: Implement pose models initialization**
Write code to load MediaPipe Pose, set options (`upperBodyOnly: false`, `modelComplexity: 1`), and configure callbacks.

**Step 2: Implement frame-by-frame background seeking**
Write the step-by-step seeking loop using `seeked` event listener and temporary `<canvas>` rendering to extract pose features at 30 FPS.

**Step 3: Verification**
Upload a video file in the browser, verify that the progress bar increments, console logs landmarks, and displays the "Start Test" button when complete.

**Step 4: Commit**
```bash
git add app.js
git commit -m "feat: implement frame-by-frame video preprocessing"
```

---

### Task 5: Implement Webcam, Countdown & Real-time Playback

**Files:**
* Modify: `app.js`

**Step 1: Implement camera activation and 3s countdown**
On clicking "Start Test", toggle state to countdown, display 3, 2, 1, GO, and request user webcam.

**Step 2: Synchronize video playback with camera tracking**
Start the reference video with audio. Track the camera frames in real-time, feed them to MediaPipe, lookup the closest timestamped preprocessed reference frame, calculate the similarity score, and draw both skeletons on the main canvas.

**Step 3: Verification**
Start the test, check countdown overlay, camera loading, skeletons rendering on screen, and reference video playing.

**Step 4: Commit**
```bash
git add app.js
git commit -m "feat: implement webcam countdown and real-time synchronized playback"
```

---

### Task 6: Implement Interval Feedback & Final Summary Screen

**Files:**
* Modify: `app.js`

**Step 1: Add 2-second feedback timer and floating popups**
Collect frame similarity scores, calculate averages every 2 seconds, trigger "Perfect", "Good", or "Miss", and spawn animated DOM elements.

**Step 2: Implement ending state and total average display**
When the reference video emits the `ended` event, calculate the total average score, determine the Rank (S, A, B, C), stop the webcam, and display the game over overlay.

**Step 3: Verification**
Verify full loop: upload -> preprocess -> play -> check feedback popup -> reach end -> see final average score modal and restart.

**Step 4: Commit**
```bash
git add app.js
git commit -m "feat: implement 2-second feedback rating and final overall score screen"
```
