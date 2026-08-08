import { LoyaltyAccount, LoyaltyTransaction } from "../models/Loyalty";
import mongoose from "mongoose";

// Points earning config
const POINTS_PER_RUPEE = 0.1; // ₹10 spent = 1 point
const POINTS_REDEMPTION_VALUE = 0.5; // 1 point = ₹0.50
const MIN_REDEEM_POINTS = 50;

// Tier thresholds (lifetime earned points)
const TIERS = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
};

function getTier(lifetimeEarned: number): "bronze" | "silver" | "gold" | "platinum" {
  if (lifetimeEarned >= TIERS.platinum) return "platinum";
  if (lifetimeEarned >= TIERS.gold) return "gold";
  if (lifetimeEarned >= TIERS.silver) return "silver";
  return "bronze";
}

export async function getOrCreateAccount(userId: string) {
  let account = await LoyaltyAccount.findOne({ userId });
  if (!account) {
    account = new LoyaltyAccount({ userId: new mongoose.Types.ObjectId(userId) });
    await account.save();
  }
  return account;
}

export async function earnPoints(userId: string, bookingId: string, amountPaid: number): Promise<number> {
  try {
    const pointsEarned = Math.floor(amountPaid * POINTS_PER_RUPEE);
    if (pointsEarned <= 0) return 0;

    const account = await getOrCreateAccount(userId);
    account.totalPoints += pointsEarned;
    account.availablePoints += pointsEarned;
    account.lifetimeEarned += pointsEarned;
    account.tier = getTier(account.lifetimeEarned);
    await account.save();

    await LoyaltyTransaction.create({
      userId,
      bookingId,
      type: "earned",
      points: pointsEarned,
      description: `Earned ${pointsEarned} points for booking`,
      balance: account.availablePoints,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    return pointsEarned;
  } catch (err) {
    console.error("❌ earnPoints error:", err);
    return 0;
  }
}

export async function redeemPoints(userId: string, pointsToRedeem: number): Promise<{ success: boolean; discountAmount: number; message: string }> {
  if (pointsToRedeem < MIN_REDEEM_POINTS) {
    return { success: false, discountAmount: 0, message: `Minimum ${MIN_REDEEM_POINTS} points required to redeem` };
  }

  const account = await getOrCreateAccount(userId);
  if (account.availablePoints < pointsToRedeem) {
    return { success: false, discountAmount: 0, message: "Insufficient points" };
  }

  const discountAmount = Math.floor(pointsToRedeem * POINTS_REDEMPTION_VALUE);

  account.availablePoints -= pointsToRedeem;
  account.redeemedPoints += pointsToRedeem;
  await account.save();

  await LoyaltyTransaction.create({
    userId,
    type: "redeemed",
    points: -pointsToRedeem,
    description: `Redeemed ${pointsToRedeem} points for ₹${discountAmount} discount`,
    balance: account.availablePoints,
  });

  return { success: true, discountAmount, message: `₹${discountAmount} discount applied` };
}

export async function getLoyaltyInfo(userId: string) {
  const account = await getOrCreateAccount(userId);
  const transactions = await LoyaltyTransaction.find({ userId }).sort({ createdAt: -1 }).limit(20);
  const nextTier = account.tier === "platinum" ? null : Object.entries(TIERS).find(([t, v]) => v > account.lifetimeEarned);

  return {
    account,
    transactions,
    pointsValue: POINTS_REDEMPTION_VALUE,
    pointsPerRupee: POINTS_PER_RUPEE,
    minRedeemPoints: MIN_REDEEM_POINTS,
    nextTier: nextTier ? { name: nextTier[0], pointsNeeded: nextTier[1] - account.lifetimeEarned } : null,
  };
}
