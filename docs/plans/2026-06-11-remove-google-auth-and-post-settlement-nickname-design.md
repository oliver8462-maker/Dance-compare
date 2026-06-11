# 2026-06-11 Remove Google Auth & Post-Settlement Nickname Flow Design

## Overview
This design document describes two main changes to the DanceAI Pose Scorer application:
1. Removal of the Google Sign-In authentication method.
2. Uniformly prompting the user for their nickname after the dance session ends (score settlement phase) rather than at login/guest entry, and only uploading and showing their score on the leaderboard after the nickname is submitted.

---

## Proposed Changes

### 1. Remove Google Sign-In
* **HTML (`index.html`)**: Delete the `#google-login-btn` element from the auth card.
* **CSS (`style.css`)**: Remove styling rules for `.btn-google` and `.google-icon` to clean up the stylesheet.
* **JS (`app.js`)**:
  * Remove `GoogleAuthProvider` and `signInWithPopup` from the Firebase Auth imports.
  * Remove the event listener binding and logic for `#google-login-btn`.

---

### 2. Post-Settlement Nickname Flow
To improve user experience, we will no longer prompt users for nicknames immediately after login or guest access. Instead, they can play immediately. The nickname prompt will appear when the game ends and score settlement is processed.

#### HTML Changes (`index.html`)
* Add a cancel/skip button inside the `#nickname-overlay` form to allow users to view their final score report without uploading it to the leaderboard:
  ```html
  <div class="nickname-actions">
      <button type="submit" id="nickname-submit-btn" class="btn btn-primary btn-large auth-submit-btn">確認儲存並上傳</button>
      <button type="button" id="nickname-cancel-btn" class="btn btn-secondary btn-large auth-cancel-btn">暫不上傳</button>
  </div>
  ```

#### CSS Changes (`style.css`)
* Add styles for `.nickname-actions` (flexbox layout for alignment) and the cancel button `.auth-cancel-btn` (subtle border, glass-compatible style matching `--btn-secondary`).

#### JS Changes (`app.js`)
* **State & Initial Loading**:
  * Remove the prompt-overlay trigger from `checkNicknameAndPrompt()`. This function will now only fetch/set `userNickname` from Firestore (for logged-in users) or LocalStorage (for guests) but *will not* display the overlay modal.
* **Game Settlement (`endDanceSession`)**:
  * Update `endDanceSession()` to display the summary screen (`#summary-section`) and immediately trigger the nickname entry overlay.
  * Prefill the `#nickname-input` with the current `userNickname`.
  * Store the current session's final score and grade in local parameters.
* **Nickname Form Submit / Cancel Handlers**:
  * Implement logic when the form is submitted:
    1. Save/update the nickname (Firestore for logged-in user, LocalStorage for guest).
    2. Set `userNickname` in memory.
    3. Upload the final score via `handleScoreSubmission(score, grade)`.
    4. Refresh both the central leaderboard and the summary side-panel leaderboard.
    5. Hide the `#nickname-overlay`.
  * Implement logic when "暫不上傳" (Cancel) is clicked:
    1. Hide the `#nickname-overlay`.
    2. Display a status message: "💡 您可以重新測試或上傳新影片。" (Score is not uploaded).
    3. Still load/refresh the leaderboards in the summary so they see the historical rankings.

---

## Verification Plan

### Manual Verification Flow
1. **Initial Login**: Log in with an email account or enter Guest mode. Confirm no nickname prompt appears.
2. **Play Game**: Select a video, pass the count down, let the video play to the end.
3. **Score Settlement & Prompt**:
   * Verify `#summary-section` renders.
   * Verify `#nickname-overlay` displays on top of the screen.
   * If a nickname already exists, check if it's prefilled.
4. **Action: Cancel (暫不上傳)**:
   * Click the "暫不上傳" button.
   * Verify the overlay disappears.
   * Verify the score is not submitted to Firestore.
   * Verify the leaderboard displays correctly.
5. **Action: Confirm (確認儲存並上傳)**:
   * Play again.
   * At settlement, enter a new nickname (or keep pre-filled).
   * Click "確認儲存並上傳".
   * Verify the nickname updates (local storage/database).
   * Verify the score is uploaded to Firestore.
   * Verify the updated score appears in the leaderboards.
