import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAV0xHmsp6SYIsp4upVVV5X67VvpcCK5io",
  authDomain: "kad-multiplier.firebaseapp.com",
  projectId: "kad-multiplier",
  storageBucket: "kad-multiplier.firebasestorage.app",
  messagingSenderId: "393687457894",
  appId: "1:393687457894:web:b5829b7139079b43688da7"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore with multi-tab offline cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
