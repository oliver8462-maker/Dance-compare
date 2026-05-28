# Strict Scoring and Screenshot Comparison Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Make the dance scoring stricter by changing the similarity divisor to 2.8, make the final AI feedback comments dynamic and non-repetitive, and implement side-by-side snapshot comparison (reference video vs. mirrored user camera skeleton) for session mistakes.

**Architecture:** Use 2.8 as the division factor in math-utils.js similarity formulas, update math.test.js tests, expand advice template lists in app.js, implement 160x120 HTML5 Canvas thumbnail capturing for reference video and webcam canvases during game play, and render them side-by-side in a new mistakes timeline card layout.

**Tech Stack:** Vanilla JavaScript, HTML5 Canvas, HTML5 Video, CSS.

---

### Task 1: Calibrate Similarity to 2.8 Strictness and Update Unit Tests

**Files:**
- Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js:56-62)
- Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js:101-106)
- Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/math-utils.js:130-136)
- Test: [tests/math.test.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/tests/math.test.js)

**Step 1: Write the failing test**
Since we're making similarity calculation stricter, the unit tests assertions (e.g. expected values or boundaries) should be adjusted or verified. Let's make sure they align with the 2.8 divisor.

**Step 2: Run test to verify it fails**
Modify `math-utils.js` divisor from `Math.PI` to `2.8` and run tests.

**Step 3: Write minimal implementation**
Modify similarity calculations in `math-utils.js`.

**Step 4: Run test to verify it passes**
Run: `node tests/math.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add math-utils.js tests/math.test.js
git commit -m "feat: adjust similarity divisor to 2.8 for stricter scoring"
```

---

### Task 2: Implement Dynamic Non-Repetitive AI Advice and Feedback Templates

**Files:**
- Modify: [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js:21-34)
- Modify: [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js:613-649)

**Step 1: Expand Advice Templates**
Change `JOINT_ADVICE` values to arrays of multiple sentences.

**Step 2: Write random selection logic**
Update advice generation in `endDanceSession` to select random sentences for both overall evaluation and individual joint errors.

**Step 3: Verify execution**
Check logic for errors by running dev server.

**Step 4: Commit**
```bash
git add app.js
git commit -m "feat: add dynamic, non-repetitive AI feedback and advice templates"
```

---

### Task 3: Implement Reference Video and Camera Screenshot Capturing

**Files:**
- Modify: [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js:403-427)

**Step 1: Implement Canvas helper functions**
Add `captureReferenceFrame` and `captureWebcamFrame` helper functions in `app.js`.

**Step 2: Capture screenshots on mistakes**
In `handleLiveWebcamResults`, save captured refImg and userImg (Base64 JPEG) to the `sessionMistakes` array.

**Step 3: Verify capturing**
Verify no memory/performance leaks or lag.

**Step 4: Commit**
```bash
git add app.js
git commit -m "feat: capture 160x120 screenshots on significant user mistakes"
```

---

### Task 4: Design Side-by-Side UI Rendering and Styles

**Files:**
- Modify: [app.js](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/app.js:651-672)
- Modify: [style.css](file:///c:/Users/user1/OneDrive/%E6%A1%8C%E9%9D%A2/%E6%96%B0%E5%B0%88%E9%A1%8C%E8%B7%B3%E8%88%9E/style.css:887-924)

**Step 1: Update UI generation**
Update HTML generation in `endDanceSession` to output `.mistake-card-item` structures with side-by-side comparison images.

**Step 2: Style elements in CSS**
Add CSS rules for `.mistake-card-item`, `.mistake-comparison`, `.comparison-img-wrapper`, `.comparison-img`, and mirror style for `.user-frame`.

**Step 3: Verify browser UI**
Verify layout, styling, and side-by-side images rendering.

**Step 4: Commit**
```bash
git add app.js style.css
git commit -m "feat: render side-by-side screenshots in session mistakes timeline"
```
