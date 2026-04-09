import React from "react";
import { useI18n } from "../../context/I18nContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading = false,
  variant = "danger",
}) {
  const { t } = useI18n();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="bg-popover border border-border max-w-sm"
        data-testid="confirm-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground text-base font-semibold font-outfit">
            {title || t("confirmDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-sm">
            {description || t("confirmDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            data-testid="confirm-dialog-cancel"
            className="bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {t("confirmDialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-dialog-confirm"
            className={`border font-medium ${
              variant === "danger"
                ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {loading ? t("confirmDialog.processing") : confirmLabel || t("confirmDialog.confirmDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
