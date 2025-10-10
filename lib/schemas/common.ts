import { z } from "zod";

export const idSchema = z.string().min(1, "ID requerido");
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});
