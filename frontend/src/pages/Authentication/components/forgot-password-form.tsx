import { useState } from "react";

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<"form">) {
  const [step, setStep] = useState<1 | 2>(1);

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      // Here you would trigger sending the reset code via API
      setStep(2);
    } else {
      // Handle password change logic here
      console.log("Change password submitted");
    }
  };

  return (
    <form
      className={`flex flex-col gap-6 ${className || ""}`}
      onSubmit={handleSendCode}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-gray-500 text-sm">
          {step === 1
            ? "Enter your email to receive a verification code"
            : "Enter the verification code and your new password"}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Email field */}
        <div className="grid gap-3">
          <label
            htmlFor="email"
            className="text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Step 2 fields */}
        {step === 2 && (
          <>
            <div className="grid gap-3">
              <label
                htmlFor="code"
                className="text-sm font-medium text-gray-700"
              >
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                placeholder="Enter the code sent to your email"
                required
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid gap-3">
              <label
                htmlFor="new-password"
                className="text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                required
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid gap-3">
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-gray-700"
              >
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Re-enter new password"
                required
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {/* Button */}
        <button
          type="submit"
          className="w-full bg-blue-900 text-white py-2 rounded-md font-semibold hover:bg-blue-800 transition-colors"
        >
          {step === 1 ? "Send Code" : "Change Password"}
        </button>
      </div>
    </form>
  );
}
