# 2026-06-04 User Authentication & Firestore Leaderboard Design

## Goal Description
Enable user email authentication (signup, login, logout) and guest mode. Save user scores to Firestore and display video-specific high score leaderboards to drive engagement.

## Architecture & Data Flow

```mermaid
graph TD
    A[User Opens App] --> B{Has Configuration & Session?}
    B -->|No| C[Show Auth Modal Overlay]
    B -->|Yes / Cookie| D[Load App directly as Logged In]
    C -->|Sign Up / Login| E[Firebase Auth Service]
    C -->|Guest Button| F[Set Guest State & Hide Modal]
    E -->|Success| G[Set Logged In State & Hide Modal]
    G --> H[Fetch Leaderboard for Active Video]
    F --> H
    
    I[Complete Dance Session] --> J{State: Logged In?}
    J -->|Yes| K[Write Score to Firestore 'scores']
    J -->|No| L[Show Local Score Only + Suggest Register Badge]
    K --> M[Refresh Leaderboard]
```

## Proposed Components & UI Changes

### 1. HTML Markup (`index.html`)
*   **Auth Overlay (`#auth-overlay`)**: A fixed overlay window matching design system typography with dark glassmorphism styling.
*   **Leaderboard container (`#leaderboard-container`)**: Appended below the Video Library inside the `#upload-section` card.

### 2. CSS Styles (`style.css`)
*   Overlay styles (`#auth-overlay`), glass card design, inputs, login buttons, and register selectors.
*   Leaderboard styling (`.leaderboard-list`, `.leaderboard-row`, `.leaderboard-rank`, `.leaderboard-email`, `.leaderboard-score`).

### 3. Firebase SDK Setup
We will initialize Firebase directly in `app.js` using the developer configuration provided:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAPfEISg12wCGHG4tSr_i9h7UknfJvc62I",
  authDomain: "dance-b4610.firebaseapp.com",
  projectId: "dance-b4610",
  storageBucket: "dance-b4610.firebasestorage.app",
  messagingSenderId: "1012685266500",
  appId: "1:1012685266500:web:54c1e22fdf57c26ab32611",
  measurementId: "G-SY7762V3W8"
};
```

### 4. Firestore Schema & Collections

#### Collection: `scores`
Documents:
```json
{
  "userId": "firebase_auth_uid",
  "email": "user@example.com",
  "videoName": "kpop_dance.mp4",
  "score": 88.5,
  "grade": "A",
  "timestamp": "serverTimestamp"
}
```

## Verification Plan

### Manual Verification
1. Open app, verify authentication overlay appears.
2. Click "Guest Mode", verify main interface opens and header shows "👤 訪客模式 (Guest)".
3. Complete a dance run as a guest; verify no firebase call is made but user sees scores.
4. Click "Logout" or "Sign In" link to prompt login window, register a new account.
5. Verify header shows the registered email.
6. Complete a dance run, verify score is saved to Firestore.
7. Switch videos and check that the leaderboard updates to reflect other top scores of the active video.
