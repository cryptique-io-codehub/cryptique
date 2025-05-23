// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getAuth} from "firebase/auth"
import {getFirestore} from "firebase/firestore"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD1VUlSiKwK8H2MyUl8LRwozlMrSBvEPS4",
  authDomain: "cryptique-login.firebaseapp.com",
  projectId: "cryptique-login",
  storageBucket: "cryptique-login.firebasestorage.app",
  messagingSenderId: "850772139338",
  appId: "1:850772139338:web:49d648340a7baedf8f35b3",
  measurementId: "G-1E04XV4RKF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Configure additional auth settings to help with SmartScreen
const auth = getAuth();
auth.useDeviceLanguage(); // Ensure proper language for auth UI
// Set custom parameters for Google auth to improve security perception
auth.tenantId = null; // Ensure default tenant

export const db=getFirestore(app);
export { auth };
export default app;