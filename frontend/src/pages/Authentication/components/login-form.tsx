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

      // Redirect based on role
      if (user.role === "admin") {
        navigate("/dashboard/admin");
      } else {
        navigate("/dashboard/customer");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 bg-gray-50 p-8 rounded-xl shadow-lg w-full max-w-md mx-auto mt-20"
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
