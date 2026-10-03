import { z } from "zod";
import { isSafePublicUrl } from "./url";

/** A URL the server is allowed to fetch: valid, http(s), public internet only. */
export const publicUrlSchema = z
  .string()
  .url()
  .refine(isSafePublicUrl, { message: "URL must be a public http(s) address." });
