"use client";

import { useState } from "react";

import { mockRemarks } from "@/data/mockRemarks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ReturnRemarkModal } from "@/components/remarks/ReturnRemarkModal";

type Remark = (typeof mockRemarks)[number];

export function RemarksView() {
  const [selectedRemark, setSelectedRemark] = useState<Remark | null>(null);

  function handleReturnRemark() {
    if (!selectedRemark) {
      return;
    }

    console.log("Повертаємо зауваження:", selectedRemark.id);

    setSelectedRemark(null);
  }

  return (
    <>
      <div className="grid gap-4">
        {mockRemarks.map((remark) => (
          <Card key={remark.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-semibold">{remark.project}</div>

                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Розділ: {remark.section}
                </div>

                <p className="mt-3 text-sm text-[var(--color-text-primary)]">
                  {remark.text}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    remark.status === "Відкрите"
                      ? "warning"
                      : remark.status === "Відпрацьоване"
                        ? "info"
                        : "danger"
                  }
                >
                  {remark.status}
                </Badge>

                {remark.status === "Відпрацьоване" && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedRemark(remark)}
                  >
                    Повернути
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

{selectedRemark && (
  <ReturnRemarkModal
    projectName={selectedRemark.project}
    onClose={() => setSelectedRemark(null)}
    onReturn={handleReturnRemark}
  />
)}
    </>
  );
}