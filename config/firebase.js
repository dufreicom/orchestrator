const { initializeApp } = require("firebase/app");
const { getAnalytics } = require("firebase/analytics");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: `${process.env.FIREBASE_APIKEY}`,
  authDomain: `${process.env.FIREBASE_AUTHDOMAIN}`,
  databaseURL: `${process.env.FIREBASE_DATABASEURL}`,
  projectId: `${process.env.FIREBASE_PROJECTID}`,
  storageBucket: `${process.env.FIREBASE_STORAGEBUCKET}`,
  messagingSenderId: `${process.env.FIREBASE_MESSAGINGSENDERID}`,
  appId: `${process.env.FIREBASE_APPID}`,
  measurementId: `${process.env.FIREBASE_MEASUREMENTID}`
};


// Initialize Firebase
const appFirebase = initializeApp(firebaseConfig)
module.exports  = {appFirebase}
