import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBgP5LRNIWZ--m9AD-WyJrUlcDdaejZZ1w",
  authDomain: "liga-deportiva-rio-grande.firebaseapp.com",
  databaseURL: "https://liga-deportiva-rio-grande-default-rtdb.firebaseio.com",
  projectId: "liga-deportiva-rio-grande",
  storageBucket: "liga-deportiva-rio-grande.firebasestorage.app",
  messagingSenderId: "891069210817",
  appId: "1:891069210817:web:084f30d4637ef1672fb440"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export {
  app,
  auth,
  db
};