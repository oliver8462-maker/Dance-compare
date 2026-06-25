# Stricter Scoring and Guest Cloud Sync Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Calibrate similarity scoring to a stricter standard (divisor 2.5) and integrate Firebase Anonymous Auth for persistent cloud storage in Guest Mode.

**Architecture:** We will adjust the math divisor in `math-utils.js` and its tests. For Guest Mode, we use Firebase Anonymous Auth to associate a UID with guests, uploading their videos to Firebase Storage/Firestore, and persisting sessions across restarts. We also fix the IndexedDB boot loader crash for cloud-synced videos.

**Tech Stack:** Vanilla JS, Firebase (Auth, Storage, Firestore), IndexedDB (`idb-keyval`).

---

## Proposed Changes

### Task 1: Stricter Scoring in `math-utils.js`

**Files:**
- Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/math-utils.js#L57-L58) (Change `2.7` to `2.5`)
- Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/math-utils.js#L104) (Change `2.7` to `2.5`)
- Modify: [math-utils.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/math-utils.js#L132) (Change `2.7` to `2.5`)
- Test: [tests/math.test.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/tests/math.test.js#L60-L62)

**Step 1: Write the failing test**
Modify [tests/math.test.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/tests/math.test.js#L60-L62):
```javascript
const expectedSim = Math.max(0, 1 - (Math.PI / 2) / 2.5);
assert.ok(Math.abs(leftElbowSim - expectedSim) < 1e-5, `LEFT_ELBOW similarity should be calibrated with 2.5 divisor, got ${leftElbowSim}, expected ${expectedSim}`);
```

**Step 2: Run test to verify it fails**
Run: `node tests/math.test.js`
Expected output: Fail due to mismatch (2.7 vs 2.5 calculation in code).

**Step 3: Write minimal implementation**
Modify [math-utils.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/math-utils.js):
Replace all `/ 2.7` divisions inside `computeJointSimilarity`, `computeJointSimilarities`, and `computeJointDetails` with `/ 2.5`.

**Step 4: Run test to verify it passes**
Run: `node tests/math.test.js`
Expected output: Pass with "All math tests passed successfully!".

**Step 5: Commit**
```bash
git add math-utils.js tests/math.test.js
git commit -m "feat: calibrate similarity divisor to 2.5 for stricter scoring"
```

---

### Task 2: Fix Boot Data Restore crash in `app.js`

**Files:**
- Modify: [app.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js#L457-L460)

**Step 1: Write minimal implementation**
Modify [app.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js#L457-L460) in the `DOMContentLoaded` IndexedDB reload promise:
```javascript
      if (savedVideos && savedVideos.length > 0) {
        uploadedVideos = savedVideos.map(v => ({
          ...v,
          url: v.file ? URL.createObjectURL(v.file) : v.url
        }));
      }
```

**Step 2: Verify code compiling and check console**
(Will be verified in manual testing stage).

**Step 3: Commit**
```bash
git add app.js
git commit -m "fix: check for existence of file object before creating Blob URL to prevent guest sync crash"
```

---

### Task 3: Integrate Anonymous Authentication in `app.js`

**Files:**
- Modify: [app.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js#L6) (Import `signInAnonymously`)
- Modify: [app.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js#L1556-L1562) (Click guest button handler)

**Step 1: Import `signInAnonymously`**
Add `signInAnonymously` to the import list from Firebase Auth:
```javascript
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
```

**Step 2: Update Guest Button Listener**
Modify `#guest-btn` listener in `setupAuthListeners()`:
```javascript
  guestBtn.addEventListener('click', async () => {
    hideAuthError();
    try {
      await signInAnonymously(auth);
      authOverlay.classList.add('hidden');
    } catch (err) {
      console.error('Anonymous sign in failed, continuing as offline guest:', err);
      isGuest = true;
      currentUser = null;
      authOverlay.classList.add('hidden');
      updateAuthUI();
    }
  });
```

**Step 3: Commit**
```bash
git add app.js
git commit -m "feat: sign in anonymously on clicking guest button"
```

---

### Task 4: Update Auth State Observer and UI Flow

**Files:**
- Modify: [app.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js#L436-L446) (`DOMContentLoaded` auth promise)
- Modify: [app.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js#L1501-L1511) (`setupAuthListeners` auth state listener)
- Modify: [app.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js#L1672-L1681) (`updateAuthUI`)
- Modify: [app.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js#L1563-L1579) (`authActionBtn` click listener)

**Step 1: Update Auth Listeners**
Update `onAuthStateChanged` inside the DOMContentLoaded observer AND the `setupAuthListeners()` function to:
```javascript
      if (user) {
        currentUser = user;
        isGuest = user.isAnonymous;
        await checkNicknameAndPrompt();
        await syncCloudVideoLibrary();
      } else {
        currentUser = null;
        isGuest = false;
      }
```

**Step 2: Update Auth UI**
```javascript
function updateAuthUI() {
  authUserInfo.classList.remove('hidden');
  if (currentUser && !currentUser.isAnonymous) {
    authUserLabel.textContent = `👤 ${userNickname || currentUser.email}`;
    authActionBtn.textContent = '登出';
  } else if (isGuest || (currentUser && currentUser.isAnonymous)) {
    authUserLabel.textContent = `👤 ${userNickname || '訪客模式 (Guest)'}`;
    authActionBtn.textContent = '登入 / 註冊';
  }
}
```

**Step 3: Update Auth Action Button Click Handler**
```javascript
  authActionBtn.addEventListener('click', () => {
    if (currentUser && !currentUser.isAnonymous) {
      signOut(auth).then(() => {
        currentUser = null;
        isGuest = true;
        userNickname = '';
        localStorage.removeItem('guestNickname');
        updateAuthUI();
      });
    } else {
      authOverlay.classList.remove('hidden');
    }
  });
```

**Step 4: Commit**
```bash
git add app.js
git commit -m "feat: treat anonymous users as guests in the UI and allow upgrading to registered accounts"
```

---

## Verification Plan

### Automated Tests
- Run `node tests/math.test.js` to ensure the new 2.5 scoring divisor passes mathematical assertions.

### Manual Verification
1. Run local development server.
2. Access the site, click "以訪客身份直接體驗" (Guest Mode). Verify anonymous session is initialized (check Firestore `users` or browser local Storage).
3. Set a nickname, upload a dance video, and let the backend extract landmarks.
4. Complete a test dance session and check the rating summary.
5. Close the browser tab and reload the application.
6. Verify that the previously uploaded video is automatically retrieved from Firebase Storage/Firestore and is selectable from the Video Library without re-uploading.
7. Click "登入 / 註冊" from Guest Mode to verify that the Auth Overlay displays and allows registering or signing in.
