// Main application logic - Dance Similarity Scoring Software
import { computeJointSimilarity, scaleScore, computeJointSimilarities, computeJointDetails } from './math-utils.js';

// Application State Variables
let poseFeatures = []; // Preprocessed reference pose landmarks sequence
let isPreprocessing = false;
let isTestingState = false;
let isPlayingState = false;

// Real-time Scoring Variables
let frameScores = []; // Scores in the current 1.5-second interval
let allScores = []; // All scores recorded during the test
let feedbackIntervalId = null;
let timelineIntervalId = null;

// Rating stats and joint tracking accumulators
let ratingsCount = { perfect: 0, great: 0, good: 0, miss: 0 };
let jointAccumulators = {}; // { JOINT_KEY: { sum: 0, count: 0 } }
let sessionMistakes = []; // Array of { time, jointKey, userAngle, refAngle, diff }

const JOINT_ADVICE = {
  LEFT_ELBOW: { name: '左手肘', advice: '可以多注意左手臂彎曲的伸展度，讓動作更到位。' },
  RIGHT_ELBOW: { name: '右手肘', advice: '可以多注意右手手臂的彎曲與伸展角度。' },
  LEFT_SHOULDER: { name: '左肩膀', advice: '左側肩膀的擺幅或抬高高度可以再做大一些，讓動作更舒展。' },
  RIGHT_SHOULDER: { name: '右肩膀', advice: '右側肩膀的開合或抬高高度可以再加強一些，增加表現力。' },
  LEFT_KNEE: { name: '左膝蓋', advice: '左腳膝蓋的彎曲下蹲幅度可以再深一些，這能讓你的重心更穩。' },
  RIGHT_KNEE: { name: '右膝蓋', advice: '右腳膝蓋的下蹲或伸直細節可以做得更確實，有助於高分。' },
  LEFT_HIP: { name: '左髖部/臀部', advice: '左半邊身體的扭轉或骨盆重心擺放可以更穩定，保持姿態流暢。' },
  RIGHT_HIP: { name: '右髖部/臀部', advice: '右半邊身體的扭轉或下盤重心維持可以更明確，提升動作美感。' },
  LEFT_WRIST: { name: '左手腕', advice: '左手手掌或手腕的延伸角度可以再精準一點。' },
  RIGHT_WRIST: { name: '右手腕', advice: '右手手掌或手腕的指引方向與擺放位置可以再精緻一些。' },
  LEFT_ANKLE: { name: '左腳踝', advice: '左腳跨步的重心或步幅可以再精準確實一些。' },
  RIGHT_ANKLE: { name: '右腳踝', advice: '右腳跨步的重心或步幅可以再精準確實一些。' }
};

// MediaPipe and Camera Variables
let poseModel = null;
let cameraStream = null;
let onResultsCallback = null;
let latestUserLandmarks = null; // 儲存最新相機骨架偵測點
let drawLoopId = null; // 60fps 畫布渲染迴圈 ID
let lastInferenceTime = 0; // 上次推理的時間戳記
let isInferenceRunning = false; // 是否正在進行推理

// 效能優化：離屏縮圖畫布
const smallCanvas = document.createElement('canvas');
smallCanvas.width = 256;
smallCanvas.height = 256;
const smallCtx = smallCanvas.getContext('2d');

// DOM Elements
const headerStatus = document.getElementById('header-status');
const uploadSection = document.getElementById('upload-section');
const videoInput = document.getElementById('video-input');
const dropzone = document.getElementById('dropzone');
const preprocessContainer = document.getElementById('preprocess-container');
const preprocessStatusText = document.getElementById('preprocess-status-text');
const preprocessPercentage = document.getElementById('preprocess-percentage');
const preprocessProgressBar = document.getElementById('preprocess-progress-bar');
const startControl = document.getElementById('start-control');
const startTestBtn = document.getElementById('start-test-btn');

const testSection = document.getElementById('test-section');
const webcamVideo = document.getElementById('webcam-video');
const webcamCanvas = document.getElementById('webcam-canvas');
const webcamCtx = webcamCanvas.getContext('2d');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');
const feedbackContainer = document.getElementById('feedback-container');
const referenceVideo = document.getElementById('reference-video');

const currentScoreEl = document.getElementById('current-score');
const timeDisplay = document.getElementById('time-display');
const videoProgressBar = document.getElementById('video-progress-bar');

const summarySection = document.getElementById('summary-section');
const finalGradeEl = document.getElementById('final-grade');
const finalScoreEl = document.getElementById('final-score');
const retryBtn = document.getElementById('retry-btn');
const newVideoBtn = document.getElementById('new-video-btn');
const perfectCountEl = document.getElementById('perfect-count');
const greatCountEl = document.getElementById('great-count');
const goodCountEl = document.getElementById('good-count');
const missCountEl = document.getElementById('miss-count');
const adviceTextEl = document.getElementById('advice-text');
const mistakesTimelineEl = document.getElementById('mistakes-timeline');

const tempVideo = document.getElementById('temp-video');
const tempCanvas = document.getElementById('temp-canvas');
const tempCtx = tempCanvas.getContext('2d');

// --- 1. MediaPipe Pose Setup ---
function initPoseModel() {
  headerStatus.textContent = "正在載入 AI 骨架偵測模型...";
  
  poseModel = new window.Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  poseModel.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  poseModel.onResults((results) => {
    if (onResultsCallback) {
      onResultsCallback(results);
    }
  });

  headerStatus.textContent = "準備就緒";
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  initPoseModel();
  setupEventListeners();
});

// --- 2. Event Listeners Setup ---
function setupEventListeners() {
  // Drag and drop events
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'rgba(99, 102, 241, 0.3)';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleVideoUpload(files[0]);
    }
  });

  videoInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleVideoUpload(files[0]);
    }
  });

  // Start Test Button
  startTestBtn.addEventListener('click', () => {
    initiateDanceTest();
  });

  // Game over action buttons
  retryBtn.addEventListener('click', () => {
    summarySection.classList.add('hidden');
    initiateDanceTest();
  });

  newVideoBtn.addEventListener('click', () => {
    resetToUploadState();
  });
}

// --- 3. Video Preprocessing Logic (Task 4) ---
async function handleVideoUpload(file) {
  if (isPreprocessing) return;
  
  isPreprocessing = true;
  poseFeatures = [];
  startControl.classList.add('hidden');
  preprocessContainer.classList.remove('hidden');
  
  // Hide dropzone interior styling
  document.querySelector('.dropzone-content').classList.add('hidden');

  const videoURL = URL.createObjectURL(file);
  
  // Load to background temporary video element
  tempVideo.src = videoURL;
  tempVideo.load();
  
  // Load to foreground reference video element
  referenceVideo.src = videoURL;
  referenceVideo.load();
  
  preprocessStatusText.textContent = "正在讀取影片資訊...";
  preprocessPercentage.textContent = "0%";
  preprocessProgressBar.style.width = "0%";

  await new Promise((resolve) => {
    tempVideo.onloadedmetadata = () => resolve();
  });

  const duration = tempVideo.duration;
  tempCanvas.width = tempVideo.videoWidth;
  tempCanvas.height = tempVideo.videoHeight;
  
  preprocessStatusText.textContent = "正在後台進行全身骨架特徵提取...";
  headerStatus.textContent = "分析影片中...";

  const fps = 30;
  const interval = 1 / fps;
  let currentTime = 0;
  
  let resolveFramePromise = null;
  onResultsCallback = (results) => {
    // Save landmarks with time stamp
    poseFeatures.push({
      time: currentTime,
      landmarks: results.poseLandmarks ? JSON.parse(JSON.stringify(results.poseLandmarks)) : null
    });
    if (resolveFramePromise) {
      resolveFramePromise();
    }
  };

  // Step through the video frame by frame
  while (currentTime < duration) {
    tempVideo.currentTime = currentTime;
    
    // Wait for the seeked event
    await new Promise((resolve) => {
      tempVideo.onseeked = () => resolve();
    });

    // Draw video frame to background canvas
    tempCtx.drawImage(tempVideo, 0, 0, tempCanvas.width, tempCanvas.height);

    // Run MediaPipe and wait for result callback
    const frameProcessed = new Promise((resolve) => {
      resolveFramePromise = resolve;
    });

    await poseModel.send({ image: tempCanvas });
    await frameProcessed;

    // Update progress elements
    const progress = Math.min(100, Math.round((currentTime / duration) * 100));
    preprocessPercentage.textContent = `${progress}%`;
    preprocessProgressBar.style.width = `${progress}%`;

    currentTime += interval;
  }

  isPreprocessing = false;
  onResultsCallback = null;
  
  preprocessStatusText.textContent = `骨架分析完成！總長 ${duration.toFixed(1)} 秒，已擷取 ${poseFeatures.length} 個關鍵特徵。`;
  preprocessPercentage.textContent = "100%";
  preprocessProgressBar.style.width = "100%";
  
  startControl.classList.remove('hidden');
  headerStatus.textContent = "準備完畢，可以開始測試";
  headerStatus.style.color = "var(--color-good)";
}

// --- 4. Webcam & Countdown Logic (Task 5) ---
async function initiateDanceTest() {
  isTestingState = true;
  isPlayingState = false;
  frameScores = [];
  allScores = [];
  ratingsCount = { perfect: 0, great: 0, good: 0, miss: 0 };
  jointAccumulators = {};
  sessionMistakes = [];
  
  uploadSection.classList.add('hidden');
  testSection.classList.remove('hidden');
  countdownOverlay.classList.remove('hidden');
  
  headerStatus.textContent = "啟動攝影鏡頭中...";

  // Set up webcam video element
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false
    });
    webcamVideo.srcObject = cameraStream;
    // Play video to start stream
    await new Promise((resolve) => {
      webcamVideo.onloadedmetadata = () => {
        webcamVideo.play();
        resolve();
      };
    });
  } catch (err) {
    console.error("Camera access error: ", err);
    alert("無法啟動相機。請確認已給予鏡頭權限，且無其他程式正在佔用相機。");
    resetToUploadState();
    return;
  }

  // Adjust canvas size to match the webcam feed aspect ratio
  webcamCanvas.width = webcamVideo.videoWidth || 640;
  webcamCanvas.height = webcamVideo.videoHeight || 480;

  headerStatus.textContent = "準備倒數...";

  // 3 Seconds Countdown
  let count = 3;
  countdownNumber.textContent = count;
  
  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownNumber.textContent = count;
    } else if (count === 0) {
      countdownNumber.textContent = "GO!";
    } else {
      clearInterval(countdownInterval);
      countdownOverlay.classList.add('hidden');
      startDanceSession();
    }
  }, 1000);
}

// --- 5. Real-time Playback & Skeleton Matching ---
function startDanceSession() {
  isPlayingState = true;
  headerStatus.textContent = "測試進行中...";
  headerStatus.style.color = "var(--primary)";

  // 重設效能與骨骼暫存變數
  latestUserLandmarks = null;
  lastInferenceTime = 0;
  isInferenceRunning = false;

  // 啟動 60fps 畫布獨立繪製迴圈
  drawWebcamCanvas();

  // Play reference video
  referenceVideo.currentTime = 0;
  referenceVideo.play();

  // Set MediaPipe results callback to handle live camera comparison
  onResultsCallback = handleLiveWebcamResults;

  // Set up timeline updates
  timelineIntervalId = setInterval(updateTimeline, 100);

  // Set up 1.5-second score evaluator (Task 6)
  feedbackIntervalId = setInterval(evaluateSegmentScore, 1500);

  // Bind video ended trigger
  referenceVideo.onended = () => {
    endDanceSession();
  };

  // Start feeding webcam frames to MediaPipe
  requestAnimationFrame(processWebcamFrame);
}

// Loop to pipe camera frames to MediaPipe Pose
async function processWebcamFrame() {
  if (!isPlayingState) return;

  const now = Date.now();
  const inferenceInterval = 50; // 50ms = 20 FPS 運算頻率
  
  if (!isInferenceRunning && now - lastInferenceTime >= inferenceInterval) {
    if (webcamVideo.readyState === webcamVideo.HAVE_ENOUGH_DATA) {
      isInferenceRunning = true;
      lastInferenceTime = now;
      try {
        // 將相機畫面以 2D 環境快速縮圖到 256x256，大幅減少 MediaPipe 的內建縮放與轉換資源，徹底消除卡頓
        smallCtx.drawImage(webcamVideo, 0, 0, 256, 256);
        await poseModel.send({ image: smallCanvas });
      } catch (err) {
        console.error("MediaPipe 推理錯誤: ", err);
      } finally {
        isInferenceRunning = false;
      }
    }
  }

  requestAnimationFrame(processWebcamFrame);
}

function handleLiveWebcamResults(results) {
  if (!isPlayingState) return;

  // 更新最新的骨架點
  latestUserLandmarks = results.poseLandmarks ? results.poseLandmarks : null;

  // 獲取影片當前時間點對應特徵，直接對齊時間軸（移除延遲補償）
  const currentTime = referenceVideo.currentTime;
  const targetIndex = Math.min(poseFeatures.length - 1, Math.round(currentTime * 30));
  const refFrame = poseFeatures[targetIndex];

  if (refFrame && refFrame.landmarks && results.poseLandmarks) {
    const similarity = computeJointSimilarity(refFrame.landmarks, results.poseLandmarks);
    const score = scaleScore(similarity);
    
    currentScoreEl.textContent = score;
    frameScores.push(score);
    allScores.push(score);

    // Track detailed visible joint similarity and record substantial mistakes
    const jointDetails = computeJointDetails(refFrame.landmarks, results.poseLandmarks);
    for (const key in jointDetails) {
      const details = jointDetails[key];
      if (!jointAccumulators[key]) {
        jointAccumulators[key] = { sum: 0, count: 0 };
      }
      jointAccumulators[key].sum += details.sim;
      jointAccumulators[key].count++;

      // Check if this is a significant mistake (diff > 0.45 radians, i.e., ~25 degrees mismatch)
      if (details.diff > 0.45) {
        const lastMistake = sessionMistakes.filter(m => m.jointKey === key).pop();
        // Throttle mistakes for the same joint to once every 2 seconds
        if (!lastMistake || (currentTime - lastMistake.time) >= 2.0) {
          sessionMistakes.push({
            time: currentTime,
            jointKey: key,
            userAngle: details.userAngle,
            refAngle: details.refAngle,
            diff: details.diff
          });
        }
      }
    }
  } else {
    currentScoreEl.textContent = "0";
  }
}

function drawWebcamCanvas() {
  if (!isPlayingState) return;

  // 1. 清除畫布並繪製即時相機畫面
  webcamCtx.clearRect(0, 0, webcamCanvas.width, webcamCanvas.height);
  if (webcamVideo.readyState >= webcamVideo.HAVE_CURRENT_DATA) {
    webcamCtx.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
  }

  // 2. 疊加繪製最新的使用者骨骼
  if (latestUserLandmarks) {
    drawSkeleton(webcamCtx, latestUserLandmarks);
  }

  // 持續進行渲染
  drawLoopId = requestAnimationFrame(drawWebcamCanvas);
}

// Sleek Custom Skeleton Renderer
function drawSkeleton(ctx, landmarks) {
  if (!landmarks) return;

  const connections = [
    // Face
    [0, 1], [0, 4], [1, 2], [2, 3], [3, 7],
    [4, 5], [5, 6], [6, 8], [9, 10],
    // Upper body & Torso
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24],
    // Hands
    [15, 17], [15, 19], [15, 21], [17, 19],
    [16, 18], [16, 20], [16, 22], [18, 20],
    // Lower body
    [23, 25], [25, 27], [24, 26], [26, 28],
    // Feet
    [27, 29], [27, 31], [29, 31],
    [28, 30], [28, 32], [30, 32]
  ];

  ctx.save();
  ctx.lineWidth = 2.5; // 縮小線條寬度 (原 5)
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)'; // Neon Indigo
  ctx.shadowBlur = 6; // 減小發光模糊半徑 (原 10)
  ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';

  // Draw connectors
  connections.forEach(([i, j]) => {
    const p1 = landmarks[i];
    const p2 = landmarks[j];
    if (p1 && p2 && (p1.visibility || 0) > 0.5 && (p2.visibility || 0) > 0.5) {
      ctx.beginPath();
      ctx.moveTo(p1.x * webcamCanvas.width, p1.y * webcamCanvas.height);
      ctx.lineTo(p2.x * webcamCanvas.width, p2.y * webcamCanvas.height);
      ctx.stroke();
    }
  });

  // Draw joints
  const coreJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  for (let idx = 0; idx < landmarks.length; idx++) {
    const p = landmarks[idx];
    if (p && (p.visibility || 0) > 0.5) {
      const isCore = coreJoints.includes(idx);
      const radius = isCore ? 5 : 3; // 核心點 5px，細節點 3px (原 10px / 6px)
      const outerRadius = isCore ? 8 : 5;

      // Joint Fill (Hot Pink)
      ctx.beginPath();
      ctx.arc(p.x * webcamCanvas.width, p.y * webcamCanvas.height, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#ec4899';
      ctx.shadowBlur = isCore ? 10 : 5;
      ctx.shadowColor = '#ec4899';
      ctx.fill();

      // Outer rings (White border)
      ctx.beginPath();
      ctx.arc(p.x * webcamCanvas.width, p.y * webcamCanvas.height, outerRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.0;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function updateTimeline() {
  const current = referenceVideo.currentTime;
  const duration = referenceVideo.duration || 1;
  const progressPercent = (current / duration) * 100;
  
  videoProgressBar.style.width = `${progressPercent}%`;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
}

// --- 6. 1.5-Second Segment Rating & Final Summary (Task 6) ---
function evaluateSegmentScore() {
  if (frameScores.length === 0) return;

  const average = frameScores.reduce((a, b) => a + b, 0) / frameScores.length;
  frameScores = []; // Reset for next 1.5 seconds

  let rating = 'Miss';
  let className = 'miss';

  if (average >= 80) {
    rating = 'Perfect';
    className = 'perfect';
    ratingsCount.perfect++;
  } else if (average >= 70) {
    rating = 'Great';
    className = 'great';
    ratingsCount.great++;
  } else if (average >= 55) {
    rating = 'Good';
    className = 'good';
    ratingsCount.good++;
  } else {
    ratingsCount.miss++;
  }

  // Create floating bubble DOM element
  const bubble = document.createElement('div');
  bubble.className = `feedback-bubble ${className}`;
  bubble.textContent = rating;
  feedbackContainer.appendChild(bubble);

  // Remove after CSS animation ends
  setTimeout(() => {
    bubble.remove();
  }, 1200);
}

function endDanceSession() {
  isPlayingState = false;
  onResultsCallback = null;

  clearInterval(feedbackIntervalId);
  clearInterval(timelineIntervalId);

  // 停止 60fps 畫布繪製迴圈
  if (drawLoopId) {
    cancelAnimationFrame(drawLoopId);
    drawLoopId = null;
  }

  // Stop webcam tracks
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }

  headerStatus.textContent = "測試結束";
  headerStatus.style.color = "var(--text-muted)";

  // Calculate overall average score
  const finalAverage = allScores.length > 0 
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  // Grade classification (A ~ E)
  let grade = 'E';
  if (finalAverage >= 80) grade = 'A';
  else if (finalAverage >= 70) grade = 'B';
  else if (finalAverage >= 50) grade = 'C';
  else if (finalAverage >= 30) grade = 'D';

  // Display summary overlay modal and rating stats
  perfectCountEl.textContent = ratingsCount.perfect;
  greatCountEl.textContent = ratingsCount.great;
  goodCountEl.textContent = ratingsCount.good;
  missCountEl.textContent = ratingsCount.miss;

  // Generate AI advice
  let lowestJoints = [];
  for (const key in jointAccumulators) {
    if (jointAccumulators[key].count > 5) { // Filter out joints with very few samples
      const avg = jointAccumulators[key].sum / jointAccumulators[key].count;
      lowestJoints.push({ key, avg });
    }
  }

  // Sort lowest joint similarity ascending (worst performing first)
  lowestJoints.sort((a, b) => a.avg - b.avg);

  let adviceHTML = '';
  const overallAvg = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  if (overallAvg >= 85 && lowestJoints.length > 0 && lowestJoints[0].avg >= 0.85) {
    adviceHTML = '🌟 <strong>表現無懈可擊！</strong>您的所有動作配合得極為完美，各關節的角度拿捏非常精準，繼續保持！';
  } else if (lowestJoints.length > 0) {
    const worstCount = Math.min(2, lowestJoints.length);
    const worstLabels = [];
    for (let i = 0; i < worstCount; i++) {
      const item = lowestJoints[i];
      const adviceInfo = JOINT_ADVICE[item.key];
      if (adviceInfo) {
        worstLabels.push(`<strong>${adviceInfo.name}</strong>（${adviceInfo.advice}）`);
      }
    }
    if (worstLabels.length > 0) {
      adviceHTML = `根據數據分析，您的整體動作非常棒！但若想挑戰更高分，可以特別調整以下部位：<br/>• ${worstLabels.join('<br/>• ')}`;
    } else {
      adviceHTML = '做得好！動作的整體完成度很高，下次嘗試挑戰更大的擺幅或更高強度的舞蹈影片吧！';
    }
  } else {
    adviceHTML = '未收集到足夠的關節比對數據，請確保您的全身都完整進入鏡頭畫面中！';
  }
  
  adviceTextEl.innerHTML = adviceHTML;

  // Render mistakes timeline list
  const worstMistakes = [...sessionMistakes]
    .sort((a, b) => b.diff - a.diff) // Sort descending by error magnitude
    .slice(0, 4) // Get top 4 worst mistakes
    .sort((a, b) => a.time - b.time); // Sort chronologically by time stamp

  if (worstMistakes.length > 0) {
    mistakesTimelineEl.classList.remove('hidden');
    let html = '<div class="advice-header">⚠️ 關鍵失誤時間點與動作</div>';
    html += worstMistakes.map(m => {
      const timeStr = `${Math.floor(m.time / 60).toString().padStart(2, '0')}:${Math.floor(m.time % 60).toString().padStart(2, '0')}`;
      const label = getDetailedMistakeLabel(m.jointKey, m.userAngle, m.refAngle);
      return `<div class="mistake-item">
                <span class="mistake-time">${timeStr}</span>
                <span class="mistake-desc">${label}</span>
              </div>`;
    }).join('');
    mistakesTimelineEl.innerHTML = html;
  } else {
    mistakesTimelineEl.classList.add('hidden');
    mistakesTimelineEl.innerHTML = '';
  }

  finalGradeEl.textContent = grade;
  finalScoreEl.textContent = finalAverage.toFixed(1);
  summarySection.classList.remove('hidden');
}

/**
 * Helper to convert joint keys and angle relations to precise description.
 */
function getDetailedMistakeLabel(jointKey, userAngle, refAngle) {
  const isTooSmall = userAngle < refAngle;
  const jointName = JOINT_ADVICE[jointKey]?.name || jointKey;
  switch (jointKey) {
    case 'LEFT_ELBOW':
    case 'RIGHT_ELBOW':
      return `${jointName}彎曲角度${isTooSmall ? '太大（手臂彎得太緊）' : '太小（手臂伸得太直）'}`;
    case 'LEFT_KNEE':
    case 'RIGHT_KNEE':
      return `${jointName}彎曲角度${isTooSmall ? '太大（重心下蹲過深）' : '太小（下蹲幅度不夠）'}`;
    case 'LEFT_SHOULDER':
    case 'RIGHT_SHOULDER':
      return `${jointName}抬起高度${isTooSmall ? '不足（肩膀夾角太小）' : '過高（肩膀夾角太大）'}`;
    case 'LEFT_WRIST':
    case 'RIGHT_WRIST':
      return `${jointName}擺放位置角度${isTooSmall ? '過小' : '過大'}`;
    case 'LEFT_HIP':
    case 'RIGHT_HIP':
      return `${jointName}重心轉動${isTooSmall ? '幅度不足' : '幅度過大'}`;
    case 'LEFT_ANKLE':
    case 'RIGHT_ANKLE':
      return `${jointName}站立夾角${isTooSmall ? '偏窄' : '偏寬'}`;
    default:
      return `${jointName}動作夾角${isTooSmall ? '太小' : '太大'}`;
  }
}

// --- 7. State Reset Handlers ---
function resetToUploadState() {
  // Stop webcam tracks if active
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }

  clearInterval(feedbackIntervalId);
  clearInterval(timelineIntervalId);

  // 停止 60fps 畫布繪製迴圈
  if (drawLoopId) {
    cancelAnimationFrame(drawLoopId);
    drawLoopId = null;
  }

  isTestingState = false;
  isPlayingState = false;
  poseFeatures = [];
  ratingsCount = { perfect: 0, great: 0, good: 0, miss: 0 };
  jointAccumulators = {};
  sessionMistakes = [];

  testSection.classList.add('hidden');
  summarySection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  preprocessContainer.classList.add('hidden');
  startControl.classList.add('hidden');
  
  // Reveal dropzone interior styling
  document.querySelector('.dropzone-content').classList.remove('hidden');
  videoInput.value = '';
  
  headerStatus.textContent = "準備就緒";
  headerStatus.style.color = "var(--text-muted)";
}
