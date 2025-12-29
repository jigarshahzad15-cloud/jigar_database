import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, bigint, boolean } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Admin Users Table (for email/password authentication)
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: text("name"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

// Projects Table
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  schema: json("schema"), // Store flexible schema definition
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// API Keys Table
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  permissions: json("permissions"), // Store permissions as JSON array
  isActive: boolean("isActive").default(true).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// Dynamic Data Table (stores flexible data for each project)
export const dynamicData = mysqlTable("dynamic_data", {
  id: bigint("id", { mode: "bigint" }).autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: varchar("userId", { length: 255 }), // User ID from external platform
  dataType: varchar("dataType", { length: 100 }), // e.g., "post", "video", "profile"
  data: json("data").notNull(), // Flexible JSON data storage
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DynamicData = typeof dynamicData.$inferSelect;
export type InsertDynamicData = typeof dynamicData.$inferInsert;

// Relations
export const projectsRelations = relations(projects, ({ many, one }) => ({
  apiKeys: many(apiKeys),
  dynamicData: many(dynamicData),
  admin: one(adminUsers, {
    fields: [projects.adminUserId],
    references: [adminUsers.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  project: one(projects, {
    fields: [apiKeys.projectId],
    references: [projects.id],
  }),
}));

export const dynamicDataRelations = relations(dynamicData, ({ one }) => ({
  project: one(projects, {
    fields: [dynamicData.projectId],
    references: [projects.id],
  }),
}));