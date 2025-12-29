import { Router, Request, Response } from "express";
import { getApiKeyByKey, getDynamicDataByProjectId, insertDynamicData, updateDynamicData, deleteDynamicData, searchDynamicData, getProjectById } from "./db";
import { TRPCError } from "@trpc/server";

const router = Router();

/**
 * Middleware to authenticate API requests using API key
 */
async function authenticateApiKey(req: Request, res: Response, next: Function) {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const keyData = await getApiKeyByKey(apiKey);

  if (!keyData || !keyData.isActive) {
    return res.status(401).json({ error: "Invalid or revoked API key" });
  }

  // Attach API key data to request
  (req as any).apiKey = keyData;
  (req as any).projectId = keyData.projectId;

  next();
}

/**
 * GET /api/v1/data - List all data for a project
 */
router.get("/v1/data", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const projectId = (req as any).projectId;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const data = await getDynamicDataByProjectId(projectId, limit, offset);

    res.json({
      success: true,
      data,
      pagination: {
        limit,
        offset,
        total: data.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/data - Insert new data
 */
router.post("/api/v1/data", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const projectId = (req as any).projectId;
    const { data, userId, dataType, isPublic } = req.body;

    if (!data) {
      return res.status(400).json({ error: "Data field is required" });
    }

    const result = await insertDynamicData(projectId, data, userId, dataType, isPublic);

    res.status(201).json({
      success: true,
      message: "Data inserted successfully",
      result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/data/:id - Update existing data
 */
router.put("/api/v1/data/:id", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const projectId = (req as any).projectId;
    const dataId = BigInt(req.params.id);
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: "Data field is required" });
    }

    const result = await updateDynamicData(dataId, data);

    res.json({
      success: true,
      message: "Data updated successfully",
      result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/data/:id - Delete data
 */
router.delete("/api/v1/data/:id", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const dataId = BigInt(req.params.id);

    const result = await deleteDynamicData(dataId);

    res.json({
      success: true,
      message: "Data deleted successfully",
      result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/data/search - Search data by userId or dataType
 */
router.get("/api/v1/data/search", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const projectId = (req as any).projectId;
    const userId = req.query.userId as string | undefined;
    const dataType = req.query.dataType as string | undefined;

    const data = await searchDynamicData(projectId, userId, dataType);

    res.json({
      success: true,
      data,
      filters: {
        userId,
        dataType,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/project - Get project info
 */
router.get("/api/v1/project", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const projectId = (req as any).projectId;
    const project = await getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        isActive: project.isActive,
        createdAt: project.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/health - Health check endpoint
 */
router.get("/api/v1/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
