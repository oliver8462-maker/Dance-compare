// Main application logic - Dance Similarity Scoring Software
import { computeJointSimilarity, scaleScore } from './math-utils.js';

// Application State Variables
let poseFeatures = []; // Preprocessed reference pose landmarks sequence
let isPreprocessing = false;
let isTestingState = false;
let isPlayingState = false;

// Real-time Scoring Variables
let frameScores = []; // Scores in the current 2-second interval
let allScores = []; // All scores recorded during the test
let feedbackIntervalId = null;
let timelineIntervalId = null;

// MediaPipe and Camera Variables
let poseModel = null;
let cameraStream = null;
let onResultsCallback = null;

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
    modelComplexity: 1,
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

  // Play reference video
  referenceVideo.currentTime = 0;
  referenceVideo.play();

  // Set MediaPipe results callback to handle live camera comparison
  onResultsCallback = handleLiveWebcamResults;

  // Set up timeline updates
  timelineIntervalId = setInterval(updateTimeline, 100);

  // Set up 2-second score evaluator (Task 6)
  feedbackIntervalId = setInterval(evaluateSegmentScore, 2000);

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

  if (webcamVideo.readyState === webcamVideo.HAVE_ENOUGH_DATA) {
    await poseModel.send({ image: webcamVideo });
  }

  requestAnimationFrame(processWebcamFrame);
}

// Handles live MediaPipe results from webcam
function handleLiveWebcamResults(results) {
  if (!isPlayingState) return;

  // Clear canvas
  webcamCtx.clearRect(0, 0, webcamCanvas.width, webcamCanvas.height);

  // 1. Draw webcam image
  webcamCtx.drawImage(results.image, 0, 0, webcamCanvas.width, webcamCanvas.height);

  // 2. Fetch the corresponding reference frame landmarks
  const currentTime = referenceVideo.currentTime;
  const targetIndex = Math.min(poseFeatures.length - 1, Math.round(currentTime * 30));
  const refFrame = poseFeatures[targetIndex];

  // 3. Compute score if landmarks exist
  if (refFrame && refFrame.landmarks && results.poseLandmarks) {
    const similarity = computeJointSimilarity(refFrame.landmarks, results.poseLandmarks);
    const score = scaleScore(similarity);
    
    currentScoreEl.textContent = score;
    frameScores.push(score);
    allScores.push(score);
  } else {
    currentScoreEl.textContent = "0";
  }

  // 4. Draw user skeleton skeleton
  drawSkeleton(webcamCtx, results.poseLandmarks);
}

// Sleek Custom Skeleton Renderer
function drawSkeleton(ctx, landmarks) {
  if (!landmarks) return;

  const connections = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Upper body
    [11, 23], [12, 24], [23, 24], // Torso
    [23, 25], [25, 27], [24, 26], [26, 28] // Lower body
  ];

  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)'; // Neon Indigo
  ctx.shadowBlur = 10;
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
  const keyJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  keyJoints.forEach((idx) => {
    const p = landmarks[idx];
    if (p && (p.visibility || 0) > 0.5) {
      // Joint Fill (Hot Pink)
      ctx.beginPath();
      ctx.arc(p.x * webcamCanvas.width, p.y * webcamCanvas.height, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ec4899';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ec4899';
      ctx.fill();

      // Outer rings (White border)
      ctx.beginPath();
      ctx.arc(p.x * webcamCanvas.width, p.y * webcamCanvas.height, 10, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
  });

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

// --- 6. 2-Second Segment Rating & Final Summary (Task 6) ---
function evaluateSegmentScore() {
  if (frameScores.length === 0) return;

  const average = frameScores.reduce((a, b) => a + b, 0) / frameScores.length;
  frameScores = []; // Reset for next 2 seconds

  let rating = 'Miss';
  let className = 'miss';

  if (average >= 85) {
    rating = 'Perfect';
    className = 'perfect';
  } else if (average >= 70) {
    rating = 'Good';
    className = 'good';
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

  // Grade classification
  let grade = 'C';
  if (finalAverage >= 90) grade = 'S';
  else if (finalAverage >= 80) grade = 'A';
  else if (finalAverage >= 70) grade = 'B';

  // Display summary overlay modal
  finalGradeEl.textContent = grade;
  finalScoreEl.textContent = finalAverage.toFixed(1);
  summarySection.classList.remove('hidden');
}

// --- 7. State Reset Handlers ---
function resetToUploadState() {
  // Stop webcam tracks if active
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }

  clearInterval(feedbackIntervalId);
  clearInterval(timelineIntervalId);

  isTestingState = false;
  isPlayingState = false;
  poseFeatures = [];

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
