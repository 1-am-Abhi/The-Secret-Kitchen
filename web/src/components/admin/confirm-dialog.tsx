"use client";

import * as React from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive by default — set to false for reversible actions. */
  destructive?: boolean;
  icon?: LucideIcon;
  onConfirm: () => void;
  /** Extra context rendered between the description and the buttons. */
  children?: React.ReactNode;
}

/**
 * Blocking confirmation for irreversible actions. Built on the shared Dialog so
 * focus trapping, Escape-to-close and scroll locking come from Radix rather
 * than being reimplemented.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  icon: Icon = AlertTriangle,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="items-start">
          <span
            className={cn(
              "mb-2 flex size-12 items-center justify-center rounded-2xl",
              destructive ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600",
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {children && <div className="px-6 pb-2">{children}</div>}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{cancelLabel}</Button>
          </DialogClose>
          <Button
            variant={destructive ? "destructive" : "primary"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
