// Math utilities for pose angle comparison

export const JOINTS = {
  LEFT_ELBOW: { name: 'Left Elbow', points: [11, 13, 15] },
  RIGHT_ELBOW: { name: 'Right Elbow', points: [12, 14, 16] },
  LEFT_SHOULDER: { name: 'Left Shoulder', points: [23, 11, 13] },
  RIGHT_SHOULDER: { name: 'Right Shoulder', points: [24, 12, 14] },
  LEFT_KNEE: { name: 'Left Knee', points: [23, 25, 27] },
  RIGHT_KNEE: { name: 'Right Knee', points: [24, 26, 28] },
  LEFT_HIP: { name: 'Left Hip', points: [11, 23, 25] },
  RIGHT_HIP: { name: 'Right Hip', points: [12, 24, 26] },
  LEFT_WRIST: { name: 'Left Wrist', points: [13, 15, 19] },
  RIGHT_WRIST: { name: 'Right Wrist', points: [14, 16, 20] },
  LEFT_ANKLE: { name: 'Left Ankle', points: [25, 27, 31] },
  RIGHT_ANKLE: { name: 'Right Ankle', points: [26, 28, 32] }
};


/**
 * Calculates the angle (in radians) between three 2D points with p2 as the vertex.
 */
export function getAngle(p1, p2, p3) {
  const u = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v = { x: p3.x - p2.x, y: p3.y - p2.y };
  const dot = u.x * v.x + u.y * v.y;
  const lenU = Math.sqrt(u.x * u.x + u.y * u.y);
  const lenV = Math.sqrt(v.x * v.x + v.y * v.y);
  if (lenU === 0 || lenV === 0) return 0;
  const cos = dot / (lenU * lenV);
  return Math.acos(Math.max(-1, Math.min(1, cos)));
}

/**
 * Computes average similarity of joint angles between reference pose and user pose landmarks.
 * Filtered by visibility threshold.
 */
export function computeJointSimilarity(refLandmarks, userLandmarks, minVisibility = 0.5) {
  let totalSim = 0;
  let validCount = 0;

  for (const key in JOINTS) {
    const [i1, i2, i3] = JOINTS[key].points;
    const refP1 = refLandmarks[i1], refP2 = refLandmarks[i2], refP3 = refLandmarks[i3];
    const userP1 = userLandmarks[i1], userP2 = userLandmarks[i2], userP3 = userLandmarks[i3];

    // Ensure points exist
    if (!refP1 || !refP2 || !refP3 || !userP1 || !userP2 || !userP3) continue;

    // Check visibility
    const refVis = Math.min(refP1.visibility || 0, refP2.visibility || 0, refP3.visibility || 0);
    const userVis = Math.min(userP1.visibility || 0, userP2.visibility || 0, userP3.visibility || 0);

    if (refVis >= minVisibility && userVis >= minVisibility) {
      const refAngle = getAngle(refP1, refP2, refP3);
      const userAngle = getAngle(userP1, userP2, userP3);
      const diff = Math.abs(refAngle - userAngle);
      // 極寬鬆夾角扣分：除以 Math.PI，最大容許誤差為 180 度
      const sim = Math.max(0, 1 - (diff / Math.PI));
      totalSim += sim;
      validCount++;
    }
  }

  return validCount > 0 ? totalSim / validCount : 0;
}

export function scaleScore(avgSim, minSimilarity = 0.40) {
  if (avgSim < minSimilarity) return 0;
  const k = 12.0;
  const m = 0.70;
  const sigmoid = (x) => 1 / (1 + Math.exp(-k * (x - m)));
  
  const f_sim = sigmoid(avgSim);
  const f_min = sigmoid(minSimilarity);
  const f_max = sigmoid(1.0);
  
  const score = ((f_sim - f_min) / (f_max - f_min)) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}
