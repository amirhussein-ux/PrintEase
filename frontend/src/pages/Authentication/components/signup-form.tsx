import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";



export function SignupForm({ className, ...props }: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [role, setRole] = useState<"owner" | "customer">("owner");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
  // Use auth context signup so user state and token are set consistently
  const created = await signup({
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        role,
      });

      // Navigate based on the actual role returned from backend
      if (created.role === "owner") {
        navigate("/owner/create-shop");
      } else if (created.role === "customer") {
        navigate("/customer/select-shop");
      } else {
        navigate("/");
      }
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response === "object"
      ) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        setError(response?.data?.message || "Signup failed");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Signup failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className={`flex flex-col gap-6 w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 ${className || ""}`}
      onSubmit={handleSubmit}
      {...props}
    >

      {/* Title */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl sm:text-2xl font-bold">Create your account</h1>
        <p className="text-gray-500 text-sm sm:text-base">
          Enter your details below to sign up
        </p>
      </div>

      {/* Role Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-3xl bg-blue-900 p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setRole("owner")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-s-3xl transition-colors ${
              role === "owner"
                ? "bg-white text-gray-900 shadow"
                : "text-white hover:text-white"
            }`}
          >
            As an Owner
          </button>

          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-e-3xl transition-colors ${
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
        {/* First & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
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
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>

          <div className="grid gap-2">
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
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
        </div>

        {/* Email */}
        <div className="grid gap-2">
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
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>


        {/* Password */}
        <div className="grid gap-2">
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
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>



        {/* Confirm Password */}
        <div className="grid gap-2">
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
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>


        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-900 text-white py-2 rounded-md font-semibold hover:bg-blue-800 transition-colors text-sm sm:text-base"
          disabled={loading}
        >
          {loading ? "Signing Up..." : "Sign Up"}
        </button>
        {error && (
          <div className="text-red-600 text-center text-sm">{error}</div>
        )}


        {/* Divider */}
        <div className="relative text-center text-sm flex items-center">
          <span className="flex-1 border-t border-gray-300"></span>
          <span className="px-2 text-gray-500">Or continue with</span>
          <span className="flex-1 border-t border-gray-300"></span>
        </div>


        {/* Google Button */}
        <button
          type="button"
          className="w-full border border-gray-300 rounded-md py-2 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors text-sm sm:text-base"
        >
          <FcGoogle />
          Sign up with Google
        </button>
      </div>


      {/* Login Link */}
      <div className="text-center text-sm sm:text-base">
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
