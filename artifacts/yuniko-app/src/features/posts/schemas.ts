import { z } from "zod";
export const createPostSchema=z.object({caption:z.string().max(5000).default(""),mediaUrl:z.string().url().optional(),mediaType:z.enum(["image","video"]).default("image"),location:z.string().max(200).optional(),hashtags:z.array(z.string().max(100)).max(30).default([]),visibility:z.enum(["public","followers"]).default("public")});
export type CreatePostInput=z.infer<typeof createPostSchema>;
