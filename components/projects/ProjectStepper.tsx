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
    <div className="grid grid-cols-5">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div
            key={step.label}
            className="relative flex flex-col items-center text-center"
          >
            {index !== steps.length - 1 && (
              <div
                className={`
                  absolute left-1/2 right-[-50%] top-[15px] h-[3px]
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
                mt-2.5 text-[13.5px] font-semibold
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