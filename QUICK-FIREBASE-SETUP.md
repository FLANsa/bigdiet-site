# 🚀 Quick Firebase Setup (5 Minutes)

## Step 1: Create Firebase Project
1. **Go to**: https://console.firebase.google.com/
2. **Click**: "Create a project"
3. **Name**: `big-diet-system`
4. **Click**: "Continue" → "Continue" → "Create project"

## Step 2: Enable Firestore
1. **Click**: "Firestore Database" (in left menu)
2. **Click**: "Create database"
3. **Select**: "Start in test mode"
4. **Click**: "Next" → "Done"

## Step 3: Get Your Config
1. **Click**: ⚙️ (gear icon) → "Project settings"
2. **Scroll down** to "Your apps"
3. **Click**: Web icon `</>`
4. **Name**: `big-diet-web`
5. **Click**: "Register app"
6. **Copy** the config object (it looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "big-diet-system.firebaseapp.com",
  projectId: "big-diet-system",
  storageBucket: "big-diet-system.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 4: Update Your Project
1. **Open**: `firebase-config.js` in your project
2. **Replace** the placeholder config with your real config
3. **Save** the file

## Step 5: Deploy
1. **Commit and push** your changes
2. **Your website will auto-deploy** with Firebase!

## ✅ Done!
Your data will now be stored online and sync across all devices!

---

**Need help?** Just copy your Firebase config and I'll help you update the files!
