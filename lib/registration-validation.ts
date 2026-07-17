import { z } from "zod";

const requiredName = (label: string) =>
  z
    .string({ error: `${label} обов’язкове.` })
    .trim()
    .min(1, `${label} обов’язкове.`)
    .max(100, `${label} не може перевищувати 100 символів.`);

export const registrationSchema = z
  .object({
    firstName: requiredName("Ім’я"),
    lastName: requiredName("Прізвище"),
    email: z
      .string({ error: "Email обов’язковий." })
      .trim()
      .min(1, "Email обов’язковий.")
      .max(254, "Email не може перевищувати 254 символи.")
      .email("Введіть коректний email.")
      .transform((email) => email.toLowerCase()),
    password: z
      .string({ error: "Пароль обов’язковий." })
      .min(8, "Пароль повинен містити щонайменше 8 символів.")
      .max(128, "Пароль не може перевищувати 128 символів.")
      .regex(/[A-Z]/, "Пароль повинен містити велику літеру.")
      .regex(/[a-z]/, "Пароль повинен містити малу літеру.")
      .regex(/[0-9]/, "Пароль повинен містити цифру."),
    confirmPassword: z.string({ error: "Підтвердження пароля обов’язкове." }),
    organizationName: z
      .string({ error: "Назва організації обов’язкова." })
      .trim()
      .min(2, "Назва організації повинна містити щонайменше 2 символи.")
      .max(100, "Назва організації не може перевищувати 100 символів."),
    termsAccepted: z
      .boolean({ error: "Потрібно погодитися з умовами використання." })
      .refine(Boolean, {
        message: "Потрібно погодитися з умовами використання.",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Паролі не збігаються.",
    path: ["confirmPassword"],
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

export type RegistrationFieldErrors = Partial<
  Record<keyof RegistrationInput, string[]>
>;
