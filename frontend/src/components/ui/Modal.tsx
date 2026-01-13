"use client";

import { Fragment, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showClose?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showClose = true,
  className,
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={cn(
              "relative w-full",
              sizeClasses[size],
              "bg-mantle-bg-card rounded-2xl border border-white/10",
              "shadow-elevation-5",
              "max-h-[90vh] overflow-hidden flex flex-col",
              className
            )}
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-start justify-between p-6 pb-0">
                <div>
                  {title && (
                    <h2 className="text-headline-md font-semibold text-mantle-text-primary">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-body-sm text-mantle-text-secondary">{description}</p>
                  )}
                </div>
                {showClose && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onClose}
                    className="-mr-2 -mt-2"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Bottom Sheet variant for mobile
interface BottomSheetProps extends Omit<ModalProps, "size"> {
  snapPoints?: number[];
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  showClose = true,
  className,
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "absolute bottom-0 left-0 right-0",
              "bg-mantle-bg-card rounded-t-3xl border-t border-white/10",
              "shadow-elevation-5",
              "max-h-[85vh] overflow-hidden flex flex-col",
              className
            )}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-mantle-text-tertiary/50" />
            </div>

            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-start justify-between px-6 pb-4">
                <div>
                  {title && (
                    <h2 className="text-headline-sm font-semibold text-mantle-text-primary">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-body-sm text-mantle-text-secondary">{description}</p>
                  )}
                </div>
                {showClose && (
                  <Button variant="ghost" size="icon-sm" onClick={onClose}>
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 pb-8 safe-area-inset">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
