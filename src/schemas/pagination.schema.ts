import { z } from "zod";
const MAX_LIMIT = 10;

export const PaginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .default(`${MAX_LIMIT}`)
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num) || num <= 0) return MAX_LIMIT;
      return num > MAX_LIMIT ? MAX_LIMIT : num;
    }),
  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => {
      const num = Number(val);
      return isNaN(num) || num < 0 ? 0 : num;
    }),
});

export const PaginationWithSortSchema = PaginationSchema.extend({
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
});
