import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { FiX } from "react-icons/fi";

export function SignupForm({ className, ...props }: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [role, setRole] = useState<"owner" | "customer">("owner");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError("You must accept the Terms & Conditions to sign up");
      return;
    }
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

    // ADD THIS MODAL COMPONENT BEFORE THE RETURN STATEMENT
  const TermsModal = () => {
    if (!showTermsModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl max-h-[80vh] w-full overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Terms & Conditions</h2>
            <button
              onClick={() => setShowTermsModal(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold mb-4">PrintEase Terms of Service</h3>
              <p className="mb-4">
                Please read these Terms and Conditions carefully before using the PrintEase platform.
              </p>
              
              <h4 className="font-medium mt-6 mb-2">1. Nature of the Platform</h4>
              <p className="mb-3">
                PrintEase is an online platform that allows independent Print Shops ("Merchants") to create online storefronts and allows Customers ("Users") to upload files and purchase printing services.
              </p>
              
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400 mb-4">
                <h5 className="font-semibold text-gray-800 mb-2">Important Disclaimer:</h5>
                <ul className="list-disc pl-5 space-y-1">
                  <li className="text-sm">
                    <span className="font-medium">We are a Venue:</span> PrintEase provides the technical infrastructure (SaaS). We are not a print shop, we do not print materials, and we do not fulfill orders.
                  </li>
                  <li className="text-sm">
                    <span className="font-medium">Contracts are between User and Merchant:</span> Any contract for sale, printing, or service is strictly between the Customer and the specific Print Shop.
                  </li>
                  <li className="text-sm">
                    <span className="font-medium">No Control:</span> We do not have control over, and do not guarantee the quality, safety, or legality of items advertised.
                  </li>
                </ul>
              </div>

              <p className="text-sm text-gray-600 mt-6">
                By accepting these terms, you agree to be bound by the full Terms & Conditions available at our website.
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t p-4">
            <button
              onClick={() => {
                setShowTermsModal(false);
                setAcceptTerms(true);
              }}
              className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
            >
              I Accept Terms & Conditions
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <form
      className={`flex flex-col gap-6 bg-white p-8 rounded-xl w-full max-w-md mx-auto mt-8 ${className || ""}`}
      onSubmit={handleSubmit}
      {...props}
    >

      {/* Title */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-gray-500 text-sm">
          Enter your details below to sign up
        </p>
      </div>

      {/* Role Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-3xl bg-blue-900 p-1 w-full max-w-xs">
          <button
            type="button"
            onClick={() => setRole("owner")}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-s-3xl transition-all duration-200 ${
              role === "owner"
                ? "bg-white text-gray-900"
                : "text-white hover:text-white hover:bg-blue-800"
            }`}
          >
            As an Owner
          </button>

          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-e-3xl transition-all duration-200 ${
              role === "customer"
                ? "bg-white text-gray-900"
                : "text-white hover:text-white hover:bg-blue-800"
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
              className="border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 w-full"
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
              className="border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 w-full"
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
            placeholder="you@example.com"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 w-full"
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

          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a password"
              className="border border-gray-300 rounded-lg px-3 py-3 pr-10 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
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

        {/* Confirm Password */}
        <div className="grid gap-2">
          <label
            htmlFor="confirm-password"
            className="text-sm font-medium text-gray-700"
          >
            Confirm Password
          </label>

          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="border border-gray-300 rounded-lg px-3 py-3 pr-10 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-md hover:bg-gray-100"
            >
              {showConfirmPassword ? (
                <FiEyeOff className="w-5 h-5" />
              ) : (
                <FiEye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* TERMS & CONDITIONS*/}
        <div className="grid gap-2">
          <div className="flex items-start gap-3">
            <input
              id="terms"
              type="checkbox"
              required
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="terms" className="text-sm text-gray-700">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  Terms & Conditions
                </button>
                {" "}and{" "}
                <button
                  type="button"
                  onClick={() => window.open('/privacy', '_blank')}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  Privacy Policy
                </button>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                You must read and accept our terms to create an account.
              </p>
            </div>
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

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={loading || !acceptTerms} // ADD "|| !acceptTerms" HERE
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating account...
            </div>
          ) : (
            "Sign Up"
          )}
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
          className="w-full border border-gray-300 rounded-lg py-3 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-medium"
        >
          <FcGoogle className="w-5 h-5" />
          Sign up with Google
        </button>
      </div>

      {/* Login Link */}
      <div className="text-center text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            navigate("/login");
          }}
          className="underline underline-offset-4 text-blue-900 hover:text-blue-700 transition-colors duration-200 font-medium"
        >
          Login
        </button>
      </div>
    </form>
    <TermsModal />
    </>
  );
}