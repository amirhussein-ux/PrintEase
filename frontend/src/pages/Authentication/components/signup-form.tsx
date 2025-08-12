import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function SignupForm({ className, ...props }: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const [role, setRole] = useState<"admin" | "customer">("admin");

  return (
    <form className={`flex flex-col gap-6 ${className || ""}`} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-gray-500 text-sm">
          Enter your details below to sign up
        </p>
      </div>

      {/* Role Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-md bg-blue-900 p-1">
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              role === "admin"
                ? "bg-white text-gray-900 shadow"
                : "text-white hover:text-white"
            }`}
          >
            As an Admin
          </button>
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              role === "customer"
                ? "bg-white text-gray-900 shadow"
                : "text-white hover:text-white"
            }`}
          >
            As a Customer
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-3">
            <label
              htmlFor="first-name"
              className="text-sm font-medium text-gray-700"
            >
              First Name
            </label>
            <input
              id="first-name"
              type="text"
              placeholder="First Name"
              required
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid gap-3">
            <label
              htmlFor="last-name"
              className="text-sm font-medium text-gray-700"
            >
              Last Name
            </label>
            <input
              id="last-name"
              type="text"
              placeholder="Last Name"
              required
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Email */}
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

        {/* Password */}
        <div className="grid gap-3">
          <label
            htmlFor="password"
            className="text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Confirm Password */}
        <div className="grid gap-3">
          <label
            htmlFor="confirm-password"
            className="text-sm font-medium text-gray-700"
          >
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-900 text-white py-2 rounded-md font-semibold hover:bg-blue-800 transition-colors"
        >
          Sign Up
        </button>

        {/* Divider */}
        <div className="relative text-center text-sm flex items-center">
          <span className="flex-1 border-t border-gray-300"></span>
          <span className="px-2 text-gray-500">Or continue with</span>
          <span className="flex-1 border-t border-gray-300"></span>
        </div>

        {/* Google Button */}
        <button
          type="button"
          className="w-full border border-gray-300 rounded-md py-2 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
        >
          <FcGoogle />
          Sign up with Google
        </button>
      </div>

      {/* Login Link */}
      <div className="text-center text-sm">
        Already have an account?{" "}
        <a
          href="#"
          className="underline underline-offset-4 text-blue-900"
          onClick={(e) => {
            e.preventDefault();
            navigate("/login");
          }}
        >
          Login
        </a>
      </div>
    </form>
  );
}
