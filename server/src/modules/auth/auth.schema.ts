import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address.").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(10, "Choose a password of at least 10 characters."),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "The new password must differ from the current one.",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
