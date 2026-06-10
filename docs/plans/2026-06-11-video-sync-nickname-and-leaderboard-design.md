# Design Document: Video Cloud Sync, Nickname Integration, and Desktop Three-Column Summary Layout

This document details the system architecture, UI layout, data schemas, and key flows to implement cross-device video sharing via Firebase Storage, user nickname setup for all login modes, and a detailed three-column desktop summary layout displaying segment scores, core results, and leaderboards.

## 1. System Architecture & Storage Configuration

To support uploading a video on Device A and accessing it on Device B without re-uploading or preprocessing, we transition from local-only storage (IndexedDB) to a hybrid cloud model.

```
+-----------------------------------------------------------+
|                      Client Device                        |
+-----------------------------------------------------------+
       |                                              ^
       | 1. Upload Video & Local MP Pose              | 4. Fetch User Videos
       | 2. Upload File (Storage)                     |    & Landmarks (Firestore)
       v                                              |
+----------------------+                      +-------------+
|   Firebase Storage   |                      |  Firestore  |
|  (Raw Video Files)   |                      | (Landmarks) |
+----------------------+                      +-------------+
```

### 1.1 Firebase Storage Rules & Schema
Videos are stored in the Firebase Storage Bucket at:
`videos/{userId}/{videoId}_{fileName}`

### 1.2 Firestore Collections & Landmark Compression
To prevent exceeding the **1MB Firestore document limit** on longer videos, landmarks are pruned and compressed before saving to Firestore.
* **Pruning**: We only save the 16 landmarks used in `math-utils.js` JOINTS calculation:
  Indices: `11, 12, 13, 14, 15, 16, 19, 20, 23, 24, 25, 26, 27, 28, 31, 32`
* **Precision Compression**: All coordinates `x, y` and `visibility` are rounded to `4` decimal places, and `z` is omitted (as we only use 2D pose evaluation).
* **Storage Format**: An array of arrays: `[ [id, x, y, vis], ... ]` for each frame. This reduces raw landmark size by ~80%.

#### Collection: `videos`
```json
{
  "videoId": "vid_1718012345678",
  "userId": "firebase_user_uid",
  "name": "dance_practice.mp4",
  "url": "https://firebasestorage.googleapis.com/v0/b/...",
  "poseFeatures": "[...compressed_landmarks_json_string...]",
  "timestamp": "serverTimestamp"
}
```

#### Collection: `users`
```json
{
  "nickname": "DanceKing99",
  "updatedAt": "serverTimestamp"
}
```

#### Collection: `scores` (Updated)
We update the leaderboard scores collection to contain `nickname` and support guest entries with a `guestNickname`.
```json
{
  "userId": "firebase_user_uid_or_guest_id",
  "nickname": "DanceKing99",
  "videoName": "dance_practice.mp4",
  "score": 85.4,
  "grade": "A",
  "timestamp": "serverTimestamp"
}
```

---

## 2. Key User Flows

### 2.1 Post-Login Nickname Flow
Whether the user signs in with Google, email/password, or continues as a Guest:
1. The system resolves the user state.
2. It queries if a nickname exists:
   * **Google/Email User**: Query `users/{uid}` in Firestore.
   * **Guest User**: Check `localStorage.getItem('guestNickname')`.
3. If no nickname is found, a glassmorphism modal blocks the app UI, prompting the user to enter a nickname (2 to 15 characters, alphanumeric/Chinese/Japanese/Korean).
4. Once submitted:
   * **Logged-in User**: Saves `{ nickname }` to `users/{uid}` and updates `currentUser` state.
   * **Guest User**: Saves to `localStorage` and sets `guestNickname` state.
5. The modal closes, enabling the main dashboard.

### 2.2 Cloud Video Library Sync Flow
1. **Boot / Auth Change**: If `currentUser` is not null, fetch all documents from Firestore `videos` where `userId == currentUser.uid`.
2. **Merge**: Map remote videos and add them to the local `uploadedVideos` array (avoiding duplicates). Set their source URLs to the remote Firebase Storage URLs.
3. **Save**: Cache the merged video library to IndexedDB so it loads instantly on subsequent boots.

---

## 3. UI/UX & Layout Specs

### 3.1 Nickname Setup Modal
An overlay with:
* Glassmorphism background (`backdrop-filter: blur(20px)`).
* A card styled like the Auth overlay containing an input field for the nickname and a button `確定儲存`.

### 3.2 Desktop Three-Column Summary Layout
When opened on desktop/computers (`@media (min-width: 1024px)`), the post-game summary window expands to a three-column layout:

```
+---------------------------------------------------------------------------------+
|                               舞蹈測試結算                                      |
+---------------------------------------------------------------------------------+
|   [左欄: 區間得分]     |      [中欄: 平均得分與回饋]       |    [右欄: 本片排行榜]    |
|                        |                                   |                      |
| * 00:00-00:01: 85分    |       Average Score: 85.4         |  1. DanceKing99  92.1|
|   (Perfect)            |       Grade: A                    |  2. StarDancer   88.5|
| * 00:01-00:03: 72分    |                                   |  3. GuestUser    85.4|
|   (Great)              |       Stats: P:12 G:5 G:3 M:1     |  4. ...          ... |
| * 00:03-00:04: 45分    |       AI Advice & Mistakes        |  5. ...          ... |
|   (Miss)               |                                   |                      |
+---------------------------------------------------------------------------------+
```

* **Left Column**: Contains a scrollable list of segment scores. During the dance test, we push segment average scores calculated every 1.5 seconds into a `segmentScores` array.
* **Center Column**: Contains the original grade badge, overall average score, rating counters (Perfect, Great, etc.), and the AI advice mistakes list with screenshots.
* **Right Column**: A dedicated leaderboard section displaying ranking rows from Firestore for the current active video.
