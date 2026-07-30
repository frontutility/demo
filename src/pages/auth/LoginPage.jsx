import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiCheckCircle, FiKey, FiLogIn, FiMail, FiUser, FiEye, FiEyeOff } from "react-icons/fi";
import SectionCard from "../../components/common/SectionCard";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { signInWithGoogle } from "../../services/firebase";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    document.title = "ConnectNKT | Login";
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/api/auth/username-login", {
        username: username.trim(),
        password,
      });
      const payload = response.data?.data || response.data || {};
      login(payload.token, payload.user);
      navigate("/");
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    setSuccess("");
    let google;
    try {
      google = await signInWithGoogle();
      const res = await api.post("/api/auth/login", { id_token: google.idToken });
      const payload = res.data?.data || res.data || {};
      login(payload.token, payload.user);
      navigate("/");
    } catch (e) {
      if (e?.response?.status === 409 && e?.response?.data?.errors?.registration_required) {
        try { sessionStorage.setItem("firebase_id_token", google?.idToken || ""); } catch (_) {}
        navigate("/register");
      } else {
        setError(e?.response?.data?.message || e.message || "Google login failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const requestForgotOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/api/auth/forgot-password", { email: forgotEmail.trim() });
      const payload = response.data?.data || response.data || {};
      if (payload.dev_otp) {
        setForgotOtp(String(payload.dev_otp));
        setSuccess(`SMTP failed. Development OTP: ${payload.dev_otp}`);
      } else {
        setSuccess("Password reset OTP sent.");
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyForgotOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/api/auth/forgot-password/verify-otp", {
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
      });
      const payload = response.data?.data || response.data || {};
      setResetToken(payload.reset_token || "");
      setSuccess("OTP verified. Create a new password.");
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/api/auth/reset-password", {
        email: forgotEmail.trim(),
        reset_token: resetToken,
        password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess("Password reset successful. You can login now.");
      setForgotMode(false);
      setForgotOtp("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          max-width: 480px;
          margin: 0 auto;
          padding: 20px;
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .login-header {
          text-align: center;
          padding-bottom: 4px;
        }

        .login-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 6px 0;
        }

        .login-header p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .password-wrapper {
          position: relative;
          width: 100%;
        }

        .field {
          width: 100%;
          padding: 13px 16px;
          border-radius: 12px;
          border: 2px solid var(--line);
          background: var(--bg-solid);
          color: var(--text);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          height: 50px;
          transition: all 0.25s ease;
        }

        .field.password-field {
          padding-right: 48px;
        }

        .field:focus {
          border-color: var(--brand-2);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
        }

        .field:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: color 0.2s ease;
        }

        .password-toggle:hover {
          color: var(--text);
        }

        .password-toggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-message {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.08);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.12);
        }

        .status-message.success {
          background: rgba(16, 185, 129, 0.08);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.12);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: white;
          border: none;
          border-radius: 12px;
          padding: 0 28px;
          height: 52px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s ease;
        }

        .btn-google {
          background: var(--bg-solid);
          color: var(--text);
          border: 2px solid var(--line);
          border-radius: 12px;
          padding: 0 28px;
          height: 50px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s ease;
        }

        .btn-google:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: var(--brand-2);
        }

        .btn-google:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-google svg {
          width: 20px;
          height: 20px;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 14px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          opacity: 0.55;
        }

        .divider::before,
        .divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: var(--line);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(37, 99, 235, 0.28);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .text-button {
          border: 0;
          background: none;
          color: var(--brand-2);
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: none;
        }

        .text-button:hover,
        .register-link:hover {
          text-decoration: underline;
        }

        .forgot-row,
        .register-section {
          text-align: center;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .register-link {
          color: var(--brand-2);
          font-weight: 700;
          text-decoration: none;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .btn-google .spinner {
          border-color: rgba(37, 99, 235, 0.25);
          border-top-color: var(--brand-2);
        }

        @media (max-width: 480px) {
          .login-page {
            padding: 12px;
          }

          .field {
            height: 44px;
            font-size: 13px;
            border-radius: 10px;
          }

          .field.password-field {
            padding-right: 44px;
          }

          .btn-primary {
            height: 46px;
            font-size: 14px;
            border-radius: 10px;
          }

          .btn-google {
            height: 44px;
            font-size: 14px;
            border-radius: 10px;
          }

          .password-toggle {
            right: 12px;
            font-size: 18px;
          }
        }
      `}</style>

      <SectionCard>
        {!forgotMode ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-header">
              <h2>Login</h2>
              <p>Use your username and password, or continue with Google.</p>
            </div>

            {error && <div className="status-message error"><FiAlertCircle /> {error}</div>}
            {success && <div className="status-message success"><FiCheckCircle /> {success}</div>}

            <div className="form-group">
              <label><FiUser /> Username</label>
              <input
                className="field"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={loading}
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label><FiKey /> Password</label>
              <div className="password-wrapper">
                <input
                  className="field password-field"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="forgot-row">
              <button className="text-button" type="button" onClick={() => { setForgotMode(true); setError(""); setSuccess(""); }}>
                Forgot Password
              </button>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Logging in...</> : <><FiLogIn /> Login</>}
            </button>

            <div className="divider">or</div>

            <button className="btn-google" type="button" disabled={googleLoading || loading} onClick={handleGoogleLogin}>
              {googleLoading ? <><span className="spinner" /> Signing in...</> : <><FcGoogle /> Continue with Google</>}
            </button>

            <div className="register-section">
              Create an Account? <Link className="register-link" to="/register">Register Now</Link>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={resetToken ? resetPassword : forgotOtp ? verifyForgotOtp : requestForgotOtp}>
            <div className="login-header">
              <h2>Forgot Password</h2>
              <p>Verify your registered email to create a new password.</p>
            </div>

            {error && <div className="status-message error"><FiAlertCircle /> {error}</div>}
            {success && <div className="status-message success"><FiCheckCircle /> {success}</div>}

            <div className="form-group">
              <label><FiMail /> Registered Email</label>
              <input
                className="field"
                type="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                disabled={loading || Boolean(resetToken)}
                autoComplete="email"
                required
              />
            </div>

            {!resetToken && (
              <div className="form-group">
                <label><FiKey /> OTP</label>
                <input
                  className="field"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP after requesting"
                  value={forgotOtp}
                  onChange={(event) => setForgotOtp(event.target.value.replace(/\D/g, ""))}
                  disabled={loading}
                />
              </div>
            )}

            {resetToken && (
              <>
                <div className="form-group">
                  <label><FiKey /> New Password</label>
                  <div className="password-wrapper">
                    <input
                      className="field password-field"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={loading}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label><FiKey /> Confirm Password</label>
                  <div className="password-wrapper">
                    <input
                      className="field password-field"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Please wait...</> : resetToken ? "Save New Password" : forgotOtp ? "Verify OTP" : "Send OTP"}
            </button>

            <div className="register-section">
              <button className="text-button" type="button" onClick={() => { setForgotMode(false); setError(""); setSuccess(""); }}>
                Back to Login
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
