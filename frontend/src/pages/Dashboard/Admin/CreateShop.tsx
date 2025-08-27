import { useState } from "react";

export default function CreatePrintStore() {
  const [showVerification, setShowVerification] = useState(false);

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 bg-gray-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img
          alt="PrintEase"
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
          className="mx-auto h-12 w-auto"
        />
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-white">
          Create your print store
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form action="#" method="POST" className="space-y-6">
          {/* Print Store Name */}
          <div>
            <label htmlFor="storeName" className="block text-sm font-medium text-gray-100">
              Print Store Name
            </label>
            <div className="mt-2">
              <input
                id="storeName"
                name="storeName"
                type="text"
                required
                className="block w-full rounded-md bg-white/5 px-3 py-2 text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-400 focus:outline-2 focus:outline-indigo-500 sm:text-sm"
                placeholder="e.g. PrintEase Express"
              />
            </div>
          </div>

          {/* TIN */}
          <div>
            <label htmlFor="tin" className="block text-sm font-medium text-gray-100">
              TIN
            </label>
            <div className="mt-2">
              <input
                id="tin"
                name="tin"
                type="text"
                required
                className="block w-full rounded-md bg-white/5 px-3 py-2 text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-400 focus:outline-2 focus:outline-indigo-500 sm:text-sm"
                placeholder="123-456-789"
              />
            </div>
          </div>

          {/* BIR Certificate Upload */}
          <div>
            <label htmlFor="birCert" className="block text-sm font-medium text-gray-100">
              Copy of your BIR Certificate of Registration Form (BIR 2303) · Business Name/Style
            </label>
            <div className="mt-2 flex justify-center rounded-md border border-dashed border-gray-500 px-6 py-10">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L24 6l18 12v18a6 6 0 01-6 6H12a6 6 0 01-6-6V18z"
                  />
                </svg>
                <div className="mt-4 flex text-sm text-gray-400">
                  <label
                    htmlFor="birCert"
                    className="relative cursor-pointer rounded-md bg-gray-800 px-3 py-2 font-semibold text-indigo-400 hover:text-indigo-300 focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                    <input id="birCert" name="birCert" type="file" className="sr-only" />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">PNG, JPG, or PDF up to 10MB</p>
              </div>
            </div>
          </div>

          {/* Mobile Number with Send Code */}
          <div>
            <label htmlFor="mobile" className="block text-sm font-medium text-gray-100">
              Active Mobile Number
            </label>
            <div className="mt-2 relative flex rounded-md shadow-sm">
              <input
                id="mobile"
                name="mobile"
                type="tel"
                required
                className="block w-full rounded-l-md bg-white/5 px-3 py-2 text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-400 focus:outline-2 focus:outline-indigo-500 sm:text-sm"
                placeholder="09XXXXXXXXX"
              />
              <button
                type="button"
                onClick={() => setShowVerification(true)}
                className="rounded-r-md bg-indigo-500 px-4 text-sm font-semibold text-white hover:bg-indigo-400 focus:outline-none"
              >
                Send Code
              </button>
            </div>
          </div>

          {/* Verification Code (shows up after Send Code) */}
          {showVerification && (
            <div>
              <label htmlFor="verification" className="block text-sm font-medium text-gray-100">
                Verification Code
              </label>
              <div className="mt-2">
                <input
                  id="verification"
                  name="verification"
                  type="text"
                  required
                  className="block w-full rounded-md bg-white/5 px-3 py-2 text-white outline outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-400 focus:outline-2 focus:outline-indigo-500 sm:text-sm"
                  placeholder="Enter 6-digit code"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus:outline-none"
            >
              Create Store
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
