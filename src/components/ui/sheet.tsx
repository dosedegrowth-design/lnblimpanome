"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: "right" | "left";
  className?: string;
}

export function Sheet({ open, onOpenChange, children, side = "right", className = "" }: SheetProps) {
  // ESC pra fechar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  const x = side === "right" ? "100%" : "-100%";
  const sideClass = side === "right" ? "right-0" : "left-0";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x }}
            animate={{ x: 0 }}
            exit={{ x }}
            transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className={`fixed top-0 ${sideClass} h-full w-full sm:w-[480px] md:w-[520px] bg-white shadow-2xl z-50 flex flex-col ${className}`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function SheetHeader({ children, onClose, actions }: { children: React.ReactNode; onClose: () => void; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100">
      <div className="flex-1 min-w-0">{children}</div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <button
          onClick={onClose}
          className="size-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          aria-label="Fechar"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function SheetBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex-1 overflow-y-auto px-6 py-5 ${className}`}>{children}</div>;
}

export function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-end gap-2">
      {children}
    </div>
  );
}
