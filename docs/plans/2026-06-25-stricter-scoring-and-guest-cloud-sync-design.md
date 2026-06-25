# Design Document: Stricter Scoring and Guest Cloud Sync

This document details the system modifications for calibrated stricter scoring and Firebase Anonymous Authentication to persist uploaded videos for guest users.

## 1. Calibrated Stricter Scoring

To make the scoring standard more challenging and precise, we decrease the joint similarity divisor from `2.7` to `2.5`.

### 1.1 Similarity Formula
For any joint $j$, the joint similarity $S_j$ based on the angle difference $\Delta\theta_j = |\theta_{ref, j} - \theta_{user, j}|$ is calculated as:
$$S_j = \max\left(0, 1 - \frac{\Delta\theta_j}{2.5}\right)$$

This reduces the maximum tolerated joint angle difference from $\approx 154.7^\circ$ to $\approx 143.2^\circ$. Any angle difference beyond this will yield a similarity score of $0$.

### 1.2 Impacted Functions in `math-utils.js`
- `computeJointSimilarity`
- `computeJointSimilarities`
- `computeJointDetails`

### 1.3 Testing Verification
The test file `tests/math.test.js` will be updated to verify the `2.5` divisor calibration.

---

## 2. Firebase Anonymous Authentication for Guest Mode

To allow guest users to preserve their uploaded videos in the cloud without requiring them to register an email account, we introduce Firebase Anonymous Authentication.

### 2.1 Authentication and Flow Changes
1. **Import `signInAnonymously`**: Imported from `firebase-auth`.
2. **Guest Entry (`#guest-btn` click)**: Calls `signInAnonymously(auth)`.
3. **Observer Integration (`onAuthStateChanged`)**:
   - Sets `isGuest = user.isAnonymous`.
   - Fetches/prompts nicknames appropriately.
   - Triggers `syncCloudVideoLibrary()` to sync cloud-saved videos from Firestore.
4. **Header Navigation UI**:
   - Shows "Guest Mode (訪客模式)" or the custom nickname if they are signed in anonymously.
   - Displays "登入 / 註冊" (Login / Register) as the action. Clicking it opens the auth overlay modal to let the user log in or sign up.

### 2.2 Boot Data Restore Fix
When restoring the video library from IndexedDB on boot:
If a video was synced from the cloud, its local `file` field is `null`. The mapping logic will fall back to using its cloud `url`:
```javascript
url: v.file ? URL.createObjectURL(v.file) : v.url
```
This prevents initialization crashes.
