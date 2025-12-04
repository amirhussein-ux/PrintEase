import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

// Theme Variables for consistent dark/light mode
const PANEL_SURFACE = "rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const MODAL_OVERLAY = "bg-black/50 dark:bg-black/70";
const BUTTON_PRIMARY = "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700";
const BUTTON_SECONDARY = "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500";
const BUTTON_RED = "bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700";
const BUTTON_GREEN = "bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700";
const MUTED_TEXT = "text-gray-600 dark:text-gray-300";
const MUTED_TEXT_LIGHT = "text-gray-500 dark:text-gray-400";

interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean; // backwards compatibility
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmColor?: "blue" | "red" | "green";
  isDarkMode?: boolean; // Add this prop
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  isOpen = false,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
  confirmColor = "blue",
  isDarkMode = false,
}) => {
  const showDialog = typeof open === "boolean" ? open : Boolean(isOpen);

  const colorClasses = {
    blue: `${BUTTON_PRIMARY} shadow-lg shadow-blue-500/25 dark:shadow-blue-500/25 hover:shadow-blue-500/35`,
    red: `${BUTTON_RED} shadow-lg shadow-red-500/25 dark:shadow-red-500/25 hover:shadow-red-500/35`,
    green: `${BUTTON_GREEN} shadow-lg shadow-green-500/25 dark:shadow-green-500/25 hover:shadow-green-500/35`,
  };

  const iconColors = {
    blue: "text-blue-500 dark:text-blue-400",
    red: "text-red-500 dark:text-red-400",
    green: "text-green-500 dark:text-green-400",
  };

  const iconBgColors = {
    blue: "bg-blue-100 dark:bg-blue-500/20",
    red: "bg-red-100 dark:bg-red-500/20",
    green: "bg-green-100 dark:bg-green-500/20",
  };

  const ringColors = {
    blue: "ring-blue-200 dark:ring-blue-500/30",
    red: "ring-red-200 dark:ring-red-500/30",
    green: "ring-green-200 dark:ring-green-500/30",
  };

  const gradientColors = {
    blue: "from-blue-500 to-blue-600 dark:from-blue-500 dark:to-blue-600",
    red: "from-red-500 to-red-600 dark:from-red-500 dark:to-red-600",
    green: "from-green-500 to-green-600 dark:from-green-500 dark:to-green-600",
  };

  const blurColors = {
    blue: "bg-blue-500/10 dark:bg-blue-500/10",
    green: "bg-green-500/10 dark:bg-green-500/10",
    red: "bg-red-500/10 dark:bg-red-500/10",
  };

  return (
    <Transition.Root show={showDialog} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className={`fixed inset-0 ${MODAL_OVERLAY} backdrop-blur-sm`} />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className={`relative transform overflow-hidden ${PANEL_SURFACE} px-8 pb-6 pt-7 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-7`}>
                {/* Decorative elements - theme aware */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradientColors[confirmColor]}`} />
                <div className={`absolute -top-10 -right-10 w-20 h-20 ${blurColors[confirmColor]} rounded-full blur-xl`} />
                <div className={`absolute -bottom-8 -left-8 w-16 h-16 ${blurColors[confirmColor]} rounded-full blur-xl`} />
                
                <div className="relative">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      {/* Icon */}
                      <div className={`mx-auto sm:mx-0 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${iconBgColors[confirmColor]} mb-4 ring-2 ${ringColors[confirmColor]}`}>
                        <svg className={`h-6 w-6 ${iconColors[confirmColor]}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      </div>
                      
                      <Dialog.Title as="h3" className="text-xl font-bold leading-7 text-gray-900 dark:text-white mb-2">
                        {title}
                      </Dialog.Title>
                      <div className={`mt-3 text-sm ${MUTED_TEXT} leading-6`}>
                        {typeof message === "string" ? <p>{message}</p> : message}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-3 sm:justify-end">
                    <button
                      type="button"
                      className={`inline-flex justify-center items-center rounded-xl ${BUTTON_SECONDARY} px-5 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto w-full order-2 sm:order-1`}
                      onClick={onClose}
                    >
                      {cancelText}
                    </button>
                    <button
                      type="button"
                      className={`inline-flex justify-center items-center rounded-xl ${colorClasses[confirmColor]} px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto w-full order-1 sm:order-2`}
                      onClick={() => {
                        onConfirm();
                        onClose();
                      }}
                    >
                      {confirmText}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ConfirmDialog;