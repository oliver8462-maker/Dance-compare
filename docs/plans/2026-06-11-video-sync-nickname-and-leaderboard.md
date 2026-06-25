# Video Sync, Nickname Integration, and Leaderboard Layout Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement cross-device video sharing via Firebase Storage, user nickname setup for all login modes, and a detailed three-column desktop summary layout displaying segment scores, core results, and leaderboards.

**Architecture:** Use Firebase Storage to host uploaded video files and Firestore to cache compressed, pruned landmark coordinate sequences (16 joints, 4 decimal places) under the `videos` collection. Enforce a nickname lookup/creation barrier on login/guest access, storing names in the `users` Firestore collection or local storage. Re-engineer the summary modal to a CSS grid three-column layout on computers (left: segment scores, middle: stats/AI feedback, right: leaderboard).

**Tech Stack:** Vanilla JavaScript, HTML5, CSS Grid/Flexbox, Firebase Auth, Firestore, Firebase Storage.

---

### Task 1: HTML Structures for Nickname Modal & Three-Column Summary

**Files:**
* Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/index.html`

**Step 1: Add HTML markup for Nickname Setup Modal**
Inside `#app` but outside `#auth-overlay` and `.app-header`, append a nickname modal:
```html
        <!-- 暱稱輸入全螢幕遮罩 -->
        <div id="nickname-overlay" class="auth-overlay hidden">
            <div class="auth-card">
                <div class="auth-logo">✏️</div>
                <h2 class="auth-title">設定您的<span>暱稱</span></h2>
                <p class="auth-subtitle">請輸入排行榜與挑戰紀錄上顯示的暱稱</p>
                <div id="nickname-error" class="auth-error hidden"></div>
                <form id="nickname-form" class="auth-form" autocomplete="off">
                    <div class="auth-input-group">
                        <label for="nickname-input">暱稱 (2-15 個字元)</label>
                        <input type="text" id="nickname-input" placeholder="請輸入暱稱" required minlength="2" maxlength="15" />
                    </div>
                    <button type="submit" id="nickname-submit-btn" class="btn btn-primary btn-large auth-submit-btn">確認儲存</button>
                </form>
            </div>
        </div>
```

**Step 2: Update Summary Section HTML for Three-Column Layout**
Rewrite `#summary-section` to support three columns. Wrap `.summary-card` inside a container `.summary-container` that splits into panels on desktop.
Modify lines 183-235 in `index.html` to:
```html
            <section id="summary-section" class="summary-overlay hidden">
                <div class="summary-wrapper">
                    <!-- 左欄：區間評分 -->
                    <div class="summary-side-panel left-panel">
                        <h3>📊 每段動作詳細評分</h3>
                        <div id="segment-scores-list" class="segment-scores-list">
                            <!-- 動態生成區間分數 -->
                        </div>
                    </div>

                    <!-- 中欄：核心結算與回饋 -->
                    <div class="summary-card">
                        <div class="summary-icon">🏆</div>
                        <h2>舞蹈測試結算</h2>
                        
                        <div class="grade-container">
                            <div class="grade-circle">
                                <span id="final-grade">A</span>
                            </div>
                            <p class="grade-label">動作評等</p>
                        </div>

                        <div class="final-score-box">
                            <span class="final-score-label">總平均相似分數</span>
                            <div class="final-score-value">
                                <span id="final-score">85.4</span>
                                <span class="score-unit">分</span>
                            </div>
                        </div>

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
                            <div id="mistakes-timeline" class="mistakes-timeline"></div>
                        </div>

                        <div id="summary-score-upload-status" class="summary-score-upload-status hidden"></div>

                        <div class="summary-actions">
                            <button id="retry-btn" class="btn btn-secondary">重新測試</button>
                            <button id="new-video-btn" class="btn btn-primary">上傳新影片</button>
                        </div>
                    </div>

                    <!-- 右欄：排行榜 -->
                    <div class="summary-side-panel right-panel">
                        <h3>🏆 本片高手排行榜</h3>
                        <div id="summary-leaderboard-list" class="leaderboard-list">
                            <!-- 動態生成排行榜 -->
                        </div>
                    </div>
                </div>
            </section>
```

---

### Task 2: CSS Styling for Nickname Modal & Three-Column Summary

**Files:**
* Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/style.css`

**Step 1: Add Nickname Modal and Desktop Summary Styles**
Append layout styles:
```css
/* Nickname Overlay Styles */
#nickname-overlay {
  z-index: 300;
}

/* Summary Grid/Flex Wrapper for Desktop vs Mobile */
.summary-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
}

.summary-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 500px;
  margin: auto;
}

/* Summary Side Panels (Left & Right) */
.summary-side-panel {
  background: rgba(17, 25, 40, 0.75);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
  border-radius: 24px;
  padding: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  height: fit-content;
}

.summary-side-panel h3 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-glass);
  padding-bottom: 0.5rem;
}

/* Segment Scores List */
.segment-scores-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

/* Custom scrollbar for segment scores */
.segment-scores-list::-webkit-scrollbar {
  width: 4px;
}
.segment-scores-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.segment-score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.8rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  font-size: 0.82rem;
}

.segment-score-time {
  font-family: var(--font-numeric);
  color: var(--text-muted);
}

.segment-score-value {
  font-family: var(--font-numeric);
  font-weight: 700;
}

/* Segment score label coloring */
.segment-score-row.perfect .segment-score-value { color: var(--color-perfect); }
.segment-score-row.great .segment-score-value { color: var(--color-great); }
.segment-score-row.good .segment-score-value { color: var(--color-good); }
.segment-score-row.miss .segment-score-value { color: var(--color-miss); }

/* Desktop Media Query (Three-Column Layout) */
@media (min-width: 1024px) {
  .summary-wrapper {
    flex-direction: row;
    max-width: 1200px;
    align-items: stretch;
    justify-content: center;
  }
  .summary-side-panel {
    flex: 0 0 320px;
    height: 100%;
    align-self: stretch;
  }
  .summary-card {
    flex: 1;
    max-width: 500px;
    margin: 0;
  }
  .segment-scores-list {
    max-height: 520px;
  }
}
```

---

### Task 3: Landmark Compression & Firebase Storage Imports

**Files:**
* Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js`

**Step 1: Add Firebase Storage import statements**
Update lines 4-7 to import Firebase Storage methods:
```javascript
// Firebase SDK (v10 compat via CDN ES modules)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
```

**Step 2: Instantiate Storage**
Right after initializing `db` (line 22):
```javascript
const storage = getStorage(firebaseApp);
```

**Step 3: Define Landmark Compression and Pruning Functions**
Add helper functions to compress the `poseFeatures` array of frames:
```javascript
// Index array of the 16 landmarks used in similarity calculations
const CORE_LANDMARK_INDICES = [11, 12, 13, 14, 15, 16, 19, 20, 23, 24, 25, 26, 27, 28, 31, 32];

/**
 * Prunes and compresses landmarks array to minimize storage footprint.
 * Only keeps 16 core joints, rounds values to 4 decimal places.
 */
function compressPoseFeatures(features) {
  return features.map(f => {
    if (!f.landmarks) {
      return { time: f.time, landmarks: null };
    }
    // Only map the 16 core landmarks: format [index, x, y, visibility]
    const pruned = CORE_LANDMARK_INDICES.map(idx => {
      const p = f.landmarks[idx];
      if (!p) return [idx, 0, 0, 0];
      return [
        idx,
        parseFloat(p.x.toFixed(4)),
        parseFloat(p.y.toFixed(4)),
        parseFloat((p.visibility || 0).toFixed(4))
      ];
    });
    return { time: f.time, landmarks: pruned };
  });
}

/**
 * Restores compressed pose landmarks back to the 33-point structure required by math-utils.
 */
function decompressPoseFeatures(compressedFeatures) {
  return compressedFeatures.map(f => {
    if (!f.landmarks) {
      return { time: f.time, landmarks: null };
    }
    const restored = Array(33).fill(null);
    f.landmarks.forEach(([idx, x, y, vis]) => {
      restored[idx] = { x, y, z: 0, visibility: vis };
    });
    return { time: f.time, landmarks: restored };
  });
}
```

---

### Task 4: Post-Login Nickname Flow Integration

**Files:**
* Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js`

**Step 1: Introduce Nickname State Variables**
```javascript
let userNickname = ''; // Logged-in nickname or guest nickname
```

**Step 2: Bind Nickname Modal Form Events**
Add logic to prompt/save nickname after login or guest click.
In `setupAuthListeners()`:
```javascript
  // Nickname Form submission
  const nicknameOverlay = document.getElementById('nickname-overlay');
  const nicknameForm = document.getElementById('nickname-form');
  const nicknameInput = document.getElementById('nickname-input');
  const nicknameError = document.getElementById('nickname-error');

  nicknameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nickname = nicknameInput.value.trim();
    if (nickname.length < 2 || nickname.length > 15) {
      nicknameError.textContent = '暱稱長度必須為 2 到 15 個字元。';
      nicknameError.classList.remove('hidden');
      return;
    }

    try {
      nicknameError.classList.add('hidden');
      const submitBtn = document.getElementById('nickname-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = '儲存中...';

      if (currentUser) {
        // Save to Firestore users collection
        await setDoc(doc(db, 'users', currentUser.uid), {
          nickname: nickname,
          updatedAt: serverTimestamp()
        });
        userNickname = nickname;
      } else if (isGuest) {
        // Save to LocalStorage for guest
        localStorage.setItem('guestNickname', nickname);
        userNickname = nickname;
      }

      updateAuthUI();
      nicknameOverlay.classList.add('hidden');
    } catch (err) {
      console.error('Failed to save nickname:', err);
      nicknameError.textContent = '儲存失敗，請檢查網路連線。';
      nicknameError.classList.remove('hidden');
    } finally {
      const submitBtn = document.getElementById('nickname-submit-btn');
      submitBtn.disabled = false;
      submitBtn.textContent = '確認儲存';
    }
  });
```

**Step 3: Modify `updateAuthUI` & Check For Nickname on Auth State Changes**
Update `updateAuthUI` to show the nickname:
```javascript
function updateAuthUI() {
  authUserInfo.classList.remove('hidden');
  if (currentUser) {
    authUserLabel.textContent = `👤 ${userNickname || currentUser.email}`;
    authActionBtn.textContent = '登出';
  } else if (isGuest) {
    authUserLabel.textContent = `👤 ${userNickname || '訪客模式 (Guest)'}`;
    authActionBtn.textContent = '登入 / 註冊';
  }
}
```

Implement the checkNickname barrier logic:
```javascript
async function checkNicknameAndPrompt() {
  const nicknameOverlay = document.getElementById('nickname-overlay');
  const nicknameInput = document.getElementById('nickname-input');
  
  if (currentUser) {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists() && userDoc.data().nickname) {
        userNickname = userDoc.data().nickname;
        updateAuthUI();
        nicknameOverlay.classList.add('hidden');
      } else {
        // Show nickname prompt
        userNickname = '';
        nicknameInput.value = '';
        nicknameOverlay.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Error fetching user nickname:', err);
    }
  } else if (isGuest) {
    const saved = localStorage.getItem('guestNickname');
    if (saved) {
      userNickname = saved;
      updateAuthUI();
      nicknameOverlay.classList.add('hidden');
    } else {
      userNickname = '';
      nicknameInput.value = '';
      nicknameOverlay.classList.remove('hidden');
    }
  }
}
```
Call `checkNicknameAndPrompt()` inside `onAuthStateChanged` handler and guest-button click listener.
Replace guest click handler in `setupAuthListeners()`:
```javascript
  // Guest mode button
  guestBtn.addEventListener('click', () => {
    isGuest = true;
    currentUser = null;
    authOverlay.classList.add('hidden');
    checkNicknameAndPrompt();
  });
```
And inside `onAuthStateChanged` boot listener (line 299-310):
```javascript
  const authPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        isGuest = false;
        await checkNicknameAndPrompt();
        await syncCloudVideoLibrary();
      }
      updateAuthUI();
      unsubscribe(); // Only listen once for boot
      resolve();
    });
    setTimeout(resolve, 1500); 
  });
```

---

### Task 5: Cloud Video Upload & Storage Sync

**Files:**
* Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js`

**Step 1: Update handleVideoUpload to upload to Firebase Storage**
When `currentUser` is logged in, we upload the file to storage and save compressed landmarks to Firestore.
In `handleVideoUpload(file)` (after processing loop):
```javascript
  // Store processed video and features
  const newVideoId = 'vid_' + Date.now();
  let videoURL = URL.createObjectURL(file);
  let finalUrlForState = videoURL;
  let remoteStoragePath = null;

  if (currentUser) {
    preprocessStatusText.textContent = "正在將影片上傳至雲端儲存...";
    try {
      const storageRef = ref(storage, `videos/${currentUser.uid}/${newVideoId}_${file.name}`);
      const uploadSnapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadSnapshot.ref);
      
      finalUrlForState = downloadURL;
      remoteStoragePath = `videos/${currentUser.uid}/${newVideoId}_${file.name}`;
      
      // Compress landmarks
      const compressed = compressPoseFeatures(poseFeatures);
      
      // Save metadata & features to Firestore
      await addDoc(collection(db, 'videos'), {
        videoId: newVideoId,
        userId: currentUser.uid,
        name: file.name,
        url: downloadURL,
        storagePath: remoteStoragePath,
        poseFeatures: JSON.stringify(compressed),
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to sync video to Firebase:', err);
      alert('上傳至雲端失敗，但您的影片將仍保存在本地快取。');
    }
  }

  const newVideo = {
    id: newVideoId,
    name: file.name,
    file: file, // File reference (might be null when loaded from cloud)
    url: finalUrlForState,
    storagePath: remoteStoragePath,
    poseFeatures: [...poseFeatures]
  };
  uploadedVideos.push(newVideo);
  activeVideoId = newVideoId;
```

**Step 2: Implement syncCloudVideoLibrary**
On login / boot, load cloud videos:
```javascript
async function syncCloudVideoLibrary() {
  if (!currentUser) return;
  
  try {
    const q = query(
      collection(db, 'videos'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Avoid duplicates
      if (!uploadedVideos.some(v => v.id === data.videoId)) {
        // Decompress landmarks
        const decompressed = decompressPoseFeatures(JSON.parse(data.poseFeatures));
        
        uploadedVideos.push({
          id: data.videoId,
          name: data.name,
          file: null, // Remote file has no local File object
          url: data.url,
          storagePath: data.storagePath || null,
          poseFeatures: decompressed
        });
      }
    });
    
    updateVideoLibraryUI();
    saveStateToIndexedDB();
  } catch (err) {
    console.error('Failed to sync cloud video library:', err);
  }
}
```

**Step 3: Modify deleteVideo to delete from cloud**
When deleting a video, also delete its Cloud doc and Storage asset.
Replace `window.deleteVideo`:
```javascript
window.deleteVideo = async function(videoId, event) {
  if (event) event.stopPropagation();
  
  const videoIndex = uploadedVideos.findIndex(v => v.id === videoId);
  if (videoIndex === -1) return;

  const targetVideo = uploadedVideos[videoIndex];
  
  // 1. Delete from Cloud if logged in
  if (currentUser) {
    try {
      // Find Firestore document
      const q = query(
        collection(db, 'videos'),
        where('videoId', '==', videoId),
        where('userId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnapshot) => {
        // Delete document
        await deleteDoc(docSnapshot.ref);
      });
      
      // Delete from Firebase Storage
      if (targetVideo.storagePath) {
        const fileRef = ref(storage, targetVideo.storagePath);
        await deleteObject(fileRef);
      }
    } catch (err) {
      console.warn('Failed to delete cloud assets (might be guest video or connection issue):', err);
    }
  }

  // Free blob URL memory
  if (targetVideo.url && targetVideo.url.startsWith('blob:')) {
    URL.revokeObjectURL(targetVideo.url);
  }
  
  // Remove from state array
  uploadedVideos.splice(videoIndex, 1);

  if (activeVideoId === videoId) {
    if (uploadedVideos.length > 0) {
      window.switchActiveVideo(uploadedVideos[0].id);
    } else {
      activeVideoId = null;
      resetToUploadState();
    }
  } else {
    updateVideoLibraryUI();
  }
  saveStateToIndexedDB();
};
```

---

### Task 6: Segment Scoring Tracking & Nickname-based Score Submission

**Files:**
* Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js`

**Step 1: Declare segmentScores array variable**
Add variable in state (near line 40):
```javascript
let segmentScores = []; // Stores objects { timeStart, timeEnd, score, rating }
```

**Step 2: Collect segment scores in `evaluateSegmentScore`**
Every 1.5 seconds, store the interval scores.
Modify `evaluateSegmentScore()` (around line 785):
```javascript
function evaluateSegmentScore() {
  if (frameScores.length === 0) return;

  const average = frameScores.reduce((a, b) => a + b, 0) / frameScores.length;
  frameScores = []; // Reset for next 1.5 seconds

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

  // Push to segmentScores array
  const segmentCount = segmentScores.length;
  segmentScores.push({
    timeStart: segmentCount * 1.5,
    timeEnd: (segmentCount + 1) * 1.5,
    score: Math.round(average),
    rating: rating
  });

  // Create floating bubble DOM element
  const bubble = document.createElement('div');
  bubble.className = `feedback-bubble ${className}`;
  bubble.textContent = rating;
  feedbackContainer.appendChild(bubble);

  // Remove after CSS animation ends
  setTimeout(() => {
    bubble.remove();
  }, 1200);
}
```

**Step 3: Reset segmentScores on test initiation**
Add `segmentScores = [];` to `initiateDanceTest()`:
```javascript
async function initiateDanceTest() {
  isTestingState = true;
  isPlayingState = false;
  frameScores = [];
  allScores = [];
  segmentScores = [];
...
```

**Step 4: Update handleScoreSubmission to save Nicknames for Guest and Users**
Ensure guest scores are also saved to Firestore.
Replace `handleScoreSubmission`:
```javascript
async function handleScoreSubmission(score, grade) {
  if (!currentUser && !userNickname) {
    // If guest doesn't have nickname yet
    summaryScoreUploadStatus.className = 'summary-score-upload-status guest';
    summaryScoreUploadStatus.innerHTML = '💡 填寫暱稱即可上傳分數至排行榜！';
    summaryScoreUploadStatus.classList.remove('hidden');
    return;
  }

  const activeVideo = uploadedVideos.find(v => v.id === activeVideoId);
  const videoName = activeVideo ? activeVideo.name : 'unknown';

  try {
    await addDoc(collection(db, 'scores'), {
      userId: currentUser ? currentUser.uid : `guest_${Date.now()}`,
      nickname: userNickname || '訪客',
      videoName: videoName,
      score: parseFloat(score.toFixed(1)),
      grade: grade,
      timestamp: serverTimestamp()
    });

    summaryScoreUploadStatus.className = 'summary-score-upload-status success';
    summaryScoreUploadStatus.textContent = '✓ 分數已成功上傳排行榜！';
    summaryScoreUploadStatus.classList.remove('hidden');
  } catch (error) {
    console.error('Failed to submit score to Firestore:', error);
    summaryScoreUploadStatus.className = 'summary-score-upload-status guest';
    summaryScoreUploadStatus.textContent = '⚠ 分數上傳失敗，請檢查網路連線。';
    summaryScoreUploadStatus.classList.remove('hidden');
  }
}
```

---

### Task 7: Render Segment Scores & Leaderboards in Summary Panels

**Files:**
* Modify: `c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js`

**Step 1: Render Segment Scores inside Left Panel**
In `endDanceSession()`, populate the Left panel list `#segment-scores-list`:
```javascript
  // Render segment scores list
  const segmentScoresList = document.getElementById('segment-scores-list');
  if (segmentScoresList) {
    if (segmentScores.length === 0) {
      segmentScoresList.innerHTML = '<p class="leaderboard-empty">無評分資料</p>';
    } else {
      segmentScoresList.innerHTML = segmentScores.map(seg => {
        const timeStr = `${Math.floor(seg.timeStart / 60).toString().padStart(2, '0')}:${Math.floor(seg.timeStart % 60).toString().padStart(2, '0')} - ${Math.floor(seg.timeEnd / 60).toString().padStart(2, '0')}:${Math.floor(seg.timeEnd % 60).toString().padStart(2, '0')}`;
        const ratingClass = seg.rating.toLowerCase();
        return `
          <div class="segment-score-row ${ratingClass}">
            <span class="segment-score-time">${timeStr}</span>
            <span class="segment-score-value">${seg.score} 分 (${seg.rating})</span>
          </div>
        `;
      }).join('');
    }
  }
```

**Step 2: Fetch and Render Summary Leaderboard inside Right Panel**
Add helper `refreshSummaryLeaderboard` and call it in `endDanceSession()`:
```javascript
async function refreshSummaryLeaderboard() {
  const summaryLeaderboardList = document.getElementById('summary-leaderboard-list');
  if (!summaryLeaderboardList) return;

  const activeVideo = uploadedVideos.find(v => v.id === activeVideoId);
  if (!activeVideo) {
    summaryLeaderboardList.innerHTML = '<p class="leaderboard-empty">無選定影片</p>';
    return;
  }

  const videoName = activeVideo.name;

  try {
    const scoresQuery = query(
      collection(db, 'scores'),
      where('videoName', '==', videoName),
      orderBy('score', 'desc'),
      limit(5)
    );

    const snapshot = await getDocs(scoresQuery);

    if (snapshot.empty) {
      summaryLeaderboardList.innerHTML = '<p class="leaderboard-empty">尚無挑戰紀錄，快來搶下第一名！</p>';
      return;
    }

    let html = '';
    let rank = 1;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isSelf = (currentUser && data.userId === currentUser.uid) || (!currentUser && data.nickname === userNickname);
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
      const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString('zh-TW') : '';

      html += `
        <div class="leaderboard-row ${isSelf ? 'self-row' : ''}">
          <span class="leaderboard-rank ${rankClass}">${rankEmoji}</span>
          <span class="leaderboard-email">${data.nickname || '訪客'}${isSelf ? ' (你)' : ''}</span>
          <span class="leaderboard-score">${data.score}</span>
          <span class="leaderboard-grade">${data.grade}</span>
          <span class="leaderboard-date">${dateStr}</span>
        </div>
      `;
      rank++;
    });

    summaryLeaderboardList.innerHTML = html;
  } catch (error) {
    console.error('Failed to fetch summary leaderboard:', error);
    summaryLeaderboardList.innerHTML = '<p class="leaderboard-empty">排行榜載入失敗，請稍後再試。</p>';
  }
}
```
Call `refreshSummaryLeaderboard()` right before showing the summary overlay in `endDanceSession()`.

**Step 3: Update `refreshLeaderboard` to display nicknames instead of emails**
Update `refreshLeaderboard()` to fetch `data.nickname` instead of `maskEmail(data.email)`.
```javascript
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isSelf = (currentUser && data.userId === currentUser.uid) || (!currentUser && data.nickname === userNickname);
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
      const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString('zh-TW') : '';

      html += `
        <div class="leaderboard-row ${isSelf ? 'self-row' : ''}">
          <span class="leaderboard-rank ${rankClass}">${rankEmoji}</span>
          <span class="leaderboard-email">${data.nickname || '訪客'}${isSelf ? ' (你)' : ''}</span>
          <span class="leaderboard-score">${data.score}</span>
          <span class="leaderboard-grade">${data.grade}</span>
          <span class="leaderboard-date">${dateStr}</span>
        </div>
      `;
      rank++;
    });
```

---

### Task 8: Verification & Cleanup

**Files:**
* Modify: `tests/math.test.js` or manual verification

**Step 1: Check unit tests**
Ensure existing angle calculation tests still pass perfectly.
Run: `npm test` or `npm run test`
Expected: All tests pass.

**Step 2: Launch Dev Server & Manual Test**
Verify the nickname barrier, video sync, delete logic, and desktop summary layout visually.
Cwd: `c:/Users/user1/OneDrive/桌面/新專題跳舞`
Run: `npm run dev`
Expected: Serves without console exceptions.
