// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBJz9xjp0l9CuKzWu_d5c5GeW7wvSb6bLw",
  authDomain: "quanlychamcong-65794.firebaseapp.com",
  projectId: "quanlychamcong-65794",
  storageBucket: "quanlychamcong-65794.firebasestorage.app",
  messagingSenderId: "2581573153",
  appId: "1:2581573153:web:f7f72daf521fa0652e3d60",
  measurementId: "G-4JD5N905H3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;