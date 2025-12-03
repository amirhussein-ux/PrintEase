import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);

      // redirect
      if (user.role === "owner" || user.role === "employee") {
        navigate("/dashboard/owner");
      } else {
        // customer route
        navigate("/customer/select-shop");
      }
    } catch (err: unknown) {
      let message = "Login failed";

      const anyErr = err as any;

      // If it's an axios error with a response, prefer server message
      if (anyErr && anyErr.response) {
        const status: number | undefined = anyErr.response.status;
        const serverMessage: string | undefined = anyErr.response.data?.message || anyErr.response.data?.error || anyErr.response.statusText;

        if (serverMessage && typeof serverMessage === "string") {
          // Map some common server messages to friendlier UI text
          const lower = serverMessage.toLowerCase();
          if (lower.includes("email and password are required") || lower.includes("required")) {
            message = "Please enter your email and password.";
          } else if (lower.includes("invalid email or password")) {
            // Backend returns a generic message for security; present a clear but safe message
            message = "Invalid email or password.";
          } else if (lower.includes("password") && (status === 401 || status === 400)) {
            message = "Incorrect password.";
          } else if (status === 404 || lower.includes("not found") || lower.includes("no account")) {
            message = "No account found with that email.";
          } else {
            message = serverMessage;
          }
        } else if (status === 401) {
          message = "Incorrect credentials.";
        } else if (status === 404) {
          message = "No account found with that email.";
        } else {
          message = `Request failed with status code ${status}`;
        }
      } else {
        // Fallback to generic JS error message if present
        if (err && typeof err === "object" && "message" in err) {
          const maybeMessage = (err as { message?: unknown }).message;
          if (typeof maybeMessage === "string") {
            message = maybeMessage;
          }
        }
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 bg-white p-8 rounded-xl w-full max-w-md mx-auto mt-20 "
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Login to your account</h1>
        <p className="text-gray-500 text-sm">Enter your email below to login</p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-3">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
          />
        </div>

        <div className="grid gap-3">
          <div className="flex items-center">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/forgot-password");
              }}
              className="ml-auto text-sm underline-offset-4 hover:underline text-blue-900 hover:text-blue-700 transition-colors duration-200"
            >
              Forgot your password?
            </a>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-3 py-3 pr-10 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-md hover:bg-gray-100"
            >
              {showPassword ? (
                <FiEyeOff className="w-5 h-5" />
              ) : (
                <FiEye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 transition-all duration-200">
            <p className="text-red-600 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              {error}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Logging in...
            </div>
          ) : (
            "Login"
          )}
        </button>

        <div className="relative text-center text-sm flex items-center">
          <span className="flex-1 border-t border-gray-300"></span>
          <span className="px-2 text-gray-500">Or continue with</span>
          <span className="flex-1 border-t border-gray-300"></span>
        </div>

        <button
          type="button"
          className="w-full border border-gray-300 rounded-lg py-3 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-medium"
        >
          <FcGoogle className="w-5 h-5" />
          Login with Google
        </button>
      </div>

      <div className="text-center text-sm">
        Don't have an account?{" "}
        <a
          href="#"
          className="underline underline-offset-4 text-blue-900 hover:text-blue-700 transition-colors duration-200 font-medium"
          onClick={(e) => {
            e.preventDefault();
            navigate("/signup");
          }}
        >
          Sign up
        </a>
      </div>
    </form>
  );
};

export default LoginForm;