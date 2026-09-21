importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyCyCwOyYeB4o1i4KQyRWoVbJBhQUWvjBFE",
    authDomain: "ding-4f6cc.firebaseapp.com",
    projectId: "ding-4f6cc",
    storageBucket: "ding-4f6cc.firebasestorage.app",
    messagingSenderId: "320738100003",
    appId: "1:320738100003:web:bb17686e9bb5360a3c8296"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.data.title;
    const notificationOptions = {
        body: payload.data.body,
        icon: '/icon-180.png'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});
