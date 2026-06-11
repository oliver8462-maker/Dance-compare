# Implementation Task Tracker

| Task | Status | Notes |
| --- | --- | --- |
| Task 1: Brainstorming & Design Phase | [x] | Clarify points/skeleton/scoring requirements, write design document |
| Task 2: Implement 33-point Pose Skeleton & Styling | [x] | Update drawing logic for all MediaPipe landmarks with smaller dots |
| Task 3: Expand Similarity Calculation & Test | [x] | Integrate more joints/angles for detailed analysis, update unit tests |
| Task 4: Revise Scoring Formula & A-E Grade Levels | [x] | Improve score distribution mapping and update UI grades |
| Task 5: Verification & Walkthrough | [x] | Run tests, verify full webcam/preprocessing loop, write walkthrough |
| Task 6: Performance & Split-Screen Brainstorming | [x] | Plan split-screen layout and frame rate optimization |
| Task 7: Implement Split-Screen & 60fps Webcam Loop | [x] | Update CSS for split-screen and decouple webcam rendering from MediaPipe |
| Task 8: Implement CPU Throttling for MediaPipe | [x] | Apply rate limiting (FPS throttle) to pose model sends to free up resources |
| Task 9: Verification & Walkthrough of Optimization | [x] | Verify smoothness of video/camera, write walkthrough |
| Task 10: Great Rating & Performance Fine-Tuning Brainstorming | [x] | Plan Great rating threshold and Lite MediaPipe model complexity |
| Task 11: Implement Great Rating, Complexity 0, Canvas Downscaling & Score Calibration | [x] | Update CSS, downscale pose input, adjust evaluateSegmentScore and JOINTS/similarity logic |
| Task 12: final Verification & Walkthrough | [x] | Verify full system smoothness, scoring behavior, and walkthrough |
| Task 13: Reaction Lag & Lenient Scoring Brainstorming | [x] | Plan 0.3s delay implementation and angle tolerance adjustments |
| Task 14: Implement 0.3s Reaction Delay & Lenient Angles | [x] | Modify app.js for delayed video lookup and math-utils.js for looser thresholds |
| Task 15: Final Verification & Walkthrough of Calibration | [x] | Run math unit tests, verify gameplay responsiveness and scores, write walkthrough |
| Task 16: Extra Lenient Scoring Brainstorming | [x] | Plan 2.6 divisor and 0.48 minSimilarity parameters |
| Task 17: Implement Extra Lenience & Update Unit Tests | [x] | Modify math-utils.js and tests/math.test.js for relaxed boundaries |
| Task 18: Final Verification & Walkthrough of Extra Lenience | [x] | Run tests, verify gameplay and overall scores, write walkthrough |
| Task 19: Delay Removal & Arcade Scoring Brainstorming | [x] | Plan 0.3s delay removal and arcade sigmoid parameters (midpoint 0.70, k 12.0) |
| Task 20: Implement Delay Removal & Arcade Scoring | [x] | Update app.js to use currentTime, adjust math-utils.js and tests/math.test.js for arcade scoring |
| Task 21: final Verification & Walkthrough of Arcade Scoring | [x] | Run tests, verify gameplay, write walkthrough |
| Task 22: Score Summary & Feedback Brainstorming and Design | [x] | Formulate design and write system design document |
| Task 23: Implement computeJointSimilarities and Unit Tests | [x] | Create helper in math-utils.js and verify with math.test.js |
| Task 24: Implement HTML / CSS for Stats Grid and Advice Card | [x] | Add stats-grid and advice-card markup and styling |
| Task 25: Integrate Rating Counters & AI Feedback Generator in app.js | [x] | Track segment ratings and visible joint scores, generate advice |
| Task 26: Final Verification & Walkthrough of Feedback Feature | [x] | Run tests, verify integrated game flow, write walkthrough |
| Task 27: Implement detailed angle descriptions and MM:SS timeline of mistakes | [x] | Track time-stamped mistakes, format MM:SS timestamps, and translate angle errors (too large/too small) |
| Task 28: Calibrate Similarity to 2.8 Strictness and Update Unit Tests | [x] | Update math-utils.js similarity divisor to 2.8 and verify unit tests |
| Task 29: Implement Dynamic Non-Repetitive AI Advice and Feedback Templates | [x] | Expand joint advice text and randomize feedback templates |
| Task 30: Implement Reference Video and Camera Screenshot Capturing | [x] | Build reference and webcam canvas base64 image capture logic during session mistakes |
| Task 31: Design Side-by-Side UI Rendering and Styles | [x] | Update summary timeline HTML and style.css for side-by-side snapshot comparison layout |
| Task 32: Calibrate Similarity to 2.9 Divisor | [x] | Update similarity divisor to 2.9 in math-utils.js and tests/math.test.js |
| Task 33: Calibrate Similarity to 2.7 Divisor | [x] | Update similarity divisor to 2.7 in math-utils.js and tests/math.test.js |
| Task 34: Brainstorming - Explore Project Context | [x] | Inspected index.html, app.js, and style.css |
| Task 35: Brainstorming - Ask Clarifying Questions | [x] | Ask user clarifying questions on UI/UX placement for the video library and switching behavior |
| Task 36: Brainstorming - Propose 2-3 Approaches | [x] | Formulate and propose video management architectures and UI options |
| Task 37: Brainstorming - Present Design | [x] | Present component structure, state management, and HTML/CSS structure |
| Task 38: Brainstorming - Write Design Doc | [x] | Document final design details in YYYY-MM-DD-video-library-design.md |
| Task 39: Write Implementation Plan | [x] | Create detailed implementation plan in implementation_plan.md |
| Task 40: Implement Video Library - Add HTML Structure | [x] | Update index.html to add video-library-container |
| Task 41: Implement Video Library - Add CSS Styles | [x] | Update style.css with video library styles |
| Task 42: Implement Video Library - Initialize State & DOM | [x] | Update app.js to declare uploadedVideos, activeVideoId and DOM elements |
| Task 43: Implement Video Library - Hook Upload Pipeline | [x] | Update app.js handleVideoUpload to store processed videos |
| Task 44: Implement Video Library - UI & Switching Logic | [x] | Add updateVideoLibraryUI, switchActiveVideo, deleteVideo to app.js |
| Task 45: Implement Video Library - Unit Tests | [x] | Run math-utils unit tests |
| Task 46: Implement Video Library - Manual Verification | [x] | Perform manual verification of upload, switch, delete scenarios |
| Task 47: Brainstorming - Explore Project Context for User Login & Guest Mode | [x] | Inspect workspace for any existing user/auth structure |
| Task 48: Brainstorming - Ask Clarifying Questions | [x] | Ask user clarifying questions one at a time |
| Task 49: Brainstorming - Propose 2-3 Approaches | [x] | Propose options for email login and guest mode storage/integration |
| Task 50: Brainstorming - Present Design | [x] | Present layout, components, and flow for login & guest mode |
| Task 51: Brainstorming - Write Design Doc | [x] | Document final design details in YYYY-MM-DD-auth-design.md |
| Task 52: Write Implementation Plan | [x] | Create detailed implementation plan in implementation_plan.md |
| Task 53: Implement User Login & Guest Mode | [x] | Firebase Auth + Firestore leaderboard integrated, math tests pass |
| Task 54: Update HTML Leaderboard Title with Dynamic Span | [x] | Added #leaderboard-video-title span to index.html |
| Task 55: Add CSS Compact Dropzone + video-title-context Styles | [x] | Inserted .dropzone.compact and .video-title-context into style.css |
| Task 56: Refactor JS Dropzone .compact Toggle + Leaderboard Title | [x] | Replaced .dropzone-content hidden logic, updated refreshLeaderboard to set video name |
| Task 57: Brainstorming - Explore project context for Google Sign-In | [x] | Checked app.js, index.html, style.css, and Firebase config |
| Task 58: Brainstorming - Ask clarifying questions | [x] | Asked user and received choice for signInWithPopup + styled button |
| Task 59: Brainstorming - Propose 2-3 approaches | [x] | Propose Google Auth integration approaches and trade-offs |
| Task 60: Brainstorming - Present design | [x] | Present component structure, state management, and authentication flow |
| Task 61: Brainstorming - Write design doc | [x] | Documented final design details in 2026-06-04-google-auth-design.md |
| Task 62: Write Implementation Plan | [x] | Created detailed implementation plan in 2026-06-04-google-auth.md |
| Task 63: Implement Google Sign-In - Add HTML Button | [x] | Add Google Sign-in button to index.html |
| Task 64: Implement Google Sign-In - Add CSS Button Styles | [x] | Add .btn-google styling to style.css |
| Task 65: Implement Google Sign-In - Refactor JS imports & auth flow | [x] | Integrate GoogleAuthProvider and signInWithPopup logic in app.js |
| Task 66: Google Sign-In - Verification & Walkthrough | [x] | Verify unit tests and manual browser flow, write walkthrough |
| Task 67: Brainstorming - Explore Project Context for Data Persistence | [x] | Inspect app.js to understand current auth, video storage, and leaderboard state logic |
| Task 67: Brainstorming - Explore Project Context for Data Persistence | [x] | Inspect app.js to understand current auth, video storage, and leaderboard state logic |
| Task 68: Brainstorming - Ask Clarifying Questions | [x] | Ask user clarifying questions one at a time |
| Task 68: Brainstorming - Ask Clarifying Questions | [x] | Ask user clarifying questions one at a time |
| Task 69: Brainstorming - Propose 2-3 Approaches | [x] | Propose options for persisting state (IndexedDB, Firebase, LocalStorage) |
| Task 70: Brainstorming - Present Design | [x] | Present architecture for data persistence |
| Task 71: Brainstorming - Write Design Doc | [x] | Document final design details in YYYY-MM-DD-data-persistence-design.md |
| Task 72: Write Implementation Plan | [x] | Create detailed implementation plan in implementation_plan.md |
| Task 73: Execution - Integrate idb-keyval & Boot Overlay | [x] | Add CDN script and boot-overlay HTML to index.html |
| Task 74: Execution - Style Boot Overlay | [x] | Add boot-overlay styles to style.css |
| Task 75: Execution - Implement Boot & Sync Logic | [x] | Modify app.js to handle Promises and IndexedDB syncing |
| Task 76: Execution - Verification | [x] | Verify the unified boot and persistence locally |
| Task 77: Upload Code to GitHub | [x] | Push local changes to GitHub repository main branch while preserving commit history |
| Task 78: HTML Structures for Nickname Modal & Three-Column Summary | [x] | Add #nickname-overlay and #summary-section panel markup to index.html |
| Task 79: CSS Styling for Nickname Modal & Three-Column Summary | [x] | Add CSS styles for #nickname-overlay, .summary-wrapper grid/flex layout, and segment scores |
| Task 80: Landmark Compression & Firebase Storage Imports | [x] | Add Firebase Storage JS CDN imports, storage instance, and landmark prune/compress/decompress algorithms |
| Task 81: Post-Login Nickname Flow Integration | [x] | Implement userNickname state, nickname submit form listener, checkNicknameAndPrompt, and updateAuthUI nickname display |
| Task 82: Cloud Video Upload & Storage Sync | [x] | Update handleVideoUpload to upload files/metadata to cloud, implement syncCloudVideoLibrary, and update deleteVideo to delete remote assets |
| Task 83: Segment Scoring Tracking & Nickname-based Score Submission | [x] | Track segmentScores every 1.5 seconds, clear on retry, and record userNickname in Firestore scores collection |
| Task 84: Render Segment Scores & Leaderboards in Summary Panels | [x] | Render segment scores list in summary left panel and fetch/render leaderboard list in summary right panel |
| Task 85: Verification & Cleanup | [x] | Run math unit tests, verify Google login nickname flow, upload, cloud library sync, delete, and desktop three-column summary layout |
| Task 86: Diagnose and Resolve Google Auth unauthorized-domain error | [x] | Analyze Firebase Authorized Domains requirement for the current host |
| Task 87: Diagnose and fix missing nickname prompt on signup/login | [x] | Fix logic in registration and login flows to prompt for nickname |
| Task 88: Add Firestore Timeout Wrapper for Nickname Save | [x] | Implement Promise timeout helper to reject slow/offline setDoc writes |
| Task 95: Remove Google Auth - HTML & CSS Changes | [ ] | Delete google button from index.html and styles from style.css |
| Task 96: Remove Google Auth - JS Changes | [ ] | Delete Google provider imports and event listener in app.js |
| Task 97: Defer Nickname prompt and configure Firestore Long Polling | [ ] | Enable forceLongPolling in app.js, disable nickname overlay popup on login, and increase nickname save timeout to 10s |
| Task 98: Implement Post-Settlement Nickname Flow in JS | [ ] | Implement promptNicknameAndSubmit in app.js, modify endDanceSession, and update submit/cancel overlay handlers |
| Task 99: Final Verification & Walkthrough | [ ] | Run math unit tests, verify Google button is gone, nickname popup triggers on end of dance, cancel/confirm flow works, and no timeouts occur |
