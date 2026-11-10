import { z } from "zod";

export const updateBriefingPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  sources: z.array(z.string().min(1).max(120)).max(400).optional(),
  topics: z.array(z.string().min(1).max(120)).max(60).optional(),
  language: z.enum(["en", "bn", "auto"]).optional(),
  max_items: z.number().int().min(1).max(25).optional(),
  email_delivery: z.boolean().optional(),
  recipient_email: z.string().email().max(254).nullable().optional(),
});