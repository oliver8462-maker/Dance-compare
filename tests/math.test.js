import assert from 'assert';
import { getAngle, computeJointSimilarity, scaleScore, computeJointSimilarities } from '../math-utils.js';

console.log('Running math-utils tests...');

// 1. Test Angle calculation (Right Angle)
const p1 = { x: 1, y: 0 };
const p2 = { x: 0, y: 0 };
const p3 = { x: 0, y: 1 };
const angle90 = getAngle(p1, p2, p3);
assert.ok(Math.abs(angle90 - Math.PI / 2) < 1e-5, `Angle should be 90 degrees (pi/2), got ${angle90}`);

// 2. Test perfect similarity (Identical poses)
const mockLandmarks = Array(33).fill(null).map((_, idx) => ({ x: idx, y: idx * 2, visibility: 0.9 }));

const simPerfect = computeJointSimilarity(mockLandmarks, mockLandmarks);
assert.strictEqual(simPerfect, 1.0, `Perfect matches should yield 1.0 similarity, got ${simPerfect}`);

// 3. Test Score scaling
assert.strictEqual(scaleScore(1.0), 100, 'Similarity of 1.0 should map to 100');
assert.strictEqual(scaleScore(0.40), 0, 'Similarity of 0.40 should map to 0');
assert.ok(scaleScore(0.70) >= 45 && scaleScore(0.70) <= 55, 'Similarity of 0.70 (midpoint) should be around 50');
assert.strictEqual(scaleScore(0.3), 0, 'Similarity below minSimilarity should map to 0');

// 4. Test Joint Similarities (Individual joint scoring)
const mockLandmarksUser = Array(33).fill(null).map((_, idx) => ({ x: idx, y: idx * 2, visibility: 0.9 }));
// Modify LEFT_ELBOW points to introduce mismatch
mockLandmarksUser[13] = { x: 13, y: 13 * 2 + 5, visibility: 0.9 }; // Vertex p2 is at index 13
const details = computeJointSimilarities(mockLandmarks, mockLandmarksUser);
assert.ok(details.LEFT_ELBOW !== undefined, 'LEFT_ELBOW should be evaluated');
assert.ok(details.LEFT_ELBOW < 1.0, 'LEFT_ELBOW similarity should be less than 1.0');
assert.strictEqual(details.RIGHT_ELBOW, 1.0, 'RIGHT_ELBOW similarity should be exactly 1.0');

console.log('All math tests passed successfully!');
