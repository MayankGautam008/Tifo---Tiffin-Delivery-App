import { Notification } from "../models/Notification";
import mongoose from "mongoose";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  try {
    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      title,
      message,
      data,
    });
    await notification.save();
    return notification;
  } catch (err) {
    console.error("❌ Failed to create notification:", err);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, isRead: false });
}
