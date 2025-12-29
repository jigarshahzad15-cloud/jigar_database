import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { adminUsers } from "../drizzle/schema";
import { getDb } from "./db";

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain password with a hashed password
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Create or update admin user with hashed password
 */
export async function createAdminUser(
  email: string,
  password: string,
  name?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const hashedPassword = await hashPassword(password);

  await db
    .insert(adminUsers)
    .values({
      email,
      passwordHash: hashedPassword,
      name: name || email.split("@")[0],
      isActive: true,
    })
    .onDuplicateKeyUpdate({
      set: {
        passwordHash: hashedPassword,
        name: name || email.split("@")[0],
      },
    });
}

/**
 * Authenticate admin user with email and password
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ id: number; email: string; name: string | null } | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const admin = result[0];

  if (!admin.isActive) {
    return null;
  }

  const passwordMatch = await comparePassword(password, admin.passwordHash);

  if (!passwordMatch) {
    return null;
  }

  // Update lastSignedIn
  await db
    .update(adminUsers)
    .set({ lastSignedIn: new Date() })
    .where(eq(adminUsers.id, admin.id));

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
  };
}

/**
 * Get admin user by ID
 */
export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
