import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";

export function SignupForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"admin" | "customer">("customer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`,
          email,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Signup failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));

      navigate(
        data.role === "admin" ? "/dashboard/admin" : "/dashboard/customer"
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center pt-12">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-[280px]"
      >
        <h2 className="text-2xl font-bold text-center">Create your account</h2>
        <p className="text-center text-gray-600 text-sm">
          Enter your details below to signup
        </p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded">
            {error}
          </div>
        )}

        {/* Role Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-3xl overflow-hidden border border-blue-900">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                role === "admin"
                  ? "bg-blue-900 text-white"
                  : "bg-white text-blue-900"
              }`}
            >
              As an Admin
            </button>
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                role === "customer"
                  ? "bg-blue-900 text-white"
                  : "bg-white text-blue-900"
              }`}
            >
              As a Customer
            </button>
          </div>
        </div>

        {/* First + Last Name */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="First Name"
            className="border rounded p-2 w-1/2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            className="border rounded p-2 w-1/2"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <input
          type="email"
          placeholder="Email"
          className="border rounded p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="border rounded p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="border rounded p-2"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-2 my-2">
          <hr className="flex-1 border-gray-300" />
          <span className="text-gray-500 text-sm">Or continue with</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        <button
          type="button"
          className="flex items-center justify-center gap-2 border py-2 rounded hover:bg-gray-100"
        >
          <FcGoogle className="w-5 h-5" />
          Sign up with Google
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
