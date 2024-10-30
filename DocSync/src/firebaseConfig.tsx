// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC2-du58qlRU-KFd-QjSsZZ7fP_c9b3g2w",
  authDomain: "docsync-3c17d.firebaseapp.com",
  projectId: "docsync-3c17d",
  storageBucket: "docsync-3c17d.appspot.com",
  messagingSenderId: "575116045461",
  appId: "1:575116045461:web:6766dc49408df3f961ff9c",
  measurementId: "G-2J031EX871"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const firestore = getFirestore(app);
export const auth = getAuth(app);

