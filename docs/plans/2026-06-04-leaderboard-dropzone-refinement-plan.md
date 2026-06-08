# Leaderboard & Dropzone Refinement Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Keep the file upload dropzone text visible and styled compactly when the video library is active, and show the active video name dynamically in the leaderboard title.

**Architecture:** Update `index.html` to add a dynamic span placeholder in the leaderboard title. Update `style.css` to add compact dropzone layout rules. Update `app.js` to dynamically add/remove `.compact` class to/from the dropzone element and set the active video name in the leaderboard title.

**Tech Stack:** HTML5, Vanilla CSS, Vanilla JS.

---

### Task 1: Update HTML Structure for Leaderboard Title
**Files:**
- Modify: `c:/Users/kenwu/Downloads/Dance-compare-main/index.html:104-109`

**Step 1: Modify HTML header**
Add a placeholder span inside the leaderboard title for dynamic video name injection.

```html
                <!-- 排行榜 (Leaderboard) -->
                <div id="leaderboard-container" class="leaderboard-container hidden">
                    <h4 class="leaderboard-title">🏆 本片高手排行榜 <span id="leaderboard-video-title" class="video-title-context"></span></h4>
                    <div id="leaderboard-list" class="leaderboard-list">
```

**Step 2: Commit / Check changes**

---

### Task 2: Add CSS Rules for Compact Dropzone
**Files:**
- Modify: `c:/Users/kenwu/Downloads/Dance-compare-main/style.css:976-983` or end of file.

**Step 1: Add Compact Styles**
Add compact dropzone sizing rules to the style.css stylesheet.

```css
/* Compact Dropzone layout when library has files */
.dropzone.compact {
  padding: 1.5rem 1rem;
}

.dropzone.compact .upload-icon {
  font-size: 1.8rem;
  margin-bottom: 0.4rem;
}

.dropzone.compact h3 {
  font-size: 1rem;
  margin-bottom: 0.2rem;
}

.dropzone.compact p {
  font-size: 0.8rem;
  margin-bottom: 0.4rem;
}

.dropzone.compact .upload-note {
  display: none;
}

.video-title-context {
  font-size: 0.85rem;
  color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  margin-left: 0.5rem;
}
```

---

### Task 3: Refactor JS DOM state and functions
**Files:**
- Modify: `c:/Users/kenwu/Downloads/Dance-compare-main/app.js`

**Step 1: Track dropzone compact state**
Add logic to dynamically add/remove the `.compact` class to the dropzone and display the video name in `refreshLeaderboard()`.
Remove `.classList.add('hidden')` from `.dropzone-content` selectors.

Modify `handleVideoUpload`:
Remove:
```javascript
  // Hide dropzone interior styling
  document.querySelector('.dropzone-content').classList.add('hidden');
```
Add (or update logic):
```javascript
  document.getElementById('dropzone').classList.add('compact');
```

Modify `resetToUploadState`:
Remove:
```javascript
  // Reveal dropzone interior styling
  document.querySelector('.dropzone-content').classList.remove('hidden');
```
Add:
```javascript
  document.getElementById('dropzone').classList.remove('compact');
```

Modify `window.switchActiveVideo`:
Remove:
```javascript
  document.querySelector('.dropzone-content').classList.add('hidden');
```
Add:
```javascript
  document.getElementById('dropzone').classList.add('compact');
```

Modify `refreshLeaderboard`:
Set the title header content:
```javascript
  const leaderboardVideoTitle = document.getElementById('leaderboard-video-title');
  if (leaderboardVideoTitle) {
    leaderboardVideoTitle.textContent = `「 ${videoName} 」`;
  }
```

**Step 2: Run verification tests**
Run mathematical unit tests using `node tests/math.test.js` to ensure no regressions.
Verify in browser.
