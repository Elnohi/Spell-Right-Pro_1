const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

firebase.initializeApp(firebaseConfig);
firebase.analytics();

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
  }
});

function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = "login.html";
  });
}
