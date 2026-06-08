# 2026-06-04 Google Authentication Design

## Goal Description
Add Google Sign-In capability to the DanceAI Pose Scorer application, allowing users to log in with their Google accounts, store their high scores, and see their names on the leaderboard alongside traditional email/password and guest logins.

## Proposed Components & UI Changes

### 1. HTML Markup (`index.html`)
* Add a styled "使用 Google 帳號登入" (Sign in with Google) button under the Email & Password form, but above the Guest button inside the `#auth-overlay` auth card.
* Embed Google's brand icon SVG inside the button.

### 2. CSS Styles (`style.css`)
* Add styling for `.btn-google` to match the dark glassmorphic design system but keep Google branding recognizable (white background, `#1e293b` text).
* Style hover transitions, translations, and shadow glow.

### 3. Firebase SDK integration (`app.js`)
* Import `GoogleAuthProvider` and `signInWithPopup` from the Firebase CDN.
* Instantiate `GoogleAuthProvider` and bind click handlers.

## Verification Plan

### Manual Verification
1. Click the Google Sign-in button.
2. Verify Google authentication popup appears.
3. Complete login, check that overlay closes, and email displays on the header.
4. Verify scores can be successfully submitted to Firestore.
