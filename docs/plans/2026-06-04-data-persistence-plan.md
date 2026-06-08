# Data Persistence Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a unified boot sequence with IndexedDB to persist video uploads and leaderboard state across page reloads.

**Architecture:** Use `idb-keyval` for native IndexedDB storage. Add a loading overlay to delay UI initialization until Firebase Auth and IndexedDB data are fully loaded. Sync state upon upload, switch, and delete.

**Tech Stack:** Vanilla JS, HTML/CSS, `idb-keyval` via CDN, Firebase Auth.

---

### Task 1: Integrate `idb-keyval` and Boot Overlay HTML

**Files:**
- Modify: `index.html`

**Step 1: Add idb-keyval script and boot overlay HTML**

Add the CDN script in the `<head>` and the overlay UI just inside `<body>`:

```html
<!-- Inside <head> -->
<script src="https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js"></script>

<!-- Just inside <body> -->
<div id="boot-overlay" class="boot-overlay">
  <div class="boot-spinner"></div>
  <p>系統載入中...</p>
</div>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add boot overlay and idb-keyval script"
```

### Task 2: Style the Boot Overlay

**Files:**
- Modify: `style.css`

**Step 1: Add CSS for boot overlay**

```css
/* Boot Overlay */
.boot-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-main);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: opacity 0.5s ease;
}
.boot-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}
.boot-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**Step 2: Commit**

```bash
git add style.css
git commit -m "style: add styles for boot overlay"
```

### Task 3: Implement Boot Sequence and IndexedDB Sync Logic

**Files:**
- Modify: `app.js`

**Step 1: Define saveState helper**

Somewhere at the top level or below variables:
```javascript
// Data Persistence Helper
async function saveStateToIndexedDB() {
  try {
    await idbKeyval.set('uploadedVideos', uploadedVideos);
    await idbKeyval.set('activeVideoId', activeVideoId);
  } catch (err) {
    console.error('Failed to save state to IndexedDB:', err);
  }
}
```

**Step 2: Update Boot Logic with Promise.all**

Find the `document.addEventListener('DOMContentLoaded', ...)` block and update it (or add one if none exists):

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const bootOverlay = document.getElementById('boot-overlay');
  
  // Promise for Firebase Auth resolution
  const authPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = user;
        isGuest = false;
      }
      updateAuthUI();
      unsubscribe(); // Only listen once for boot
      resolve();
    });
    // 1.5s timeout safety net
    setTimeout(resolve, 1500); 
  });

  // Promise for IndexedDB load
  const dbPromise = (async () => {
    try {
      const savedVideos = await idbKeyval.get('uploadedVideos');
      const savedActiveId = await idbKeyval.get('activeVideoId');
      if (savedVideos && savedVideos.length > 0) {
        uploadedVideos = savedVideos.map(v => ({
          ...v,
          url: URL.createObjectURL(v.file) // Re-create Blob URL from persisted File
        }));
      }
      if (savedActiveId) {
        activeVideoId = savedActiveId;
      }
    } catch(err) {
      console.error('Error loading from IndexedDB', err);
    }
  })();

  // Await both parallel tasks
  await Promise.all([authPromise, dbPromise]);

  // Restore state logic
  if (uploadedVideos.length > 0) {
    updateVideoLibraryUI();
    if (activeVideoId) {
      window.switchActiveVideo(activeVideoId);
    }
  }

  // Remove overlay
  if (bootOverlay) {
    bootOverlay.classList.add('hidden');
    setTimeout(() => bootOverlay.remove(), 500);
  }
});
```
*Note: Make sure to comment out or modify the original `onAuthStateChanged` hook in `setupAuthListeners` if this new boot hook replaces its primary role.*

**Step 3: Add `saveStateToIndexedDB()` to state-changing functions**

Inject `saveStateToIndexedDB();` at the end of the success paths in:
- `handleVideoUpload` (after `uploadedVideos.push(newVideo)`)
- `window.switchActiveVideo`
- `window.deleteVideo`

**Step 4: Commit**

```bash
git add app.js
git commit -m "feat: implement unified boot and indexeddb sync"
```

### Task 4: Verify Persistence and Auth

**Step 1: Test locally**
1. Ensure `npm run dev` is running.
2. Upload a video and sign in with Google or an account.
3. Refresh the page. 
4. Expected: The "Loading..." spinner appears. It smoothly transitions straight to the logged-in state with the correct video and leaderboard loaded. No missing videos, no flashing "Guest Mode".
