import { z } from "zod";

import { UserRole } from "@/app/generated/prisma/client";

export const invitationEmailSchema = z
  .string({ error: "Email обов’язковий." })
  .trim()
  .min(1, "Email обов’язковий.")
  .max(254, "Email не може перевищувати 254 символи.")
  .email("Вкажіть коректний email.")
  .transform((email) => email.toLowerCase());

export const invitationRoleSchema = z.enum([
  UserRole.EXPERT,
  UserRole.DESIGNER,
  UserRole.ARCHIVIST,
]);

export const invitationTokenSchema = z
  .string({ error: "Запрошення недійсне." })
  .trim()
  .min(32, "Запрошення недійсне.")
  .max(128, "Запрошення недійсне.")
  .regex(/^[A-Za-z0-9_-]+$/, "Запрошення недійсне.");

export const invitationCallbackPathSchema = z
  .string()
  .regex(/^\/invite\/[A-Za-z0-9_-]{32,128}$/);

export function getInvitationCallbackPath(token: string) {
  const parsedToken = invitationTokenSchema.safeParse(token);
  return parsedToken.success ? `/invite/${parsedToken.data}` : null;
}

export function getSafeInvitationCallbackPath(value: unknown) {
  const parsed = invitationCallbackPathSchema.safeParse(value);
  return parsed.success ? parsed.data : "/dashboard";
}

export const invitationIdSchema = z
  .string({ error: "Не вказано запрошення." })
  .trim()
  .min(1, "Не вказано запрошення.")
  .max(128, "Некоректне запрошення.");

export const optionalProjectIdSchema = z
  .string()
  .trim()
  .max(128, "Некоректний проєкт.")
  .optional()
  .transform((value) => value || undefined);

export const createInvitationInputSchema = z.object({
  email: invitationEmailSchema,
  role: invitationRoleSchema,
  projectId: optionalProjectIdSchema,
});

export const invitationMutationSchema = z.object({
  invitationId: invitationIdSchema,
});

export const invitationRegistrationSchema = z
  .object({
    token: invitationTokenSchema,
    name: z
      .string({ error: "Ім’я обов’язкове." })
      .trim()
      .min(1, "Ім’я обов’язкове.")
      .max(200, "Ім’я не може перевищувати 200 символів."),
    password: z
      .string({ error: "Пароль обов’язковий." })
      .min(8, "Пароль повинен містити щонайменше 8 символів.")
      .max(128, "Пароль не може перевищувати 128 символів.")
      .regex(/[A-Z]/, "Пароль повинен містити велику літеру.")
      .regex(/[a-z]/, "Пароль повинен містити малу літеру.")
      .regex(/[0-9]/, "Пароль повинен містити цифру."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Паролі не збігаються.",
    path: ["confirmPassword"],
  });

export type InvitationRole = z.infer<typeof invitationRoleSchema>;
