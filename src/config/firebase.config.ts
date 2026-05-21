import * as admin from "firebase-admin";

const initializeFirebase = () => {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, "\n"),
          }),
        });
        console.log("💯💯💯 Firebase initialized successfully. 💯💯💯");
      } catch (error) {
        console.error("❌ Firebase Admin SDK initialization error:", error);
      }
    } else {
      console.warn(
        "⚠️ Firebase credentials missing in .env file. Push notifications will not work."
      );
    }
  }
};

export default initializeFirebase;
