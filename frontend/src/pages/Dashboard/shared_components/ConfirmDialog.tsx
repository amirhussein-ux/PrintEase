import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
}) => {
  return (
    <Transition.Root show={open} as={Fragment}>
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-3xl border border-slate-600 bg-gradient-to-br from-slate-800 to-slate-900 px-8 pb-6 pt-7 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-7">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600" />
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-blue-500/10 rounded-full blur-xl" />
                <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-purple-500/10 rounded-full blur-xl" />
                
                <div className="relative">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      {/* Icon */}
                      <div className="mx-auto sm:mx-0 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-700/50 mb-4 ring-2 ring-slate-600/50">
                        <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      </div>
                      
                      <Dialog.Title as="h3" className="text-xl font-bold leading-7 text-white mb-2">
                        {title}
                      </Dialog.Title>
                      <div className="mt-3 text-sm text-slate-300 leading-6">
                        {typeof message === "string" ? <p>{message}</p> : message}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-3 sm:justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center items-center rounded-xl bg-slate-700/60 hover:bg-slate-700/80 px-5 py-3 text-sm font-semibold text-slate-200 shadow-sm ring-1 ring-slate-600/50 hover:ring-slate-500/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto w-full order-2 sm:order-1"
                      onClick={onClose}
                    >
                      {cancelText}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center items-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto w-full order-1 sm:order-2"
                      onClick={() => {
                        onConfirm();
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