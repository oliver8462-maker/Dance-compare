// Main application logic - Dance Similarity Scoring Software
import { computeJointSimilarity, scaleScore, computeJointSimilarities, computeJointDetails } from './math-utils.js';

// Firebase SDK (v10 compat via CDN ES modules)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeFirestore, collection, addDoc, doc, setDoc, getDoc, query, where, orderBy, limit, getDocs, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAPfEISg12wCGHG4tSr_i9h7UknfJvc62I",
  authDomain: "dance-b4610.firebaseapp.com",
  projectId: "dance-b4610",
  storageBucket: "dance-b4610.firebasestorage.app",
  messagingSenderId: "1012685266500",
  appId: "1:1012685266500:web:54c1e22fdf57c26ab32611",
  measurementId: "G-SY7762V3W8"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = initializeFirestore(firebaseApp, {
  forceLongPolling: true
});
const storage = getStorage(firebaseApp);

// Index array of the 16 landmarks used in similarity calculations
const CORE_LANDMARK_INDICES = [11, 12, 13, 14, 15, 16, 19, 20, 23, 24, 25, 26, 27, 28, 31, 32];

/**
 * Prunes and compresses landmarks array to minimize storage footprint.
 * Only keeps 16 core joints, rounds values to 4 decimal places.
 */
function compressPoseFeatures(features) {
  return features.map(f => {
    if (!f.landmarks) {
      return { time: f.time, landmarks: null };
    }
    // Only map the 16 core landmarks: format [index, x, y, visibility]
    const pruned = CORE_LANDMARK_INDICES.map(idx => {
      const p = f.landmarks[idx];
      if (!p) return [idx, 0, 0, 0];
      return [
        idx,
        parseFloat(p.x.toFixed(4)),
        parseFloat(p.y.toFixed(4)),
        parseFloat((p.visibility || 0).toFixed(4))
      ];
    });
    return { time: f.time, landmarks: pruned };
  });
}

/**
 * Restores compressed pose landmarks back to the 33-point structure required by math-utils.
 */
function decompressPoseFeatures(compressedFeatures) {
  return compressedFeatures.map(f => {
    if (!f.landmarks) {
      return { time: f.time, landmarks: null };
    }
    const restored = Array(33).fill(null);
    f.landmarks.forEach(([idx, x, y, vis]) => {
      restored[idx] = { x, y, z: 0, visibility: vis };
    });
    return { time: f.time, landmarks: restored };
  });
}

// Application State Variables
let poseFeatures = []; // Preprocessed reference pose landmarks sequence
let isPreprocessing = false;
let isTestingState = false;
let isPlayingState = false;

// Video Library State
let uploadedVideos = []; // Store items: { id, name, file, url, poseFeatures }
let activeVideoId = null;

// Auth State
let currentUser = null; // Firebase user object or null
let isGuest = false;
let isSignUpMode = false; // Toggle between login/signup form
let userNickname = ''; // Logged-in nickname or guest nickname
let isNewSignup = false; // Flag to track brand new user registrations
let pendingScoreSubmission = null; // Store { score, grade } temporarily during post-settlement nickname setup

async function checkNicknameAndPrompt() {
  if (currentUser) {
    if (isNewSignup) {
      isNewSignup = false;
      userNickname = '';
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists() && userDoc.data().nickname) {
        userNickname = userDoc.data().nickname;
        updateAuthUI();
      } else {
        userNickname = '';
      }
    } catch (err) {
      console.error('Error fetching user nickname:', err);
      userNickname = '';
    }
  } else if (isGuest) {
    const saved = localStorage.getItem('guestNickname');
    if (saved) {
      userNickname = saved;
      updateAuthUI();
    } else {
      userNickname = '';
    }
  }
}

// Real-time Scoring Variables
let frameScores = []; // Scores in the current 1.5-second interval
let allScores = []; // All scores recorded during the test
let segmentScores = []; // Stores objects { timeStart, timeEnd, score, rating }
let feedbackIntervalId = null;
let timelineIntervalId = null;

// Rating stats and joint tracking accumulators
let ratingsCount = { perfect: 0, great: 0, good: 0, miss: 0 };
let jointAccumulators = {}; // { JOINT_KEY: { sum: 0, count: 0 } }
let sessionMistakes = []; // Array of { time, jointKey, userAngle, refAngle, diff }

// Data Persistence Helper
async function saveStateToIndexedDB() {
  try {
    await idbKeyval.set('uploadedVideos', uploadedVideos);
    await idbKeyval.set('activeVideoId', activeVideoId);
  } catch (err) {
    console.error('Failed to save state to IndexedDB:', err);
  }
}

/**
 * Wraps a promise with a timeout. If the promise does not settle in `ms` milliseconds,
 * the returned promise rejects with `errorMsg`.
 */
function timeoutPromise(promise, ms, errorMsg) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg || "Timeout"));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

const JOINT_ADVICE = {
  LEFT_ELBOW: {
    name: '左手肘',
    advices: [
      '可以多注意左手臂彎曲的伸展度，讓動作更到位。',
      '左手肘的伸展幅度可再大一些，注意手臂線條的展開。',
      '左手臂彎曲時角度要注意收放，避免動作顯得過於緊繃。'
    ]
  },
  RIGHT_ELBOW: {
    name: '右手肘',
    advices: [
      '可以多注意右手手臂的彎曲與伸展角度。',
      '右手肘彎曲幅度可再深一些，讓右臂動作線條更完整。',
      '右手肘的開合可以再確實一點，隨節奏舒展。'
    ]
  },
  LEFT_SHOULDER: {
    name: '左肩膀',
    advices: [
      '左側肩膀的擺幅或抬高高度可以再做大一些，讓動作更舒展。',
      '左肩關節抬起的高度要更精確，注意雙肩要保持水平平衡。',
      '左肩拉開的幅度要足夠，這能讓左半身姿態顯得更流暢。'
    ]
  },
  RIGHT_SHOULDER: {
    name: '右肩膀',
    advices: [
      '右側肩膀的開合或抬高高度可以再加強一些，增加表現力。',
      '右肩可再向上抬高一些，避免右臂下垂導致姿態不夠延展。',
      '右肩與右臂的協調度可以提升，擺動幅度再大一點點。'
    ]
  },
  LEFT_KNEE: {
    name: '左膝蓋',
    advices: [
      '左腳膝蓋的彎曲下蹲幅度可以再深一些，這能讓你的重心更穩。',
      '左膝關節下蹲幅度不夠，建議在過渡動作時重心再壓低一點。',
      '左膝蓋的屈伸節奏需與身體律動配合，角度可再收放些。'
    ]
  },
  RIGHT_KNEE: {
    name: '右膝蓋',
    advices: [
      '右腳膝蓋的下蹲或伸直細節可以做得更確實，有助於高分。',
      '右膝彎曲幅度可加深，注意下蹲時保持身體平衡。',
      '右膝蓋配合踏步時的曲折度要更有力，動作不用急促。'
    ]
  },
  LEFT_HIP: {
    name: '左髖部/臀部',
    advices: [
      '左半邊身體的扭轉或骨盆重心擺放可以更穩定，保持姿態流暢。',
      '左側髖關節在轉動時的幅度不夠，重心可稍微左偏一些。',
      '左髖骨處的扭動要更隨性流暢，有助於帶動全身的律動。'
    ]
  },
  RIGHT_HIP: {
    name: '右髖部/臀部',
    advices: [
      '右半邊身體的扭轉或下盤重心維持可以更明確，提升動作美感。',
      '右側骨盆轉身幅度可以再加大一些，讓身形扭轉更具動感。',
      '右髖部重心在下移時應更為沉穩，避免腰部動作顯得漂浮。'
    ]
  },
  LEFT_WRIST: {
    name: '左手腕',
    advices: [
      '左手手掌或手腕的延伸角度可以再精準一點。',
      '左手腕的擺放方向有些偏離，注意手掌的微調。',
      '左手掌伸展時手腕不要過度下垂，應向外延伸展平。'
    ]
  },
  RIGHT_WRIST: {
    name: '右手腕',
    advices: [
      '右手手掌或手腕的指引方向與擺放位置可以再精緻一些。',
      '右手腕在細節上可以再往外展，配合小手臂的線條。',
      '右手掌擺動時的腕部轉折可再確實一些。'
    ]
  },
  LEFT_ANKLE: {
    name: '左腳踝',
    advices: [
      '左腳跨步的重心或步幅可以再精準確實一些。',
      '左腳踝著地時的方向與重心要再微調，站立角度可以再平穩些。',
      '左腳踝配合腿部的傾斜度可再擴大，讓步伐顯得更有彈性。'
    ]
  },
  RIGHT_ANKLE: {
    name: '右腳踝',
    advices: [
      '右腳跨步的重心或步幅可以再精準確實一些。',
      '右腳踝在點地或支撐時力道要更平均，腳踏動作角度要分明。',
      '右腳踝著地角度要符合影片對齊，注意步距的開展程度。'
    ]
  }
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

// 擷取失誤比對畫面用的離屏畫布 (160x120)
const captureCanvas = document.createElement('canvas');
captureCanvas.width = 160;
captureCanvas.height = 120;
const captureCtx = captureCanvas.getContext('2d');

function getReferenceFrameBase64() {
  try {
    captureCtx.clearRect(0, 0, 160, 120);
    captureCtx.drawImage(referenceVideo, 0, 0, 160, 120);
    return captureCanvas.toDataURL('image/jpeg', 0.6);
  } catch (err) {
    console.error("Failed to capture reference frame", err);
    return '';
  }
}

function getWebcamFrameBase64() {
  try {
    captureCtx.clearRect(0, 0, 160, 120);
    captureCtx.drawImage(webcamCanvas, 0, 0, 160, 120);
    return captureCanvas.toDataURL('image/jpeg', 0.6);
  } catch (err) {
    console.error("Failed to capture webcam frame", err);
    return '';
  }
}

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

const videoLibraryContainer = document.getElementById('video-library-container');
const videoLibraryList = document.getElementById('video-library-list');
const leaderboardContainer = document.getElementById('leaderboard-container');
const leaderboardList = document.getElementById('leaderboard-list');

// Auth DOM Elements
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authError = document.getElementById('auth-error');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleMsg = document.getElementById('auth-toggle-msg');
const guestBtn = document.getElementById('guest-btn');
const authUserInfo = document.getElementById('auth-user-info');
const authUserLabel = document.getElementById('auth-user-label');
const authActionBtn = document.getElementById('auth-action-btn');
const summaryScoreUploadStatus = document.getElementById('summary-score-upload-status');

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
window.addEventListener('DOMContentLoaded', async () => {
  initPoseModel();
  setupEventListeners();
  setupAuthListeners();

  const bootOverlay = document.getElementById('boot-overlay');
  
  const authPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        isGuest = false;
        await checkNicknameAndPrompt();
        await syncCloudVideoLibrary();
      }
      updateAuthUI();
      unsubscribe(); // Only listen once for boot
      resolve();
    });
    // 1.5s timeout safety net
    setTimeout(resolve, 1500); 
  });

  // Promise for IndexedDB load
  const dbPromise = (async () => {
    try {
      const savedVideos = await idbKeyval.get('uploadedVideos');
      const savedActiveId = await idbKeyval.get('activeVideoId');
      if (savedVideos && savedVideos.length > 0) {
        uploadedVideos = savedVideos.map(v => ({
          ...v,
          url: URL.createObjectURL(v.file) // Re-create Blob URL from persisted File
        }));
      }
      if (savedActiveId) {
        activeVideoId = savedActiveId;
      }
    } catch(err) {
      console.error('Error loading from IndexedDB', err);
    }
  })();

  // Await both parallel tasks
  await Promise.all([authPromise, dbPromise]);

  // Restore state logic
  if (uploadedVideos.length > 0) {
    updateVideoLibraryUI();
    if (activeVideoId) {
      window.switchActiveVideo(activeVideoId);
    }
  }

  // Remove overlay
  if (bootOverlay) {
    bootOverlay.classList.add('hidden');
    setTimeout(() => bootOverlay.remove(), 500);
  }
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
  
  // Compact dropzone while processing
  document.getElementById('dropzone').classList.add('compact');

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
  
  // Store processed video and features
  const newVideoId = 'vid_' + Date.now();
  let finalUrlForState = videoURL;
  let remoteStoragePath = null;

  if (currentUser) {
    preprocessStatusText.textContent = "正在將影片上傳至雲端儲儲...";
    try {
      const storageRef = ref(storage, `videos/${currentUser.uid}/${newVideoId}_${file.name}`);
      const uploadSnapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadSnapshot.ref);
      
      finalUrlForState = downloadURL;
      remoteStoragePath = `videos/${currentUser.uid}/${newVideoId}_${file.name}`;
      
      // Compress landmarks
      const compressed = compressPoseFeatures(poseFeatures);
      
      // Save metadata & features to Firestore
      await addDoc(collection(db, 'videos'), {
        videoId: newVideoId,
        userId: currentUser.uid,
        name: file.name,
        url: downloadURL,
        storagePath: remoteStoragePath,
        poseFeatures: JSON.stringify(compressed),
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to sync video to Firebase:', err);
      alert('上傳至雲端失敗，但您的影片將仍保存在本地快取。');
    }
  }

  const newVideo = {
    id: newVideoId,
    name: file.name,
    file: file,
    url: finalUrlForState,
    storagePath: remoteStoragePath,
    poseFeatures: [...poseFeatures]
  };
  uploadedVideos.push(newVideo);
  activeVideoId = newVideoId;
  
  preprocessStatusText.textContent = `骨架分析完成！總長 ${duration.toFixed(1)} 秒，已擷取 ${poseFeatures.length} 個關鍵特徵。`;
  preprocessPercentage.textContent = "100%";
  preprocessProgressBar.style.width = "100%";
  
  startControl.classList.remove('hidden');
  headerStatus.textContent = "準備完畢，可以開始測試";
  headerStatus.style.color = "var(--color-good)";
  
  if (typeof updateVideoLibraryUI === 'function') {
    updateVideoLibraryUI();
  }
  refreshLeaderboard();
  saveStateToIndexedDB();
}

async function syncCloudVideoLibrary() {
  if (!currentUser) return;
  
  try {
    const q = query(
      collection(db, 'videos'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Avoid duplicates
      if (!uploadedVideos.some(v => v.id === data.videoId)) {
        // Decompress landmarks
        const decompressed = decompressPoseFeatures(JSON.parse(data.poseFeatures));
        
        uploadedVideos.push({
          id: data.videoId,
          name: data.name,
          file: null, // Remote file has no local File object
          url: data.url,
          storagePath: data.storagePath || null,
          poseFeatures: decompressed
        });
      }
    });
    
    updateVideoLibraryUI();
    saveStateToIndexedDB();
  } catch (err) {
    console.error('Failed to sync cloud video library:', err);
  }
}

// --- 4. Webcam & Countdown Logic (Task 5) ---
async function initiateDanceTest() {
  isTestingState = true;
  isPlayingState = false;
  frameScores = [];
  allScores = [];
  segmentScores = [];
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
          const refImg = getReferenceFrameBase64();
          const userImg = getWebcamFrameBase64();
          
          sessionMistakes.push({
            time: currentTime,
            jointKey: key,
            userAngle: details.userAngle,
            refAngle: details.refAngle,
            diff: details.diff,
            refImg: refImg,
            userImg: userImg
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

  // Push to segmentScores array
  const segmentCount = segmentScores.length;
  segmentScores.push({
    timeStart: segmentCount * 1.5,
    timeEnd: (segmentCount + 1) * 1.5,
    score: Math.round(average),
    rating: rating
  });

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
    const perfectTexts = [
      '🌟 <strong>表現無懈可擊！</strong>您的所有動作配合得極為完美，各關節的角度拿捏非常精準，繼續保持！',
      '🌟 <strong>震撼全場的完美演出！</strong>每個關節的流暢度與角度都毫無瑕疵，簡直是專業舞者級別！',
      '🌟 <strong>極致完美的舞姿！</strong>整體動作框架與配合度驚人地高，完全找不到任何需要改進的地方，太厲害了！'
    ];
    adviceHTML = perfectTexts[Math.floor(Math.random() * perfectTexts.length)];
  } else if (lowestJoints.length > 0) {
    const worstCount = Math.min(2, lowestJoints.length);
    const worstLabels = [];
    for (let i = 0; i < worstCount; i++) {
      const item = lowestJoints[i];
      const adviceInfo = JOINT_ADVICE[item.key];
      if (adviceInfo && adviceInfo.advices && adviceInfo.advices.length > 0) {
        const randomAdvice = adviceInfo.advices[Math.floor(Math.random() * adviceInfo.advices.length)];
        worstLabels.push(`<strong>${adviceInfo.name}</strong>（${randomAdvice}）`);
      }
    }
    if (worstLabels.length > 0) {
      const introTexts = [
        `根據數據分析，您的整體動作非常棒！但若想挑戰更高分，可以特別調整以下部位：`,
        `您已經掌握了這支舞蹈的精髓！如果能加強以下幾個關鍵關節，整體表現會更上層樓：`,
        `您的節奏感很棒！以下是 AI 偵測到可再優化的身體部位細節，不妨微調看看：`
      ];
      const intro = introTexts[Math.floor(Math.random() * introTexts.length)];
      adviceHTML = `${intro}<br/>• ${worstLabels.join('<br/>• ')}`;
    } else {
      const positiveTexts = [
        '做得好！動作的整體完成度很高，下次嘗試挑戰更大的擺幅或更高強度的舞蹈影片吧！',
        '非常精彩！身體各部位都做得很到位，下一輪可以挑戰更快的節奏！',
        '表現不俗！肢體舒展程度適中，繼續練習相信很快就能突破自我極限！'
      ];
      adviceHTML = positiveTexts[Math.floor(Math.random() * positiveTexts.length)];
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
    let html = '<div class="advice-header">⚠️ 關鍵失誤時間點與動作對照</div>';
    html += worstMistakes.map(m => {
      const timeStr = `${Math.floor(m.time / 60).toString().padStart(2, '0')}:${Math.floor(m.time % 60).toString().padStart(2, '0')}`;
      const label = getDetailedMistakeLabel(m.jointKey, m.userAngle, m.refAngle);
      
      let imgComparisonHTML = '';
      if (m.refImg && m.userImg) {
        imgComparisonHTML = `
          <div class="mistake-comparison">
            <div class="comparison-img-wrapper">
              <img src="${m.refImg}" class="comparison-img ref-frame" alt="參考動作" />
              <span class="comparison-label">參考動作</span>
            </div>
            <div class="comparison-img-wrapper">
              <img src="${m.userImg}" class="comparison-img user-frame" alt="您的動作" />
              <span class="comparison-label">您的動作</span>
            </div>
          </div>
        `;
      }
      
      return `
        <div class="mistake-card-item">
          <div class="mistake-header-line">
            <span class="mistake-time">${timeStr}</span>
            <span class="mistake-desc">${label}</span>
          </div>
          ${imgComparisonHTML}
        </div>
      `;
    }).join('');
    mistakesTimelineEl.innerHTML = html;
  } else {
    mistakesTimelineEl.classList.add('hidden');
    mistakesTimelineEl.innerHTML = '';
  }

  // Render segment scores list
  const segmentScoresList = document.getElementById('segment-scores-list');
  if (segmentScoresList) {
    if (segmentScores.length === 0) {
      segmentScoresList.innerHTML = '<p class="leaderboard-empty">無評分資料</p>';
    } else {
      segmentScoresList.innerHTML = segmentScores.map(seg => {
        const timeStr = `${Math.floor(seg.timeStart / 60).toString().padStart(2, '0')}:${Math.floor(seg.timeStart % 60).toString().padStart(2, '0')} - ${Math.floor(seg.timeEnd / 60).toString().padStart(2, '0')}:${Math.floor(seg.timeEnd % 60).toString().padStart(2, '0')}`;
        const ratingClass = seg.rating.toLowerCase();
        return `
          <div class="segment-score-row ${ratingClass}">
            <span class="segment-score-time">${timeStr}</span>
            <span class="segment-score-value">${seg.score} 分 (${seg.rating})</span>
          </div>
        `;
      }).join('');
    }
  }

  // Fetch and render summary leaderboard inside Right Panel
  refreshSummaryLeaderboard();

  finalGradeEl.textContent = grade;
  finalScoreEl.textContent = finalAverage.toFixed(1);
  summarySection.classList.remove('hidden');

  // Open post-settlement nickname setup flow
  promptNicknameAndSubmit(finalAverage, grade);
}

function promptNicknameAndSubmit(score, grade) {
  pendingScoreSubmission = { score, grade };

  const nicknameOverlay = document.getElementById('nickname-overlay');
  const nicknameInput = document.getElementById('nickname-input');
  const nicknameError = document.getElementById('nickname-error');

  if (nicknameError) nicknameError.classList.add('hidden');

  // Pre-fill nickname if already known
  if (nicknameInput) {
    nicknameInput.value = userNickname || '';
  }

  // Show the nickname modal
  if (nicknameOverlay) {
    nicknameOverlay.classList.remove('hidden');
  }
}

async function refreshSummaryLeaderboard() {
  const summaryLeaderboardList = document.getElementById('summary-leaderboard-list');
  if (!summaryLeaderboardList) return;

  const activeVideo = uploadedVideos.find(v => v.id === activeVideoId);
  if (!activeVideo) {
    summaryLeaderboardList.innerHTML = '<p class="leaderboard-empty">無選定影片</p>';
    return;
  }

  const videoName = activeVideo.name;

  try {
    const scoresQuery = query(
      collection(db, 'scores'),
      where('videoName', '==', videoName),
      orderBy('score', 'desc'),
      limit(5)
    );

    const snapshot = await getDocs(scoresQuery);

    if (snapshot.empty) {
      summaryLeaderboardList.innerHTML = '<p class="leaderboard-empty">尚無挑戰紀錄，快來搶下第一名！</p>';
      return;
    }

    let html = '';
    let rank = 1;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isSelf = (currentUser && data.userId === currentUser.uid) || (!currentUser && data.nickname === userNickname);
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
      const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString('zh-TW') : '';
      const nicknameDisplay = data.nickname || (data.email ? maskEmail(data.email) : '訪客');

      html += `
        <div class="leaderboard-row ${isSelf ? 'self-row' : ''}">
          <span class="leaderboard-rank ${rankClass}">${rankEmoji}</span>
          <span class="leaderboard-email">${nicknameDisplay}${isSelf ? ' (你)' : ''}</span>
          <span class="leaderboard-score">${data.score}</span>
          <span class="leaderboard-grade">${data.grade}</span>
          <span class="leaderboard-date">${dateStr}</span>
        </div>
      `;
      rank++;
    });

    summaryLeaderboardList.innerHTML = html;
  } catch (error) {
    console.error('Failed to fetch summary leaderboard:', error);
    summaryLeaderboardList.innerHTML = '<p class="leaderboard-empty">排行榜載入失敗，請稍後再試。</p>';
  }
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
  
  // Remove compact dropzone state
  document.getElementById('dropzone').classList.remove('compact');
  videoInput.value = '';
  
  headerStatus.textContent = "準備就緒";
  headerStatus.style.color = "var(--text-muted)";
  
  if (typeof updateVideoLibraryUI === 'function') {
    updateVideoLibraryUI();
  }
}

// --- Video Library Actions ---
function updateVideoLibraryUI() {
  if (uploadedVideos.length === 0) {
    videoLibraryContainer.classList.add('hidden');
    videoLibraryList.innerHTML = '';
    return;
  }

  videoLibraryContainer.classList.remove('hidden');
  videoLibraryList.innerHTML = uploadedVideos.map(video => {
    const isActive = video.id === activeVideoId;
    return `
      <div class="library-item ${isActive ? 'active' : ''}" onclick="window.switchActiveVideo('${video.id}')">
        <div class="item-info">
          <span class="item-icon">🎥</span>
          <span class="item-name" title="${video.name}">${video.name}</span>
          ${isActive ? '<span class="item-badge">使用中</span>' : ''}
        </div>
        <div class="item-actions">
          <button class="btn-delete-item" onclick="window.deleteVideo('${video.id}', event)" title="刪除影片">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Expose functions to window scope for onclick attributes
window.switchActiveVideo = function(videoId) {
  const video = uploadedVideos.find(v => v.id === videoId);
  if (!video) return;

  activeVideoId = video.id;
  poseFeatures = video.poseFeatures;
  
  // Point elements to the cached URL
  referenceVideo.src = video.url;
  referenceVideo.load();
  tempVideo.src = video.url;
  tempVideo.load();

  // Reset progress and bypass preprocessing state
  document.getElementById('dropzone').classList.add('compact');
  preprocessContainer.classList.add('hidden');
  startControl.classList.remove('hidden');
  
  preprocessStatusText.textContent = `骨架分析完成！已讀取緩存的 ${poseFeatures.length} 個關鍵特徵。`;
  preprocessPercentage.textContent = "100%";
  preprocessProgressBar.style.width = "100%";
  headerStatus.textContent = "準備完畢，可以開始測試";
  headerStatus.style.color = "var(--color-good)";

  updateVideoLibraryUI();
  refreshLeaderboard();
  saveStateToIndexedDB();
};

window.deleteVideo = async function(videoId, event) {
  if (event) event.stopPropagation();
  
  const videoIndex = uploadedVideos.findIndex(v => v.id === videoId);
  if (videoIndex === -1) return;

  const targetVideo = uploadedVideos[videoIndex];
  
  // Delete from Cloud if logged in
  if (currentUser) {
    try {
      // Find Firestore document
      const q = query(
        collection(db, 'videos'),
        where('videoId', '==', videoId),
        where('userId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnapshot) => {
        await deleteDoc(docSnapshot.ref);
      });
      
      // Delete from Firebase Storage
      if (targetVideo.storagePath) {
        const fileRef = ref(storage, targetVideo.storagePath);
        await deleteObject(fileRef);
      }
    } catch (err) {
      console.warn('Failed to delete cloud assets:', err);
    }
  }

  // Free blob URL memory
  if (targetVideo.url && targetVideo.url.startsWith('blob:')) {
    URL.revokeObjectURL(targetVideo.url);
  }
  
  // Remove from state array
  uploadedVideos.splice(videoIndex, 1);

  if (activeVideoId === videoId) {
    if (uploadedVideos.length > 0) {
      window.switchActiveVideo(uploadedVideos[0].id);
    } else {
      activeVideoId = null;
      resetToUploadState();
    }
  } else {
    updateVideoLibraryUI();
  }
  saveStateToIndexedDB();
};

// --- 8. Firebase Auth & Firestore Logic ---

function setupAuthListeners() {
  // Monitor Firebase auth state
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      isGuest = false;
      await checkNicknameAndPrompt();
      if (typeof syncCloudVideoLibrary === 'function') {
        await syncCloudVideoLibrary();
      }
    }
    updateAuthUI();
  });



  // Login / Signup form submit
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!email || !password) return;

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = isSignUpMode ? '註冊中...' : '登入中...';
    hideAuthError();

    try {
      if (isSignUpMode) {
        isNewSignup = true;
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // onAuthStateChanged will fire and handle UI
      authOverlay.classList.add('hidden');
    } catch (error) {
      isNewSignup = false;
      showAuthError(getFirebaseErrorMessage(error.code));
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = isSignUpMode ? '註冊並登入' : '登入';
    }
  });

  // Toggle login / signup mode
  authToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    authToggleMsg.textContent = isSignUpMode ? '已有帳號？' : '還沒有帳號？';
    authToggleLink.textContent = isSignUpMode ? '返回登入' : '點此註冊';
    authSubmitBtn.textContent = isSignUpMode ? '註冊並登入' : '登入';
    hideAuthError();
  });

  // Guest mode button
  guestBtn.addEventListener('click', () => {
    isGuest = true;
    currentUser = null;
    authOverlay.classList.add('hidden');
    updateAuthUI();
  });

  // Header action button (login/signup or logout)
  authActionBtn.addEventListener('click', () => {
    if (currentUser) {
      // Logout
      signOut(auth).then(() => {
        currentUser = null;
        isGuest = true;
        userNickname = '';
        // Clear local storage guest nickname
        localStorage.removeItem('guestNickname');
        updateAuthUI();
      });
    } else {
      // Show auth overlay for login/signup
      authOverlay.classList.remove('hidden');
    }
  });

  // Nickname Form submission
  const nicknameOverlay = document.getElementById('nickname-overlay');
  const nicknameForm = document.getElementById('nickname-form');
  const nicknameInput = document.getElementById('nickname-input');
  const nicknameError = document.getElementById('nickname-error');
  const nicknameCancelBtn = document.getElementById('nickname-cancel-btn');

  if (nicknameForm) {
    nicknameForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nickname = nicknameInput.value.trim();
      if (nickname.length < 2 || nickname.length > 15) {
        nicknameError.textContent = '暱稱長度必須為 2 到 15 個字元。';
        nicknameError.classList.remove('hidden');
        return;
      }

      try {
        nicknameError.classList.add('hidden');
        const submitBtn = document.getElementById('nickname-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '儲存中...';

        if (currentUser) {
          // Save to Firestore users collection with 10-second timeout
          await timeoutPromise(
            setDoc(doc(db, 'users', currentUser.uid), {
              nickname: nickname,
              updatedAt: serverTimestamp()
            }),
            10000,
            "儲存超時，請檢查您的網路連線。"
          );
          userNickname = nickname;
        } else {
          // Save to LocalStorage for guest
          localStorage.setItem('guestNickname', nickname);
          userNickname = nickname;
        }

        updateAuthUI();
        nicknameOverlay.classList.add('hidden');

        // Submit pending score if exists
        if (pendingScoreSubmission) {
          await handleScoreSubmission(pendingScoreSubmission.score, pendingScoreSubmission.grade);
          pendingScoreSubmission = null;
        }

        // Refresh leaderboards
        refreshSummaryLeaderboard();
        refreshLeaderboard();
      } catch (err) {
        console.error('Failed to save nickname:', err);
        nicknameError.textContent = err.message && err.message.includes('儲存超時')
          ? err.message
          : '儲存失敗，請檢查網路連線。';
        nicknameError.classList.remove('hidden');
      } finally {
        const submitBtn = document.getElementById('nickname-submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = '確認儲存並上傳';
      }
    });
  }

  // Cancel/Skip button handler
  if (nicknameCancelBtn) {
    nicknameCancelBtn.addEventListener('click', () => {
      if (nicknameOverlay) {
        nicknameOverlay.classList.add('hidden');
      }
      pendingScoreSubmission = null; // Clear pending

      // Still refresh leaderboards to show current top scores
      refreshSummaryLeaderboard();
      refreshLeaderboard();

      summaryScoreUploadStatus.className = 'summary-score-upload-status guest';
      summaryScoreUploadStatus.textContent = '💡 分數未上傳。重新測試或上傳新影片可再次挑戰！';
      summaryScoreUploadStatus.classList.remove('hidden');
    });
  }
}

function updateAuthUI() {
  authUserInfo.classList.remove('hidden');
  if (currentUser) {
    authUserLabel.textContent = `👤 ${userNickname || currentUser.email}`;
    authActionBtn.textContent = '登出';
  } else if (isGuest) {
    authUserLabel.textContent = `👤 ${userNickname || '訪客模式 (Guest)'}`;
    authActionBtn.textContent = '登入 / 註冊';
  }
}

function showAuthError(message) {
  authError.textContent = message;
  authError.classList.remove('hidden');
}

function hideAuthError() {
  authError.classList.add('hidden');
  authError.textContent = '';
}

function getFirebaseErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': '此電子郵件已被註冊。',
    'auth/invalid-email': '請輸入有效的電子郵件地址。',
    'auth/weak-password': '密碼強度不足，請至少輸入 6 個字元。',
    'auth/user-not-found': '找不到此帳號，請先註冊。',
    'auth/wrong-password': '密碼錯誤，請重新輸入。',
    'auth/invalid-credential': '登入資訊無效，請檢查帳號與密碼。',
    'auth/too-many-requests': '登入嘗試次數過多，請稍後再試。',
    'auth/network-request-failed': '網路連線錯誤，請檢查您的網路。'
  };
  return messages[code] || `認證錯誤 (${code})`;
}

// Mask email for leaderboard display: "te***@gmail.com"
function maskEmail(email) {
  if (!email) return '???';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local}***@${domain}`;
  return `${local.substring(0, 2)}***@${domain}`;
}

// Submit score to Firestore after dance session
async function handleScoreSubmission(score, grade) {
  if (!currentUser && !userNickname) {
    // If guest doesn't have nickname yet
    summaryScoreUploadStatus.className = 'summary-score-upload-status guest';
    summaryScoreUploadStatus.innerHTML = '💡 填寫暱稱即可上傳分數至排行榜！';
    summaryScoreUploadStatus.classList.remove('hidden');
    return;
  }

  // Get the active video name for leaderboard grouping
  const activeVideo = uploadedVideos.find(v => v.id === activeVideoId);
  const videoName = activeVideo ? activeVideo.name : 'unknown';

  try {
    await addDoc(collection(db, 'scores'), {
      userId: currentUser ? currentUser.uid : `guest_${Date.now()}`,
      nickname: userNickname || '訪客',
      videoName: videoName,
      score: parseFloat(score.toFixed(1)),
      grade: grade,
      timestamp: serverTimestamp()
    });

    summaryScoreUploadStatus.className = 'summary-score-upload-status success';
    summaryScoreUploadStatus.textContent = '✓ 分數已成功上傳排行榜！';
    summaryScoreUploadStatus.classList.remove('hidden');
  } catch (error) {
    console.error('Failed to submit score to Firestore:', error);
    summaryScoreUploadStatus.className = 'summary-score-upload-status guest';
    summaryScoreUploadStatus.textContent = '⚠ 分數上傳失敗，請檢查網路連線。';
    summaryScoreUploadStatus.classList.remove('hidden');
  }
}

// Refresh leaderboard for the current active video
async function refreshLeaderboard() {
  const activeVideo = uploadedVideos.find(v => v.id === activeVideoId);
  if (!activeVideo) {
    leaderboardContainer.classList.add('hidden');
    return;
  }

  const videoName = activeVideo.name;
  leaderboardContainer.classList.remove('hidden');

  // Update leaderboard title with video name
  const leaderboardVideoTitle = document.getElementById('leaderboard-video-title');
  if (leaderboardVideoTitle) {
    leaderboardVideoTitle.textContent = `「 ${videoName} 」`;
  }

  try {
    const scoresQuery = query(
      collection(db, 'scores'),
      where('videoName', '==', videoName),
      orderBy('score', 'desc'),
      limit(5)
    );

    const snapshot = await getDocs(scoresQuery);

    if (snapshot.empty) {
      leaderboardList.innerHTML = '<p class="leaderboard-empty">尚無挑戰紀錄，快來搶下第一名！</p>';
      return;
    }

    let html = '';
    let rank = 1;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isSelf = (currentUser && data.userId === currentUser.uid) || (!currentUser && data.nickname === userNickname);
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
      const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString('zh-TW') : '';
      const nicknameDisplay = data.nickname || (data.email ? maskEmail(data.email) : '訪客');

      html += `
        <div class="leaderboard-row ${isSelf ? 'self-row' : ''}">
          <span class="leaderboard-rank ${rankClass}">${rankEmoji}</span>
          <span class="leaderboard-email">${nicknameDisplay}${isSelf ? ' (你)' : ''}</span>
          <span class="leaderboard-score">${data.score}</span>
          <span class="leaderboard-grade">${data.grade}</span>
          <span class="leaderboard-date">${dateStr}</span>
        </div>
      `;
      rank++;
    });

    leaderboardList.innerHTML = html;
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    leaderboardList.innerHTML = '<p class="leaderboard-empty">排行榜載入失敗，請稍後再試。</p>';
  }
}
