"use client";

import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  pendingLabel: string;
  type?: "submit" | "button";
};

export function FormSubmitButton({
  children,
  className,
  disabled = false,
  pendingLabel,
  type = "submit",
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={className}
      data-pending={pending ? "true" : "false"}
      disabled={disabled || pending}
      type={type}
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
