import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const candidatePaths = [
  "android/app/build/outputs/apk/release/app-release.apk",
  "android/app/build/outputs/apk/debug/app-debug.apk",
];

const destinationRelativePath = "public/downloads/lktech.apk";
const destinationPath = path.resolve(rootDir, destinationRelativePath);
const expectedFilenamePattern = /^app-(release|debug)\.apk$/i;
const minimumApkBytes = 1024 * 100; // 100 KB sanity floor — real APKs are MB-sized

const removeStaleAsset = (reason) => {
  if (fs.existsSync(destinationPath)) {
    fs.rmSync(destinationPath);
    console.log(`Removed stale APK asset at ${destinationRelativePath} (${reason})`);
  }
};

fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

const sourceRelativePath = candidatePaths.find((candidate) => {
  const absolute = path.resolve(rootDir, candidate);
  if (!fs.existsSync(absolute)) return false;
  const filename = path.basename(absolute);
  if (!expectedFilenamePattern.test(filename)) {
    console.warn(`Skipping ${candidate}: filename "${filename}" does not match expected pattern.`);
    return false;
  }
  const stats = fs.statSync(absolute);
  if (!stats.isFile() || stats.size < minimumApkBytes) {
    console.warn(`Skipping ${candidate}: file is empty or smaller than ${minimumApkBytes} bytes (got ${stats.size}).`);
    return false;
  }
  return true;
});

if (!sourceRelativePath) {
  removeStaleAsset("no valid APK build found");
  console.log("No valid Android APK build found. Expected one of:");
  candidatePaths.forEach((candidate) => console.log(`- ${candidate}`));
  process.exit(0);
}

const sourcePath = path.resolve(rootDir, sourceRelativePath);
fs.copyFileSync(sourcePath, destinationPath);

const copiedStats = fs.statSync(destinationPath);
if (!copiedStats.isFile() || copiedStats.size < minimumApkBytes) {
  removeStaleAsset(`copied file failed validation (size ${copiedStats.size})`);
  console.error(`Copied APK at ${destinationRelativePath} failed post-copy validation.`);
  process.exit(1);
}

console.log(
  `Copied APK asset from ${sourceRelativePath} to ${destinationRelativePath} (${copiedStats.size} bytes).`,
);
