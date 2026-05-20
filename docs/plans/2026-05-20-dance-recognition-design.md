# 系統設計文件：跳舞動作相似度評分軟體

本文件記錄「基於 MediaPipe 的跳舞動作相似度評分軟體」之技術規格與架構設計。

## 1. 技術堆疊 (Technology Stack)
* **核心語言**：HTML5, CSS3, JavaScript (ES6+ Vanilla)
* **AI 骨架偵測**：MediaPipe Pose (Legacy CDN v0.5)
  * `https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js`
  * `https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js`
  * `https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js`
* **伺服器/建置工具**：無（純前端靜態網頁，本機開啟或使用簡單開發伺服器 live-server / http-server 即可運行）

## 2. 畫面佈局與 UI 設計 (UI/UX Layout)
本專案採用現代暗色系與玻璃擬物化 (Glassmorphism) 風格，確保精美與專業感。
* **上傳與預處理階段**：
  * 中央顯示拖曳上傳區 (Dropzone)。
  * 上傳後，顯示圓形/條狀進度條，顯示預處理進度百分比與狀態文字（例如：「影片分析中 45%...」）。
  * 預處理完成後，進度條淡出，顯示大型「開始測試」按鈕。
* **測試進行階段**：
  * **主畫面**：100% 寬高填滿的 Canvas，顯示使用者的即時攝影機畫面，並疊加繪製半透明的彩色骨架與關節點。
  * **次要畫面（參考影片）**：以子母畫面 (Picture-in-Picture) 形式置於畫面右下角（寬度約 240px），具有圓角與細緻陰影，播放參考影片並播放聲音。
  * **倒數覆蓋層 (Countdown Overlay)**：點擊開始後，主畫面中央彈出 3 秒倒數（3, 2, 1, GO!）的大型動態文字，倒數結束後隱藏並啟動影片與相機。
  * **評分儀表板**：
    * 頂部中間：實時顯示當下影格相似分數（0 ~ 100）。
    * 畫面中央偏上：每 2 秒彈出浮動且具備淡出/縮放動畫的評價（`Perfect` / `Good` / `Miss`）。
* **結算階段 (Game Over Screen)**：
  * 影片播放完畢時，畫面彈出半透明磨砂玻璃質感 (Glassmorphism) 的全螢幕結算視窗。
  * 核心顯示：**「總平均相似分數：XX 分」**。
  * 級別評等：根據總平均分給予等級（S: >=90, A: >=80, B: >=70, C: <70）。
  * 功能按鈕：「重新測試」與「上傳新影片」。

## 3. 資料流與背景預處理 (Data Flow & Preprocessing)
為了避免同時執行兩個深度學習模型造成的效能災難，系統採用背景預處理機制：
1. **影片載入**：
   * 使用者選取影片檔案後，利用 `URL.createObjectURL(file)` 將其設置於一個隱藏的 `<video>` 標籤中。
2. **骨架特徵提取**：
   * 影片 Metadata 載入後，系統設定取樣率（30 FPS，即步長為 0.033 秒）。
   * 使用迴圈手動累加影片 `currentTime`，並監聽 `seeked` 事件。
   * 每次 `seeked` 觸發，將該格畫面繪製到隱藏 Canvas，再傳遞給 MediaPipe Pose。
   * 收集 MediaPipe 返回的 `poseLandmarks` 並儲存至 `poseFeatures` 陣列：
     ```javascript
     poseFeatures = [
       { time: 0.00, landmarks: [ {x, y, z, visibility}, ... ] },
       { time: 0.033, landmarks: [ ... ] },
       ...
     ]
     ```
3. **即時比對比對**：
   * 測試開始，參考影片正常播放，系統取得 `video.currentTime`。
   * 攝影機捕捉使用者影格，MediaPipe Pose 實時偵測出 `userLandmarks`。
   * 尋找 `poseFeatures` 中最接近當前時間點的 `refLandmarks`。
   * 計算兩者相似度，寫入當前相似度佇列。

## 4. 評分演算法與邏輯 (Scoring Engine)
採用 **關節角度餘弦相似度 (Cosine Similarity of Joint Angles)** 以適應不同的站位、距離與身形。
* **關節角度計算**：
  選取人體 8 組主要對稱關節（雙肘、雙肩、雙膝、雙髖）。
  以關節點 $B$ 為頂點，相鄰兩點 $A, C$ 為邊，計算向量 $\vec{u} = A - B$ 與 $\vec{v} = C - B$。
  $$\cos(\theta) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$$
  $$\theta = \arccos(\max(-1, \min(1, \cos(\theta)))) \quad (\theta \in [0, \pi])$$
* **遮擋與可信度過濾**：
  若該關節的三個頂點中，有任何一點在參考影片或使用者相機中的 `visibility` < 0.5，則該關節不參與本次相似度計算，以防止誤判。
* **分數映射校準**：
  計算 8 組關節的角度相似度均值 $S_{avg} = \frac{1}{n}\sum (1 - \frac{|\theta_{ref} - \theta_{user}|}{\pi})$。
  設定最低相似度門檻 $MinSimilarity = 0.65$，並進行線性映射：
  $$Score = \max\left(0, \frac{S_{avg} - MinSimilarity}{1 - MinSimilarity}\right) \times 100$$
* **區段結算與總分計算**：
  * **2 秒結算**：每 2 秒計算這段期間所有影格分數的平均值，顯示對應評語（Perfect: >=85, Good: 70~84, Miss: <70）。
  * **總結算**：影片結束時，計算整個測試期間所有有效影格分數的總平均值，作為「總平均相似分數」。

## 5. 檔案結構 (File Structure)
* `index.html` - 主頁面 HTML
* `style.css` - 樣式與動畫 CSS
* `app.js` - 主程式邏輯（含 MediaPipe 初始化、預處理、即時比對與評分邏輯）
* `docs/plans/task.md` - 專案開發進度追蹤
