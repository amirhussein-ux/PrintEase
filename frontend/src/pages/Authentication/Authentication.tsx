import { useLocation } from "react-router-dom";
import { LoginForm } from "./components/login-form";
import { SignupForm } from "./components/signup-form";
import { ForgotPasswordForm } from "./components/forgot-password-form";
import PrintEaseLogo from "../../assets/PrintEase-Logo.png";

export default function AuthenticationPage() {
  const location = useLocation();
  const isSignup = location.pathname === "/signup";
  const isForgotPassword = location.pathname === "/forgot-password";

  return (
    <div
      className="relative grid min-h-svh lg:grid-cols-2 auth-bg"
    >
      {/* Left content */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center lg:justify-start items-center gap-2">
          <a href="/">
            <img
              src={PrintEaseLogo}
              alt="PrintEase Logo"
              className="h-12 w-auto cursor-pointer"
            />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs sm:max-w-md lg:max-w-lg bg-white rounded-xl shadow-lg p-6">
            {isForgotPassword ? <ForgotPasswordForm /> : isSignup ? <SignupForm /> : <LoginForm />}
          </div>
        </div>
      </div>

      {/* Right spacer for layout */}
      <div className="hidden lg:block" />
      <style>{`
        .auth-bg {
          background-color: #1e3a8a;
          background-image: none;
        }
        @media (min-width: 1024px) {
          .auth-bg {
            background-image:
              linear-gradient(
                to right,
                #1e3a8a 0%,
                #1e3a8a 50%,
                rgba(30, 58, 138, 0.8) 65%,
                rgba(30, 58, 138, 0) 100%
              ),
              url("https://www.cmyk.ph/wp-content/uploads/2020/02/digi-vs-offset-post-img.jpg");
            background-size: cover;
            background-position: center;
          }
        }
      `}</style>
    </div>
  );
}
