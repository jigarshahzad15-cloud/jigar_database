import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, adminUsers, projects, apiKeys, dynamicData, InsertProject, InsertApiKey, InsertDynamicData } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Project helpers
export async function createProject(adminUserId: number, name: string, description?: string, schema?: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values({
    adminUserId,
    name,
    description,
    schema,
    isActive: true,
  });

  return result;
}

export async function getProjectsByAdminId(adminUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(projects).where(eq(projects.adminUserId, adminUserId));
}

export async function getProjectById(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProject(projectId: number, updates: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(projects).set(updates).where(eq(projects.id, projectId));
}

export async function deleteProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(projects).set({ isActive: false }).where(eq(projects.id, projectId));
}

// API Key helpers
export async function createApiKey(projectId: number, name: string, permissions?: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate unique API key
  const key = `sk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  return db.insert(apiKeys).values({
    projectId,
    key,
    name,
    permissions: permissions || ["read", "write"],
    isActive: true,
  });
}

export async function getApiKeysByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(apiKeys).where(eq(apiKeys.projectId, projectId));
}

export async function getApiKeyByKey(key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function revokeApiKey(apiKeyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, apiKeyId));
}

// Dynamic Data helpers
export async function insertDynamicData(projectId: number, data: any, userId?: string, dataType?: string, isPublic?: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(dynamicData).values({
    projectId,
    userId,
    dataType,
    data,
    isPublic: isPublic || false,
  });
}

export async function getDynamicDataByProjectId(projectId: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(dynamicData)
    .where(eq(dynamicData.projectId, projectId))
    .limit(limit)
    .offset(offset);
}

export async function getDynamicDataById(dataId: bigint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(dynamicData).where(eq(dynamicData.id, dataId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateDynamicData(dataId: bigint, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(dynamicData).set({ data, updatedAt: new Date() }).where(eq(dynamicData.id, dataId));
}

export async function deleteDynamicData(dataId: bigint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(dynamicData).where(eq(dynamicData.id, dataId));
}

export async function searchDynamicData(projectId: number, userId?: string, dataType?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(dynamicData.projectId, projectId)];
  if (userId) conditions.push(eq(dynamicData.userId, userId));
  if (dataType) conditions.push(eq(dynamicData.dataType, dataType));

  return db.select().from(dynamicData).where(and(...conditions));
}
