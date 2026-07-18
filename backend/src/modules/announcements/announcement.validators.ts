import { z } from "zod";

export const announcementIdParamSchema = z.object({
  id: z.string().uuid("Invalid announcement id"),
});

export const createAnnouncementSchema = z.object({
  text: z.string().trim().min(2, "Text is too short").max(300),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

// Bulk reorder: the full ordered list of announcement ids.
export const reorderAnnouncementsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
