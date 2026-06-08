# Design Document: Video Library & Switching Feature (影片庫與隨時切換功能)

## Goal Description
當用戶上傳多部舞蹈影片時，先前上傳的影片與分析特徵能保存在瀏覽器記憶體中，並在主頁面「上傳區」下方以「影片庫 (Video Library)」列表呈現，讓用戶能隨時點擊切換當前進行測試的影片。切換後，由於影片特徵已存在記憶體中，應可直接點擊「開始測試」按鈕，無需重新進行人體骨架分析。

---

## User Review Required
> [!IMPORTANT]
> **儲存生命週期**
> 本設計採用**方案 1 (網頁生命週期記憶體儲存)**。這代表當用戶重新整理頁面時，已儲存影片會消失。此做法能避免瀏覽器 IndexedDB 容量限制造成的效能卡頓與報錯，也省去了大二進位檔案寫入本機資料庫的複雜度。

---

## Proposed Changes

### 1. State Management (狀態管理)
在 `app.js` 新增兩個變數以追蹤影片庫狀態：
- `uploadedVideos`: 包含所有上傳成功且提取完特徵的影片物件陣列。
- `activeVideoId`: 標記當前選取使用的影片 ID。

```javascript
let uploadedVideos = []; // { id, name, file, url, poseFeatures }
let activeVideoId = null;
```

### 2. UI Layout Components (介面佈局與樣式)

#### A. HTML (在 [index.html](file:///c:/Users/kenwu/Downloads/Dance-compare-main/index.html) 新增影片庫容器)
置於 `upload-section` 卡片的底端，並與預處理進度條與開始按鈕平行。

```html
<!-- index.html -->
<section id="upload-section" class="card active">
    <!-- 既有的拖曳上傳與進度區... -->
    
    <!-- 新增：已分析影片庫 -->
    <div id="video-library-container" class="video-library-container hidden">
        <h4 class="library-title">🎥 已分析影片庫 (Video Library)</h4>
        <div id="video-library-list" class="video-library-list">
            <!-- 動態生成影片項目 -->
        </div>
    </div>
</section>
```

#### B. CSS (在 [style.css](file:///c:/Users/kenwu/Downloads/Dance-compare-main/style.css) 新增排版樣式)
```css
/* style.css */
.video-library-container {
  width: 100%;
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-glass);
}

.library-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 1rem;
  text-align: left;
}

.video-library-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
}

.library-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1.2rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glass);
  cursor: pointer;
  transition: all 0.2s ease;
}

.library-item:hover {
  background: rgba(99, 102, 241, 0.05);
  border-color: rgba(99, 102, 241, 0.3);
}

.library-item.active {
  background: rgba(99, 102, 241, 0.1);
  border-color: var(--primary);
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
}

.item-info {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex: 1;
  min-width: 0; /* 強制 ellipsis 生效 */
}

.item-icon {
  font-size: 1.2rem;
}

.item-name {
  font-size: 0.9rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.item-badge {
  font-size: 0.75rem;
  background: var(--primary);
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  margin-left: 0.5rem;
}

.item-actions {
  display: flex;
  align-items: center;
  margin-left: 1rem;
}

.btn-delete-item {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.3rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.btn-delete-item:hover {
  color: var(--color-miss);
  background: rgba(239, 68, 68, 0.1);
}
```

### 3. Core JavaScript Logic (核心邏輯)

#### A. 新影片加入影片庫
在上傳並分析完特徵後，將特徵、檔名、生成的 ObjectURL 以及 File 存入 `uploadedVideos`，並標記為活動影片：
```javascript
// 在 handleVideoUpload 完成後
const newVideo = {
  id: 'vid_' + Date.now(),
  name: file.name,
  file: file,
  url: videoURL,
  poseFeatures: [...poseFeatures]
};
uploadedVideos.push(newVideo);
activeVideoId = newVideo.id;
updateVideoLibraryUI();
```

#### B. 切換影片庫影片
用戶點選某個非使用中的影片項目時：
```javascript
function switchActiveVideo(videoId) {
  const video = uploadedVideos.find(v => v.id === videoId);
  if (!video) return;

  activeVideoId = video.id;
  poseFeatures = video.poseFeatures;
  
  // 更新前景與背景 Video 播放來源
  referenceVideo.src = video.url;
  referenceVideo.load();
  tempVideo.src = video.url;
  tempVideo.load();

  // 顯示/重設 UI 狀態為已完成
  document.querySelector('.dropzone-content').classList.add('hidden');
  preprocessContainer.classList.add('hidden');
  startControl.classList.remove('hidden');
  preprocessStatusText.textContent = `骨架分析完成！已讀取緩存的 ${poseFeatures.length} 個關鍵特徵。`;

  updateVideoLibraryUI();
}
```

#### C. 刪除影片
用戶點擊刪除按鈕時：
```javascript
function deleteVideo(videoId, event) {
  event.stopPropagation(); // 阻止觸發項目的切換事件
  
  const videoIndex = uploadedVideos.findIndex(v => v.id === videoId);
  if (videoIndex === -1) return;

  const targetVideo = uploadedVideos[videoIndex];
  
  // 釋放記憶體
  URL.revokeObjectURL(targetVideo.url);
  uploadedVideos.splice(videoIndex, 1);

  if (activeVideoId === videoId) {
    if (uploadedVideos.length > 0) {
      // 若還有影片，自動切換到第一個
      switchActiveVideo(uploadedVideos[0].id);
    } else {
      // 沒有影片了，重設回上傳介面
      resetToUploadState();
    }
  } else {
    updateVideoLibraryUI();
  }
}
```

---

## Verification Plan

### Manual Verification
1. 開啟首頁，拖入上傳第一個影片 `dance1.mp4`。
2. 驗證進度條跑至 100%，出現「分析完成」狀態，並且在下方成功顯示「影片庫」以及 `dance1.mp4` 項目，且標示為使用中。
3. 再次拖入或上傳第二個影片 `dance2.mp4`。
4. 驗證第二個影片正常分析完成，並新增到下方的影片庫列表中，且自動切換為當前使用中。
5. 點選列表中第一個影片 `dance1.mp4`，驗證系統能瞬間切換，並且顯示「開始測試」按鈕，不重新提取特徵。
6. 點選 `dance2.mp4` 的刪除按鈕，驗證該項目被成功移除，且活動影片自動切至 `dance1.mp4`。
7. 刪除最後一個影片，驗證系統完整重設，上傳區恢復為最初的待上傳狀態。
