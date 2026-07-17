import { Modal } from "./Modal";
import { Button } from "./Button";

type ConfirmModalProps = {
  title: string;
  description: string;
  confirmText: string;
  variant?: "primary" | "danger";
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  title,
  description,
  confirmText,
  variant = "primary",
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal title={title} description={description} onClose={onClose}>
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          Скасувати
        </Button>

        <Button
          type="button"
          onClick={onConfirm}
          className={`w-full sm:w-auto ${
            variant === "danger"
              ? "bg-red-600 hover:bg-red-700"
              : ""
          }`}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
