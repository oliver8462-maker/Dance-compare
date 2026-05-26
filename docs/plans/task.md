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

