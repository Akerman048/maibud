import { z } from "zod";

export const googleOnboardingSchema = z.object({
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
});

export type GoogleOnboardingState = {
  error: string;
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof googleOnboardingSchema>, string[]>
  >;
};
