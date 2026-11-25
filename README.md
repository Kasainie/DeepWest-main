# Deep West POS

Hospitality point-of-sale and management application built with React, TypeScript, Vite, and Supabase.

## Local development

Requirements: Node.js 22.12.x, 24.x, or 26+ and npm.

```sh
npm ci
npm run dev
```

Create a production build and run the test suite:

```sh
npm run build
npm test
```

## Android app

Build the web assets and sync them into the Android Studio project:

```sh
npm run android:sync
npx cap open android
```

In Android Studio, choose **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.
The login-screen download serves `public/deepwest-app.apk`; replace that file with a new APK and run `npm run build` to publish an updated download.
Incoming in-app notifications trigger a short vibration on Android while the app is open.
The Notifications menu also lets staff preview each available sound and adjust notification volume.

## Waiter ready-order alerts

In Staff Management, add a staff member with the **Waiter** role. Waiters are assigned to the Restaurant department and receive alerts when kitchen orders become ready. Alerts are scoped to the active hotel; share the hotel's login link with its waiters so duplicate staff codes at other hotels cannot be confused.
