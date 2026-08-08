import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────
// 🩹 ONE-TIME CLEANUP for tiffins created *before* the disk→database image
// fix. Those documents still have an `imageUrl` like
// "/uploads/tiffins/xxx.jpg" pointing at a file that Render's ephemeral
// disk already deleted — that old path can never work again, no matter
// what the code does, because the actual image bytes are gone. Left as-is,
// the frontend tries to load that dead URL and shows a broken-image icon
// (exactly what's showing on the deployed site right now).
//
// This runs once on every server start: any tiffin whose imageUrl still
// points at the old "/uploads/" disk path gets that field cleared, so the
// frontend's existing fallback (see getTiffinImage in client/src/pages/
// home.tsx) shows the category's default image instead of a broken icon.
// New uploads made after this fix are stored as base64 in MongoDB itself
// (server/middleware/upload.ts) and are NOT touched by this cleanup, so
// they keep showing normally and survive restarts going forward.
//
// Sellers whose tiffins get cleared this way just need to open "Edit" on
// that tiffin and re-upload the photo once — after that save, it's stored
// the new (persistent) way permanently.
// ─────────────────────────────────────────────────────────────────────────
async function cleanupStaleDiskImageUrls() {
  try {
    const result = await mongoose.connection.collection("tiffins").updateMany(
      { imageUrl: { $regex: "^/uploads/" } },
      { $unset: { imageUrl: "" } }
    );
    if (result.modifiedCount > 0) {
      console.log(
        `🩹 Cleared ${result.modifiedCount} stale /uploads/ image reference(s) left over from before the disk→database image fix. Affected sellers should re-upload those photos once.`
      );
    }
  } catch (error) {
    console.error("⚠️ Stale image URL cleanup skipped due to error:", error);
  }
}

export async function connectDB() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected successfully");

    await cleanupStaleDiskImageUrls();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});
