// ✅ Standalone email test script
// Run with:  npx tsx server/test-email.ts your.email@example.com
// If no email is passed, it sends the test to EMAIL_USER itself.

import dotenv from "dotenv";
dotenv.config();

import { testEmailSending } from "./emailService";

const targetEmail = process.argv[2] || process.env.EMAIL_USER;

if (!targetEmail) {
  console.log("❌ No email address given and EMAIL_USER is not set in .env");
  process.exit(1);
}

console.log(`\n🧪 Sending test email to: ${targetEmail}\n`);

testEmailSending(targetEmail)
  .then((result) => {
    if (result) {
      console.log("\n✅ SUCCESS — check the inbox (and spam folder) for the test email.\n");
    } else {
      console.log("\n❌ FAILED — see the error above for the reason (usually bad EMAIL_USER/EMAIL_PASS).\n");
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ FAILED with an unexpected error:", err);
    process.exit(1);
  });
