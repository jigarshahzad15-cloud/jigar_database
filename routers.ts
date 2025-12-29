import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { authenticateAdmin, createAdminUser, getAdminById } from "./auth";
import { createProject, getProjectsByAdminId, getProjectById, updateProject, deleteProject, createApiKey, getApiKeysByProjectId, revokeApiKey, insertDynamicData, getDynamicDataByProjectId, updateDynamicData, deleteDynamicData, searchDynamicData } from "./db";
import { TRPCError } from "@trpc/server";

// Protected procedure for admin users
const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.adminSession) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Admin authentication
  admin: router({
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const admin = await authenticateAdmin(input.email, input.password);
        if (!admin) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }

        // Set admin session (simplified - in production use proper JWT)
        ctx.res.cookie("admin_session", JSON.stringify(admin), {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return { success: true, admin };
      }),

    adminLogout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie("admin_session");
      return { success: true };
    }),

    getAdminInfo: adminProcedure.query(async ({ ctx }) => {
      if (!ctx.adminSession?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const admin = await getAdminById(ctx.adminSession.id);
      return admin;
    }),
  }),

  // Projects management
  projects: router({
    list: adminProcedure.query(async ({ ctx }) => {
      if (!ctx.adminSession?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return getProjectsByAdminId(ctx.adminSession.id);
    }),

    get: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.adminUserId !== ctx.adminSession?.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return project;
      }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          schema: z.any().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.adminSession?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        return createProject(ctx.adminSession.id, input.name, input.description, input.schema);
      }),

    update: adminProcedure
      .input(
        z.object({
          projectId: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          schema: z.any().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.adminUserId !== ctx.adminSession?.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return updateProject(input.projectId, {
          name: input.name,
          description: input.description,
          schema: input.schema,
        });
      }),

    delete: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.adminUserId !== ctx.adminSession?.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return deleteProject(input.projectId);
      }),
  }),

  // API Keys management
  apiKeys: router({
    list: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.adminUserId !== ctx.adminSession?.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getApiKeysByProjectId(input.projectId);
      }),

    create: adminProcedure
      .input(
        z.object({
          projectId: z.number(),
          name: z.string().min(1),
          permissions: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.adminUserId !== ctx.adminSession?.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return createApiKey(input.projectId, input.name, input.permissions);
      }),

    revoke: adminProcedure
      .input(z.object({ apiKeyId: z.number() }))
      .mutation(async ({ input }) => {
        return revokeApiKey(input.apiKeyId);
      }),
  }),

  // Dynamic data management
  data: router({
    list: adminProcedure
      .input(
        z.object({
          projectId: z.number(),
          limit: z.number().default(100),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.adminUserId !== ctx.adminSession?.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getDynamicDataByProjectId(input.projectId, input.limit, input.offset);
      }),

    create: adminProcedure
      .input(
        z.object({
          projectId: z.number(),
          data: z.any(),
          userId: z.string().optional(),
          dataType: z.string().optional(),
          isPublic: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.adminUserId !== ctx.adminSession?.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return insertDynamicData(input.projectId, input.data, input.userId, input.dataType, input.isPublic);
      }),

    update: adminProcedure
      .input(
        z.object({
          dataId: z.bigint(),
          data: z.any(),
        })
      )
      .mutation(async ({ input }) => {
        return updateDynamicData(input.dataId, input.data);
      }),

    delete: adminProcedure
      .input(z.object({ dataId: z.bigint() }))
      .mutation(async ({ input }) => {
        return deleteDynamicData(input.dataId);
      }),

    search: adminProcedure
      .input(
        z.object({
          projectId: z.number(),
          userId: z.string().optional(),
          dataType: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.adminUserId !== ctx.adminSession?.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return searchDynamicData(input.projectId, input.userId, input.dataType);
      }),
  }),
});

export type AppRouter = typeof appRouter;
