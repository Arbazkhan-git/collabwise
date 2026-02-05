import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWXELDGkE5wQReF3Dp-nHHSFdX-DvK0Sw",
  authDomain: "collabwise-71ac7.firebaseapp.com",
  projectId: "collabwise-71ac7",
  storageBucket: "collabwise-71ac7.firebasestorage.app",
  messagingSenderId: "500711829875",
  appId: "1:500711829875:web:d1f0c4fa0b9188defe9506"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
