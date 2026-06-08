# Design Document: Leaderboard & Dropzone Refinements

This document outlines the refinements to the File Upload Dropzone layout and the dynamic Leaderboard title context.

## 1. Problem Description
- **Dropzone Content Hidden**: After a video is uploaded or selected, the text and icon inside the dropzone area are hidden (`.dropzone-content` is set to `hidden`). This leaves the dropzone as a blank dashed outline card, which is confusing and makes it look broken.
- **Leaderboard Scope Context**: The leaderboard queries and displays scores specific to the active video. However, switching to a new video or uploading a new video with no records makes the leaderboard appear empty. Without video-specific context in the title, it is unclear that the database records are video-dependent.

## 2. Proposed Refinements

### A. Keep Dropzone Text Visible & Minimize Styling
- Modify `app.js` to prevent adding the `.hidden` class to `.dropzone-content`.
- When there are uploaded videos in the library, add a class `.compact` to `.dropzone` to reduce its padding and icon size, keeping the workspace tidy while retaining instructions.

### B. Dynamic Leaderboard Title
- Update the leaderboard header element in `index.html` to support a dynamic video name suffix.
- Modify `refreshLeaderboard()` in `app.js` to update the DOM with the currently active video name (e.g., `🏆 本片高手排行榜 - dance.mp4`).

## 3. UI/UX Specifications

### CSS Layout
- Add `.dropzone.compact` class in `style.css`:
  - `padding: 1.5rem 1rem;`
  - `.upload-icon { font-size: 1.8rem; margin-bottom: 0.4rem; }`
  - `.dropzone h3 { font-size: 1rem; }`
  - `.dropzone p { font-size: 0.8rem; margin-bottom: 0.4rem; }`
  - `.upload-note { display: none; }`

### DOM Update
- In `index.html`:
  ```html
  <h4 class="leaderboard-title">🏆 本片高手排行榜 <span id="leaderboard-video-title" class="video-title-context"></span></h4>
  ```
