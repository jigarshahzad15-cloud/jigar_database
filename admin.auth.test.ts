import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { hashPassword, comparePassword, createAdminUser, authenticateAdmin, getAdminById } from "./auth";

describe("Admin Authentication", () => {
  const testEmail = "test@example.com";
  const testPassword = "TestPassword123!";
  let createdAdminId: number;

  beforeAll(async () => {
    // Create a test admin user
    await createAdminUser(testEmail, testPassword, "Test Admin");
  });

  describe("Password Hashing", () => {
    it("should hash a password", async () => {
      const hashedPassword = await hashPassword(testPassword);
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(testPassword);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it("should compare password correctly", async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isMatch = await comparePassword(testPassword, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it("should not match incorrect password", async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isMatch = await comparePassword("WrongPassword123!", hashedPassword);
      expect(isMatch).toBe(false);
    });
  });

  describe("Admin User Creation", () => {
    it("should create an admin user", async () => {
      const email = "newadmin@example.com";
      const password = "NewAdminPassword123!";
      
      await createAdminUser(email, password, "New Admin");
      
      const admin = await authenticateAdmin(email, password);
      expect(admin).toBeDefined();
      expect(admin?.email).toBe(email);
      expect(admin?.name).toBe("New Admin");
    });

    it("should use email prefix as name if name not provided", async () => {
      const email = "noname@example.com";
      const password = "NoNamePassword123!";
      
      await createAdminUser(email, password);
      
      const admin = await authenticateAdmin(email, password);
      expect(admin?.name).toBe("noname");
    });
  });

  describe("Admin Authentication", () => {
    it("should authenticate with correct credentials", async () => {
      const admin = await authenticateAdmin(testEmail, testPassword);
      expect(admin).toBeDefined();
      expect(admin?.email).toBe(testEmail);
      expect(admin?.name).toBe("Test Admin");
      createdAdminId = admin?.id || 0;
    });

    it("should return null with incorrect password", async () => {
      const admin = await authenticateAdmin(testEmail, "WrongPassword");
      expect(admin).toBeNull();
    });

    it("should return null with non-existent email", async () => {
      const admin = await authenticateAdmin("nonexistent@example.com", testPassword);
      expect(admin).toBeNull();
    });

    it("should update lastSignedIn on successful authentication", async () => {
      const beforeAuth = new Date(Date.now() - 1000); // 1 second before
      await authenticateAdmin(testEmail, testPassword);
      const afterAuth = new Date(Date.now() + 1000); // 1 second after

      const admin = await getAdminById(createdAdminId);
      expect(admin?.lastSignedIn).toBeDefined();
      if (admin?.lastSignedIn) {
        expect(admin.lastSignedIn.getTime()).toBeGreaterThanOrEqual(beforeAuth.getTime());
        expect(admin.lastSignedIn.getTime()).toBeLessThanOrEqual(afterAuth.getTime());
      }
    });
  });

  describe("Get Admin By ID", () => {
    it("should retrieve admin by ID", async () => {
      const admin = await getAdminById(createdAdminId);
      expect(admin).toBeDefined();
      expect(admin?.email).toBe(testEmail);
      expect(admin?.name).toBe("Test Admin");
    });

    it("should return null for non-existent ID", async () => {
      const admin = await getAdminById(99999);
      expect(admin).toBeNull();
    });
  });
});
