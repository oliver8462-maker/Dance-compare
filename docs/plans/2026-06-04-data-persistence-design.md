# Data Persistence & Unified Boot Sequence Design

## Goal
Solve the problem where uploaded videos and leaderboards disappear upon refreshing the webpage, and mask the visual delay (flashing "Guest" mode) during Firebase Auth initialization.

## Architecture & Storage
- Integrate `idb-keyval` via CDN to interact with the browser's IndexedDB natively without complex boilerplates.
- Persist the `uploadedVideos` array (containing the raw video `File` blobs and MediaPipe's `poseFeatures`) into IndexedDB.
- Persist the `activeVideoId` into IndexedDB to remember the user's last selected video.

## Boot Sequence & UI
- Add a full-screen `#boot-overlay` (loading screen) to `index.html`.
- On `app.js` boot (`DOMContentLoaded`):
  1. Show `#boot-overlay`.
  2. Execute a `Promise.all` to await two concurrent asynchronous operations:
     - Firebase Auth state resolution (wrapped in a Promise that resolves on the first `onAuthStateChanged` callback, with a maximum 1.5-second timeout safety net).
     - IndexedDB data retrieval (`savedVideos` array and `lastActiveVideoId`).
  3. Once resolved, repopulate the `uploadedVideos` state (re-generating temporary Blob URLs via `URL.createObjectURL(file)`).
  4. Render the video library UI.
  5. If `activeVideoId` is restored, trigger `switchActiveVideo(activeVideoId)` to automatically load the leaderboard for the correct video.
  6. Fade out and hide `#boot-overlay`, delivering a completely seamless user experience.

## Data Synchronization
- **Upload**: Append the new video to the `uploadedVideos` array, update `activeVideoId`, and overwrite the IndexedDB storage.
- **Switch**: Update the `activeVideoId` state and save the new ID to IndexedDB.
- **Delete**: Remove the video from the `uploadedVideos` array, handle active video fallback, and save the updated array to IndexedDB.
