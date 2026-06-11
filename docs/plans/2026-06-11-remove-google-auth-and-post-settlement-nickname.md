# Remove Google Auth & Post-Settlement Nickname Flow Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Remove the Google Sign-in option and defer user nickname input until after score settlement, allowing the user to either confirm and upload the score or cancel and view the summary without uploading. Also resolve Firestore save timeouts by enabling long polling and increasing the timeout limit.

**Architecture:** Remove Google Sign-in references from index.html, style.css, and app.js. Modify the nickname overlay trigger to run after the game finishes, prefilling existing nicknames and adding a cancel/skip button to allow bypassing the upload step. Use `initializeFirestore` with `forceLongPolling: true` to avoid WebSocket-related connection timeouts and increase the write timeout to 10 seconds.

**Tech Stack:** HTML5, CSS3, Vanilla JS, Firebase (Auth/Firestore), IndexedDB.

---

### Task 1: Modify index.html (Remove Google Button & Update Nickname overlay)

**Files:**
- Modify: [index.html](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/index.html)

**Step 1: Remove Google Login Button**
Locate and delete the Google Sign-in button element:
```html
                <button id="google-login-btn" class="btn btn-google">
                    ...
                    使用 Google 帳號登入
                </button>
```

**Step 2: Update Nickname Overlay Actions**
Locate the `#nickname-form` in `index.html`. Replace the single submit button:
```html
                    <button type="submit" id="nickname-submit-btn" class="btn btn-primary btn-large auth-submit-btn">確認儲存</button>
```
With a container holding both confirm and cancel buttons:
```html
                    <div class="nickname-actions">
                        <button type="submit" id="nickname-submit-btn" class="btn btn-primary btn-large auth-submit-btn">確認儲存並上傳</button>
                        <button type="button" id="nickname-cancel-btn" class="btn btn-secondary btn-large auth-cancel-btn">暫不上傳</button>
                    </div>
```

---

### Task 2: Modify style.css (Remove Google Button Styles & Style Nickname Cancel Button)

**Files:**
- Modify: [style.css](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/style.css)

**Step 1: Remove Google styles**
Delete CSS styles for `.btn-google` and `.google-icon` (located around line 1481-1509).

**Step 2: Add styles for nickname actions and cancel button**
At the end of the file, add the following classes:
```css
/* Nickname post-settlement buttons layout */
.nickname-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  margin-top: 1rem;
}

.nickname-actions .btn {
  flex: 1;
  margin-top: 0;
}

.auth-cancel-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text-muted);
}

.auth-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-main);
  border-color: rgba(255, 255, 255, 0.3);
}
```

---

### Task 3: Modify app.js (Remove Google Auth and Decouple Nickname Prompt from Login)

**Files:**
- Modify: [app.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js)

**Step 1: Clean up imports and configure Long Polling**
* Remove `GoogleAuthProvider` and `signInWithPopup` from the Firebase auth ES module import line (around line 6).
* Replace `getFirestore` with `initializeFirestore` in the Firebase firestore ES module import (around line 7).
* Initialize the database using `initializeFirestore` with `forceLongPolling` configuration:
```javascript
// Before:
// const db = getFirestore(firebaseApp);

// After:
const db = initializeFirestore(firebaseApp, {
  forceLongPolling: true
});
```

**Step 2: Remove Google button references and event listeners**
Delete the event listener binding logic for `googleLoginBtn` (around line 1442-1472).

**Step 3: Decouple Nickname prompting from Login Flow**
* In `checkNicknameAndPrompt()`:
  - Remove the lines that set `nicknameInput.value = '';` and `nicknameOverlay.classList.remove('hidden');`.
  - Instead, the function should only check if a nickname exists, assign it to `userNickname`, update the auth UI, and hide the overlay if it's already hidden.
  - Modify `checkNicknameAndPrompt` to look like:
```javascript
async function checkNicknameAndPrompt() {
  if (currentUser) {
    if (isNewSignup) {
      isNewSignup = false;
      userNickname = '';
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists() && userDoc.data().nickname) {
        userNickname = userDoc.data().nickname;
        updateAuthUI();
      } else {
        userNickname = '';
      }
    } catch (err) {
      console.error('Error fetching user nickname:', err);
      userNickname = '';
    }
  } else if (isGuest) {
    const saved = localStorage.getItem('guestNickname');
    if (saved) {
      userNickname = saved;
      updateAuthUI();
    } else {
      userNickname = '';
    }
  }
}
```
* Under `setupAuthListeners()`:
  - Inside `guestBtn.addEventListener('click', ...)`: Remove the call to `checkNicknameAndPrompt()`. Just set `isGuest = true; currentUser = null; authOverlay.classList.add('hidden'); updateAuthUI();`.

---

### Task 4: Implement Post-Settlement Nickname Flow and Increase Timeout in app.js

**Files:**
- Modify: [app.js](file:///c:/Users/user1/OneDrive/桌面/新專題跳舞/app.js)

**Step 1: Update endDanceSession**
Locate the end of `endDanceSession()` (around line 1184).
Replace the direct submission line:
```javascript
  // Submit score to Firestore
  handleScoreSubmission(finalAverage, grade);
```
With the prompt trigger:
```javascript
  // Open post-settlement nickname setup flow
  promptNicknameAndSubmit(finalAverage, grade);
```

**Step 2: Add promptNicknameAndSubmit and bind the Skip/Cancel button**
Implement `promptNicknameAndSubmit(score, grade)` and add the listener for `#nickname-cancel-btn`:
```javascript
let pendingScoreSubmission = null; // Store { score, grade } temporarily

function promptNicknameAndSubmit(score, grade) {
  pendingScoreSubmission = { score, grade };
  
  const nicknameOverlay = document.getElementById('nickname-overlay');
  const nicknameInput = document.getElementById('nickname-input');
  const nicknameError = document.getElementById('nickname-error');
  
  if (nicknameError) nicknameError.classList.add('hidden');
  
  // Pre-fill nickname if already known
  if (nicknameInput) {
    nicknameInput.value = userNickname || '';
  }
  
  // Show the nickname modal
  if (nicknameOverlay) {
    nicknameOverlay.classList.remove('hidden');
  }
}
```

**Step 3: Modify Nickname Form Submit Handler & Increase Timeout**
Update the form submission handler inside `setupAuthListeners()` to support the post-settlement submission flow and increase the timeout limit to 10 seconds (10000ms):
```javascript
  // Nickname Form submission
  const nicknameOverlay = document.getElementById('nickname-overlay');
  const nicknameForm = document.getElementById('nickname-form');
  const nicknameInput = document.getElementById('nickname-input');
  const nicknameError = document.getElementById('nickname-error');
  const nicknameCancelBtn = document.getElementById('nickname-cancel-btn');

  if (nicknameForm) {
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
          // Save to Firestore users collection with 10-second timeout
          await timeoutPromise(
            setDoc(doc(db, 'users', currentUser.uid), {
              nickname: nickname,
              updatedAt: serverTimestamp()
            }),
            10000,
            "儲存超時，請檢查您的網路連線。"
          );
          userNickname = nickname;
        } else {
          // Save to LocalStorage for guest
          localStorage.setItem('guestNickname', nickname);
          userNickname = nickname;
        }

        updateAuthUI();
        nicknameOverlay.classList.add('hidden');

        // Submit pending score if exists
        if (pendingScoreSubmission) {
          await handleScoreSubmission(pendingScoreSubmission.score, pendingScoreSubmission.grade);
          pendingScoreSubmission = null;
        }
        
        // Refresh leaderboards
        refreshSummaryLeaderboard();
        refreshLeaderboard();
      } catch (err) {
        console.error('Failed to save nickname:', err);
        nicknameError.textContent = err.message && err.message.includes('儲存超時')
          ? err.message
          : '儲存失敗，請檢查網路連線。';
        nicknameError.classList.remove('hidden');
      } finally {
        const submitBtn = document.getElementById('nickname-submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = '確認儲存並上傳';
      }
    });
  }

  // Cancel/Skip button handler
  if (nicknameCancelBtn) {
    nicknameCancelBtn.addEventListener('click', () => {
      if (nicknameOverlay) {
        nicknameOverlay.classList.add('hidden');
      }
      pendingScoreSubmission = null; // Clear pending
      
      // Still refresh leaderboards to show current top scores
      refreshSummaryLeaderboard();
      refreshLeaderboard();
      
      summaryScoreUploadStatus.className = 'summary-score-upload-status guest';
      summaryScoreUploadStatus.textContent = '💡 分數未上傳。重新測試或上傳新影片可再次挑戰！';
      summaryScoreUploadStatus.classList.remove('hidden');
    });
  }
```

---

### Task 5: Verification and Clean Up

**Step 1: Check unit tests**
Run: `node tests/math.test.js`
Expected: PASS

**Step 2: Commit all changes**
```bash
git add index.html style.css app.js
git commit -m "feat: remove Google Auth, enable long polling & implement post-settlement nickname prompt flow"
```
