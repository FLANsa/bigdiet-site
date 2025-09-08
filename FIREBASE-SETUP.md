# Firebase Setup Guide for Big Diet System

## 🚀 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name: `big-diet-system` (or any name you prefer)
4. Enable Google Analytics (optional)
5. Click **"Create project"**

## 🔧 Step 2: Enable Firestore Database

1. In your Firebase project, click **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for now)
4. Select a location (choose closest to your users)
5. Click **"Done"**

## 🔑 Step 3: Get Configuration

1. Click the **gear icon** → **"Project settings"**
2. Scroll down to **"Your apps"**
3. Click **"Web app"** icon (`</>`)
4. Enter app nickname: `big-diet-web`
5. Click **"Register app"**
6. Copy the `firebaseConfig` object

## 📝 Step 4: Update Configuration

1. Open `firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

## 🔒 Step 5: Set Up Security Rules

1. Go to **Firestore Database** → **Rules**
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"**

## 📱 Step 5: Update Your HTML Files

Add these script tags to your HTML files (before the closing `</body>` tag):

```html
<!-- Firebase SDK -->
<script type="module" src="firebase-config.js"></script>
<script src="online-database.js"></script>
```

## 🎯 Step 6: Test the Setup

1. Deploy your updated code to Render
2. Open your website
3. Add a customer
4. Check Firebase Console → Firestore Database
5. You should see your data in the `customers` collection

## 🔄 Step 7: Replace Database Calls

The system will automatically use the online database when Firebase is configured, and fall back to localStorage when offline.

## 📊 Collections Structure

Your Firestore will have these collections:
- `customers` - Customer information
- `packages` - Meal packages
- `subscriptions` - Customer subscriptions
- `dailyRegistrations` - Daily meal collections
- `activities` - System activities

## 🆓 Cost Information

- **Firebase Firestore**: Free tier includes 1GB storage, 50K reads, 20K writes per day
- **Perfect for small to medium businesses**
- **No credit card required for free tier**

## 🆘 Troubleshooting

### If data doesn't appear:
1. Check browser console for errors
2. Verify Firebase config is correct
3. Check Firestore security rules
4. Ensure Firebase project is active

### If you see "Firebase not loaded":
1. Check if firebase-config.js is loaded
2. Verify Firebase project is created
3. Check network connectivity

## ✅ Success!

Once configured, your Big Diet system will:
- ✅ Store all data online
- ✅ Sync across all devices automatically
- ✅ Work offline with local backup
- ✅ Scale with your business

Your customers will now be visible on all devices! 🎉
