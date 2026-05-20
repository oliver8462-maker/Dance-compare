import assert from 'assert';
import { getAngle, computeJointSimilarity, scaleScore } from '../math-utils.js';

console.log('Running math-utils tests...');

// 1. Test Angle calculation (Right Angle)
const p1 = { x: 1, y: 0 };
const p2 = { x: 0, y: 0 };
const p3 = { x: 0, y: 1 };
const angle90 = getAngle(p1, p2, p3);
assert.ok(Math.abs(angle90 - Math.PI / 2) < 1e-5, `Angle should be 90 degrees (pi/2), got ${angle90}`);

// 2. Test perfect similarity (Identical poses)
const mockLandmarks = Array(33).fill(null).map(() => ({ x: 0, y: 0, visibility: 0.9 }));
// Set up joints coordinates for elbow, shoulder, hip, knee, etc.
const indices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
indices.forEach(idx => {
  mockLandmarks[idx] = { x: idx, y: idx * 2, visibility: 0.9 };
});

const simPerfect = computeJointSimilarity(mockLandmarks, mockLandmarks);
assert.strictEqual(simPerfect, 1.0, `Perfect matches should yield 1.0 similarity, got ${simPerfect}`);

// 3. Test Score scaling
assert.strictEqual(scaleScore(1.0), 100, 'Similarity of 1.0 should map to 100');
assert.strictEqual(scaleScore(0.65), 0, 'Similarity of 0.65 should map to 0');
assert.strictEqual(scaleScore(0.825), 50, 'Similarity of 0.825 should map to 50');
assert.strictEqual(scaleScore(0.5), 0, 'Similarity below minSimilarity should map to 0');

console.log('All math tests passed successfully!');
