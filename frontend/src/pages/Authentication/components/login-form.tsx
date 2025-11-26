import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 bg-white p-8 rounded-xl w-full max-w-md mx-auto mt-20"
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
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="ml-auto text-sm underline-offset-4 hover:underline text-blue-900"
            >
              Forgot your password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-900 text-white py-2 rounded-md font-semibold hover:bg-blue-800 transition-colors"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="relative text-center text-sm flex items-center">
          <span className="flex-1 border-t border-gray-300"></span>
          <span className="px-2 text-gray-500">Or continue with</span>
          <span className="flex-1 border-t border-gray-300"></span>
        </div>

        <button
          type="button"
          className="w-full border border-gray-300 rounded-md py-2 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
        >
          <FcGoogle />
          Login with Google
        </button>
      </div>

      <div className="text-center text-sm">
        Don't have an account?{" "}
        <a
          href="#"
          className="underline underline-offset-4 text-blue-900"
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
