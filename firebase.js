import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAV0xHmsp6SYIsp4upVVV5X67VvpcCK5io",
  authDomain: "kad-multiplier.firebaseapp.com",
  projectId: "kad-multiplier",
  storageBucket: "kad-multiplier.firebasestorage.app",
  messagingSenderId: "393687457894",
  appId: "1:393687457894:web:b5829b7139079b43688da7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
