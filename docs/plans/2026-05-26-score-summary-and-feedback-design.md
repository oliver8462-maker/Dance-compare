# 系統設計文件：結尾成績統計與 AI 動作改進評語功能

本設計文件記錄「跳舞動作相似度評分軟體」之結尾統計面板優化、新增 Perfect / Great / Good / Miss 等評等計數，以及整合關節相似度追蹤並提供 AI 動作改進評語之技術規格。

---

## 1. 成績評等計數設計 (Rating Counter Design)

### 1.1 評等分類標準
在遊戲進行時，每 1.5 秒會呼叫一次 `evaluateSegmentScore()` 來計算該區間的平均得分，並據此給予評等。
我們將在 `app.js` 新增一個計數器對象 `ratingsCount`，每當判定評等時將對應的次數累加：
- **Perfect**：區間平均分數 $\ge 80$
- **Great**：區間平均分數 $\ge 70$ 且 $< 80$
- **Good**：區間平均分數 $\ge 55$ 且 $< 70$
- **Miss**：區間平均分數 $< 55$

### 1.2 結算面板 UI 呈現
在結算畫面的 `.summary-card` 中，我們新增一個評等統計網格 (`.stats-grid`)，將這四個數據直觀地呈現給使用者。各評等將使用對應的漸層背景與陰影，提升視覺質感：
- **Perfect**: 金色/淡藍色發光
- **Great**: 霓虹粉/霓虹紫
- **Good**: 綠色/青色
- **Miss**: 灰色

---

## 2. 關節特徵追蹤與 AI 動作改進評語設計 (Joint Tracking & AI Feedback)

### 2.1 關節相似度追蹤
為了得知使用者在哪些身體部位的動作較不準確，我們需要收集每個關節的累計表現：
1. **關節獨立計算**：在 `math-utils.js` 新增 `computeJointSimilarities()` 函數，它與 `computeJointSimilarity()` 類似，但它不取平均值，而是回傳一個包含各關節獨立相似度值（0 ~ 1）的物件。
2. **運行時累加**：在 `app.js` 中新增 `jointAccumulators` 變數。在每次相機訊號結果回傳時（`handleLiveWebcamResults`），調用 `computeJointSimilarities()`，並將偵測到的各關節數值累加到 `jointAccumulators[jointKey].sum` 中，同時增加計數 `jointAccumulators[jointKey].count`。

### 2.2 評語生成演算法
當測試結束 (`endDanceSession`) 時：
1. **計算平均值**：對每個關節計算平均相似度：
   $$\text{AvgSim}(J) = \frac{\text{sum}(J)}{\text{count}(J)}$$
2. **找出最差關節**：過濾掉沒有足夠偵測點的關節後，將所有關節依照 `AvgSim` 由低到高排序，篩選出**得分最低的 1-2 個關節**（例如低於 0.75 門檻值）。
3. **對照改進評語**：對應低分關節，提供精確的中文指引建議（`JOINT_ADVICE`）：
   - **手肘** (`LEFT_ELBOW` / `RIGHT_ELBOW`)：「可以多注意手肘關節彎曲的伸展度，讓雙臂動作更到位。」
   - **膝蓋** (`LEFT_KNEE` / `RIGHT_KNEE`)：「膝蓋下蹲或曲折的幅度可以再深一點，這能顯著提升得分哦！」
   - **肩膀** (`LEFT_SHOULDER` / `RIGHT_SHOULDER`)：「肩膀的擺幅或抬高高度可以再做大一些，讓身體線條更舒展。」
   - **髖部** (`LEFT_HIP` / `RIGHT_HIP`)：「身體重心或下盤的扭轉可以再穩定一些，讓整體姿態更流暢。」
   - **手腕** (`LEFT_WRIST` / `RIGHT_WRIST`)：「手掌或手腕的指引方向與擺放位置可以再精確一些。」
   - **腳踝** (`LEFT_ANKLE` / `RIGHT_ANKLE`)：「跨步或站立的重心可以再確實一些。」
4. **特殊情況 (完美表現)**：若所有關節的平均相似度皆高於 0.85，系統將給予完美褒獎評語：「太完美了！所有部位的配合都無懈可擊，繼續保持！」

---

## 3. UI 樣式與配置

在 `style.css` 中，為新增的 `.stats-grid` 與 `.advice-card` 套用現代暗色霓虹與毛玻璃質感（Glassmorphism）的 CSS 屬性，確保在結算彈窗內排版美觀、響應式，且富有遊戲街機的科技動感。
