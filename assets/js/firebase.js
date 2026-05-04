// /assets/js/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

const firebaseConfig = {
	apiKey: "AIzaSyDoxGourzS7RJ0MTvh16fACQIy9QC4Nv3k",
	authDomain: "tcnweboldal.firebaseapp.com",
	projectId: "tcnweboldal",
	storageBucket: "tcnweboldal.firebasestorage.app",
	messagingSenderId: "866942440874",
	appId: "1:866942440874:web:342e27d42c7950511cc7d3",
	measurementId: "G-799X7V4087"
};

console.log('Initializing Firebase with config:', firebaseConfig);

const app = initializeApp(firebaseConfig);
console.log('Firebase app initialized');

export const auth = getAuth(app);
console.log('Auth initialized');

export const db = getFirestore(app);
console.log('Firestore initialized');

export const storage = getStorage(app, "gs://tcnweboldal.firebasestorage.app");
console.log('Storage initialized with gs://tcnweboldal.firebasestorage.app');

export const functions = getFunctions(app, 'europe-west1');
console.log('Functions initialized');

console.log('All Firebase modules loaded successfully');