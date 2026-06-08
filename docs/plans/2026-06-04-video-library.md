# Video Library & Switching Feature Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Enable users to upload multiple videos and switch between them dynamically in the UI without re-running the skeleton analysis preprocessing.

**Architecture:** Maintain a global array of uploaded videos in `app.js` alongside an active ID. Add a "Video Library" UI section below the dropzone in `index.html` and style it in `style.css`. Integrate handlers for adding, switching, and deleting videos, with appropriate memory cleanup.

**Tech Stack:** Vanilla JS, CSS, HTML5 Video & File API, Object URLs.

---

### Task 1: Add HTML Structure for Video Library

**Files:**
- Modify: `index.html`

**Step 1: Add container markup**
Add the video library markup in [index.html](file:///c:/Users/kenwu/Downloads/Dance-compare-main/index.html) under the dropzone and preprocess container, before the start control.

Exact replacement code in `index.html` around line 55:
```html
                <!-- 預處理進度顯示 -->
                <div id="preprocess-container" class="preprocess-container hidden">
                    ...
                </div>

                <!-- 新增：已分析影片庫 (Video Library) -->
                <div id="video-library-container" class="video-library-container hidden">
                    <h4 class="library-title">🎥 已分析影片庫 (Video Library)</h4>
                    <div id="video-library-list" class="video-library-list">
                        <!-- 動態生成影片項目 -->
                    </div>
                </div>

                <!-- 開始按鈕 -->
                <div id="start-control" class="start-control hidden">
                    ...
                </div>
```

**Step 2: Verify markup**
Since there's no script yet, check if compilation/static structure is correct. Open/inspect `index.html` or make sure there are no typos.

---

### Task 2: Add CSS Styles for Video Library

**Files:**
- Modify: `style.css`

**Step 1: Add CSS rules**
Append CSS rules to [style.css](file:///c:/Users/kenwu/Downloads/Dance-compare-main/style.css) for `.video-library-container`, `.video-library-list`, `.library-item`, active states, and delete buttons.

Exact CSS content:
```css
/* --- Video Library Styles --- */
.video-library-container {
  width: 100%;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-glass);
}

.library-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.8rem;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.video-library-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
}

.library-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glass);
  cursor: pointer;
  transition: all 0.2s ease;
}

.library-item:hover {
  background: rgba(99, 102, 241, 0.05);
  border-color: rgba(99, 102, 241, 0.3);
}

.library-item.active {
  background: rgba(99, 102, 241, 0.1);
  border-color: var(--primary);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
}

.item-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
}

.item-icon {
  font-size: 1.1rem;
}

.item-name {
  font-size: 0.85rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.item-badge {
  font-size: 0.7rem;
  background: linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%);
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 50px;
  margin-left: 0.5rem;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
}

.item-actions {
  display: flex;
  align-items: center;
  margin-left: 0.8rem;
}

.btn-delete-item {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete-item:hover {
  color: var(--color-miss);
  background: rgba(239, 68, 68, 0.1);
}
```

**Step 2: Run a quick syntax review**
Ensure style sheet loads and doesn't contain unbalanced braces.

---

### Task 3: Initialize State and DOM References in `app.js`

**Files:**
- Modify: `app.js`

**Step 1: Declare state variables**
Define the state variables under the initial Application State Variables section in [app.js](file:///c:/Users/kenwu/Downloads/Dance-compare-main/app.js).
```javascript
let uploadedVideos = []; // Store items: { id, name, file, url, poseFeatures }
let activeVideoId = null;
```

**Step 2: Declare DOM elements**
Add references to the newly created HTML elements:
```javascript
const videoLibraryContainer = document.getElementById('video-library-container');
const videoLibraryList = document.getElementById('video-library-list');
```

---

### Task 4: Hook into the Video Upload & Preprocessing Pipeline

**Files:**
- Modify: `app.js`

**Step 1: Store newly preprocessed video**
Modify `handleVideoUpload` in [app.js](file:///c:/Users/kenwu/Downloads/Dance-compare-main/app.js) to wrap and store the newly completed video in `uploadedVideos`. Set it as active, and call the rendering function.

In `handleVideoUpload`:
```javascript
  isPreprocessing = false;
  onResultsCallback = null;
  
  // Store processed video and features
  const newVideoId = 'vid_' + Date.now();
  const newVideo = {
    id: newVideoId,
    name: file.name,
    file: file,
    url: videoURL,
    poseFeatures: [...poseFeatures]
  };
  uploadedVideos.push(newVideo);
  activeVideoId = newVideoId;
  
  updateVideoLibraryUI();
```

---

### Task 5: Implement UI Rendering, Switching, and Deletion Logic

**Files:**
- Modify: `app.js`

**Step 1: Implement `updateVideoLibraryUI`, `switchActiveVideo`, and `deleteVideo` functions**
Add these functions to the end of `app.js`.

```javascript
// --- Video Library Actions ---
function updateVideoLibraryUI() {
  if (uploadedVideos.length === 0) {
    videoLibraryContainer.classList.add('hidden');
    videoLibraryList.innerHTML = '';
    return;
  }

  videoLibraryContainer.classList.remove('hidden');
  videoLibraryList.innerHTML = uploadedVideos.map(video => {
    const isActive = video.id === activeVideoId;
    return `
      <div class="library-item ${isActive ? 'active' : ''}" onclick="window.switchActiveVideo('${video.id}')">
        <div class="item-info">
          <span class="item-icon">🎥</span>
          <span class="item-name" title="${video.name}">${video.name}</span>
          ${isActive ? '<span class="item-badge">使用中</span>' : ''}
        </div>
        <div class="item-actions">
          <button class="btn-delete-item" onclick="window.deleteVideo('${video.id}', event)" title="刪除影片">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Expose functions to window scope for onclick attributes
window.switchActiveVideo = function(videoId) {
  const video = uploadedVideos.find(v => v.id === videoId);
  if (!video) return;

  activeVideoId = video.id;
  poseFeatures = video.poseFeatures;
  
  // Point elements to the cached URL
  referenceVideo.src = video.url;
  referenceVideo.load();
  tempVideo.src = video.url;
  tempVideo.load();

  // Reset progress and bypass preprocessing state
  document.querySelector('.dropzone-content').classList.add('hidden');
  preprocessContainer.classList.add('hidden');
  startControl.classList.remove('hidden');
  
  preprocessStatusText.textContent = `骨架分析完成！已讀取緩存的 ${poseFeatures.length} 個關鍵特徵。`;
  preprocessPercentage.textContent = "100%";
  preprocessProgressBar.style.width = "100%";
  headerStatus.textContent = "準備完畢，可以開始測試";
  headerStatus.style.color = "var(--color-good)";

  updateVideoLibraryUI();
};

window.deleteVideo = function(videoId, event) {
  if (event) event.stopPropagation();
  
  const videoIndex = uploadedVideos.findIndex(v => v.id === videoId);
  if (videoIndex === -1) return;

  const targetVideo = uploadedVideos[videoIndex];
  
  // Free blob URL memory
  if (targetVideo.url) {
    URL.revokeObjectURL(targetVideo.url);
  }
  
  // Remove from state array
  uploadedVideos.splice(videoIndex, 1);

  if (activeVideoId === videoId) {
    if (uploadedVideos.length > 0) {
      // Auto switch to the first video
      window.switchActiveVideo(uploadedVideos[0].id);
    } else {
      // Library is empty, revert to upload view
      resetToUploadState();
    }
  } else {
    updateVideoLibraryUI();
  }
};
```

**Step 2: Update resetToUploadState to clear but preserve the library if needed**
Wait, when the user clicks "Upload new video" button (`new-video-btn`), we call `resetToUploadState()`.
But wait! If they click "Upload new video", do we want to clear the whole library?
No, the user requested "When uploading a second video, the old ones should be saved to switch anytime".
So `resetToUploadState()` should NOT clear the library. It should just clear the input and show the dropzone so the user can upload a second video!
Let's modify `resetToUploadState()` to:
1. Preserve `uploadedVideos` and `activeVideoId`.
2. Just show the dropzone and hide the start controls / preprocess containers for the *new* upload.
3. Keep the video library UI visible.

Let's modify the reset logic carefully:
```javascript
function resetToUploadState() {
  // Stop webcam tracks if active
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }

  clearInterval(feedbackIntervalId);
  clearInterval(timelineIntervalId);

  // 停止 60fps 畫布繪製迴圈
  if (drawLoopId) {
    cancelAnimationFrame(drawLoopId);
    drawLoopId = null;
  }

  isTestingState = false;
  isPlayingState = false;
  ratingsCount = { perfect: 0, great: 0, good: 0, miss: 0 };
  jointAccumulators = {};
  sessionMistakes = [];

  testSection.classList.add('hidden');
  summarySection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  preprocessContainer.classList.add('hidden');
  startControl.classList.add('hidden');
  
  // Reveal dropzone interior styling
  document.querySelector('.dropzone-content').classList.remove('hidden');
  videoInput.value = '';
  
  headerStatus.textContent = "準備就緒";
  headerStatus.style.color = "var(--text-muted)";
  
  // Rerender/refresh video library view
  updateVideoLibraryUI();
}
```

Wait, what about when deleting the last video? That should clear everything:
```javascript
  if (uploadedVideos.length === 0) {
    resetToUploadState();
  }
```
This is already covered in `deleteVideo`.

---

### Task 6: Run existing Math Unit Tests

**Files:**
- Test: `tests/math.test.js`

**Step 1: Run unit tests**
Run: `node tests/math.test.js`
Expected: `All math tests passed successfully!`

---

### Task 7: Manual Verification Steps
1. Upload `test1.mp4`. Verify it analyzes and lists in the Video Library.
2. Click "Upload new video" (`new-video-btn`). Verify the dropzone is shown again, but `test1.mp4` remains in the Video Library card below.
3. Upload `test2.mp4`. Verify it analyzes, lists in the Video Library as the active video.
4. Click `test1.mp4` in the Video Library list. Verify it activates, loads without analysis, and shows "Start Test".
5. Delete `test2.mp4` and verify it disappears, and the active video switches back to `test1.mp4`.
6. Delete `test1.mp4` and verify the UI resets to a clean upload screen.
