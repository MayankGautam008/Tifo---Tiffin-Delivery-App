import bcrypt from "bcryptjs";
import { User } from "./models/User";

export async function createDefaultAdmin() {
  try {
    const adminEmail = "admin@tiffinbox.com";
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("shashank", 10);
      await User.create({
        name: "Admin",
        email: adminEmail,
        phone: "9999999999",
        password: hashedPassword,
        role: "admin",
      });
      console.log("✅ Default admin account created (admin@tiffinbox.com / shashank)");
    }
  } catch (error) {
    console.error("Error creating default admin:", error);
  }
}
