import webpush from "web-push";

// Run once with `npm run generate-vapid` and paste the output into server/.env
// (see .env.example). These identify *this server* to push services — they
// are not per-user secrets, just one keypair for the whole app.
const keys = webpush.generateVAPIDKeys();
console.log("Add these to server/.env:\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
