// Firebase Configuration for Big Diet System
// Your actual Firebase project credentials

const firebaseConfig = {
    apiKey: "AIzaSyDjgSevhuwvS0Qxy5Mlr1YxLzd7srvI5Jo",
    authDomain: "big-diet-system.firebaseapp.com",
    projectId: "big-diet-system",
    storageBucket: "big-diet-system.firebasestorage.app",
    messagingSenderId: "735521485542",
    appId: "1:735521485542:web:016f2d770897ddd2e9c127",
    measurementId: "G-TTY4G06FL7"
};

// Initialize Firebase (Data Storage Only - No Authentication)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, getDoc, setDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export Firebase functions (Data Storage Only)
window.firebaseDB = {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy
};
