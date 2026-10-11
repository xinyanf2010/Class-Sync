const fs = require('fs');
const { PNG } = require('pngjs');
const pm = require('pixelmatch');
const pixelmatch = pm.default || pm;

const page = process.argv[2] || 'login'; // e.g., node scripts/compare-shots.js home
const ref = PNG.sync.read(fs.readFileSync(`shots/ref-${page}.png`));
const replica = PNG.sync.read(fs.readFileSync(`shots/replica-${page}.png`));
const { width, height } = ref;

// Compare the images
const numDiffPixels = pixelmatch(ref.data, replica.data, null, width, height, { threshold: 0.1 });
const totalPixels = width * height;
const diffPercent = ((numDiffPixels / totalPixels) * 100).toFixed(2);

console.log(`\n=== VISUAL COMPARISON: ${page} ===`);
console.log(`Difference between reference and replica: ${diffPercent}%`);
if (diffPercent > 1.0) {
    console.log("STATUS: Mismatch detected. CSS adjustments are needed.");
} else {
    console.log("STATUS: Match successful! Within 1% tolerance.");
}