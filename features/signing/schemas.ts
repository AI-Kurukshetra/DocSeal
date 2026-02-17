import { z } from "zod";

export const recipientSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string(),
});

export const requestSchema = z.object({
  document_id: z.string().uuid(),
  recipients: z.array(recipientSchema).min(1, "Add at least one recipient"),
  message: z.string(),
});

export type RequestInput = z.infer<typeof requestSchema>;
