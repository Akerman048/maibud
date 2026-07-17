import { FiCheck } from "react-icons/fi";

type Step = {
  label: string;
};

type ProjectStepperProps = {
  currentStep: number;
};

const steps: Step[] = [
  { label: "Проєктування" },
  { label: "Подача в експертизу" },
  { label: "Експертиза" },
  { label: "Завантаження в ЄДЕССБ" },
  { label: "Завершено" },
];

export function ProjectStepper({ currentStep }: ProjectStepperProps) {
  return (
    <div className="flex flex-col gap-4 sm:grid sm:grid-cols-5 sm:gap-0">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div
            key={step.label}
            className="relative flex min-w-0 items-center gap-3 text-left sm:flex-col sm:gap-0 sm:text-center"
          >
            {index !== steps.length - 1 && (
              <div
                className={`
                  absolute left-1/2 right-[-50%] top-[15px] hidden h-[3px] sm:block
                  ${isCompleted ? "bg-[var(--color-success)]" : "bg-[var(--color-border)]"}
                `}
              />
            )}

            <div
              className={`
                relative z-10 flex size-8 items-center justify-center rounded-full text-sm font-bold
                ${
                  isCompleted
                    ? "bg-[var(--color-success)] text-white"
                    : isCurrent
                      ? "bg-[var(--color-accent)] text-white shadow-[0_0_0_5px_rgba(37,99,235,0.15)]"
                      : "border-2 border-[var(--color-border)] bg-white text-[var(--color-text-muted)]"
                }
              `}
            >
              {isCompleted ? <FiCheck className="size-4" /> : stepNumber}
            </div>

            <div
              className={`
                break-words text-[13.5px] font-semibold sm:mt-2.5
                ${
                  isCompleted
                    ? "text-green-700"
                    : isCurrent
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)]"
                }
              `}
            >
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
