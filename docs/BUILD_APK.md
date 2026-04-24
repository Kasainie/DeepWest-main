# Building the LKTECH Android APK

The landing page has a "Download APK" button that is automatically enabled when a valid APK exists at `public/downloads/lktech.apk`. This file **cannot be generated inside the Lovable sandbox** — the Android SDK and Gradle are not installed there. You must build it locally.

## One-time setup

You need:
- **Node.js 20+** and **npm**
- **Java JDK 17** (Android Gradle Plugin requirement)
- **Android Studio** (includes the Android SDK, Gradle, and platform tools)
- The project pulled to your local machine (export to GitHub from Lovable, then `git clone`)

```bash
# Install JS dependencies
npm install

# Add the Android platform (only the first time)
npx cap add android

# Keep native dependencies in sync
npx cap update android
```

## Build & link the APK

Every time you want a fresh APK:

```bash
# 1. Build the web bundle
npm run build

# 2. Sync the bundle into the Android project
npx cap sync android

# 3. Compile the APK (debug — fastest, signed with a debug key)
cd android
./gradlew assembleDebug
cd ..

# 4. Copy the freshly built APK into public/downloads/lktech.apk
npm run prepare:apk
```

The `prepare:apk` script looks for:
- `android/app/build/outputs/apk/release/app-release.apk` (preferred)
- `android/app/build/outputs/apk/debug/app-debug.apk` (fallback)

It validates the file (correct name, ≥100 KB) and copies it to `public/downloads/lktech.apk`. The next `vite build` will then enable the download button on the landing page.

## Building a signed release APK (Play Store / public distribution)

Debug APKs are fine for internal testing but show a "Play Protect" warning. For public release:

1. Generate a keystore (one time):
   ```bash
   keytool -genkey -v -keystore lktech-release.keystore \
     -alias lktech -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Configure signing in `android/app/build.gradle` (`signingConfigs.release`).
3. Run:
   ```bash
   cd android && ./gradlew assembleRelease && cd ..
   npm run prepare:apk
   ```

## Verifying the pipeline

After running `npm run prepare:apk`, you should see:
```
Copied APK asset from android/app/build/outputs/apk/.../app-*.apk to public/downloads/lktech.apk (XXXXXX bytes).
```

Then run `npm run build` and check the build log — the APK is included in `dist/downloads/lktech.apk` and the landing page button is enabled at runtime.

## Why can't Lovable build this for me?

Building an APK requires the Android SDK (~3 GB), Java JDK, and Gradle. The Lovable sandbox is a lightweight Node.js environment without these tools. The Capacitor configuration, the prepare script, the build-time validation, and the landing-page UI are all wired up here — only the final `./gradlew assembleDebug` step needs to run on a machine with Android Studio.

## Recommended reading

- [Lovable + Capacitor blog post](https://lovable.dev/blog/2025-04-22-using-capacitor-to-deploy-on-mobile)
- [Capacitor Android docs](https://capacitorjs.com/docs/android)
