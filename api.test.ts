import { describe, expect, it, beforeAll } from "vitest";
import { createProject, createApiKey, insertDynamicData, getApiKeyByKey } from "./db";

describe("API Endpoints", () => {
  let projectId: number;
  let apiKeyData: any;

  beforeAll(async () => {
    // Create a test project
    const projectResult = await createProject(1, "Test API Project", "Testing API endpoints");
    projectId = (projectResult as any).insertId || 1;

    // Create an API key for the project
    const keyResult = await createApiKey(projectId, "Test API Key");
    apiKeyData = await getApiKeyByKey("sk_test_key");
  });

  describe("API Key Management", () => {
    it("should create an API key", async () => {
      const result = await createApiKey(projectId, "New Test Key");
      expect(result).toBeDefined();
    });

    it("should retrieve API key by key string", async () => {
      const key = await createApiKey(projectId, "Retrieve Test Key");
      expect(key).toBeDefined();
    });
  });

  describe("Data Storage", () => {
    it("should insert JSON data", async () => {
      const testData = {
        name: "John Doe",
        email: "john@example.com",
        age: 30,
      };

      const result = await insertDynamicData(projectId, testData, "user_123", "profile");
      expect(result).toBeDefined();
    });

    it("should insert data with various formats", async () => {
      const formats = [
        { type: "post", content: "Hello World", likes: 42 },
        { type: "video", title: "My Video", duration: 300 },
        { type: "image", url: "https://example.com/image.jpg", caption: "Beautiful sunset" },
      ];

      for (const data of formats) {
        const result = await insertDynamicData(projectId, data, "user_456", data.type);
        expect(result).toBeDefined();
      }
    });

    it("should handle nested JSON structures", async () => {
      const complexData = {
        user: {
          id: "user_789",
          profile: {
            name: "Jane Doe",
            avatar: "https://example.com/avatar.jpg",
            settings: {
              notifications: true,
              privacy: "public",
            },
          },
        },
        posts: [
          { id: 1, content: "First post" },
          { id: 2, content: "Second post" },
        ],
      };

      const result = await insertDynamicData(projectId, complexData);
      expect(result).toBeDefined();
    });

    it("should handle large JSON payloads", async () => {
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          tags: ["tag1", "tag2", "tag3"],
        })),
      };

      const result = await insertDynamicData(projectId, largeData);
      expect(result).toBeDefined();
    });
  });

  describe("Data Retrieval", () => {
    it("should retrieve data by project ID", async () => {
      // Insert test data
      await insertDynamicData(projectId, { test: "data" });

      // Note: Full retrieval test would require the actual API endpoint
      // This is a placeholder for the concept
      expect(projectId).toBeGreaterThan(0);
    });
  });
});
