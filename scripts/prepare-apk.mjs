import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const candidatePaths = [
  "android/app/build/outputs/apk/release/app-release.apk",
  "android/app/build/outputs/apk/debug/app-debug.apk",
];

const destinationRelativePath = "public/downloads/lktech.apk";
const destinationPath = path.resolve(rootDir, destinationRelativePath);

const sourceRelativePath = candidatePaths.find((candidate) => fs.existsSync(path.resolve(rootDir, candidate)));

fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

if (!sourceRelativePath) {
  if (fs.existsSync(destinationPath)) {
    fs.rmSync(destinationPath);
    console.log(`Removed stale APK asset at ${destinationRelativePath}`);
  }

  console.log("No Android APK build found. Expected one of:");
  candidatePaths.forEach((candidate) => console.log(`- ${candidate}`));
  process.exit(0);
}

const sourcePath = path.resolve(rootDir, sourceRelativePath);
fs.copyFileSync(sourcePath, destinationPath);
console.log(`Copied APK asset from ${sourceRelativePath} to ${destinationRelativePath}`);