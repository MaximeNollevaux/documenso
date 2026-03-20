import { z } from 'zod';

export const ZAccessAuthRequest2FASmsRequestSchema = z.object({
  token: z.string().min(1),
});

export const ZAccessAuthRequest2FASmsResponseSchema = z.object({
  success: z.boolean(),
  expiresAt: z.date(),
});

export type TAccessAuthRequest2FASmsRequest = z.infer<
  typeof ZAccessAuthRequest2FASmsRequestSchema
>;
export type TAccessAuthRequest2FASmsResponse = z.infer<
  typeof ZAccessAuthRequest2FASmsResponseSchema
>;
