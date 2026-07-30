import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SectionCard from "../../components/common/SectionCard";
import api from "../../services/api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "ConnectNKT Admin | Login";
    if (localStorage.getItem("adminUser") || sessionStorage.getItem("adminUser")) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/admin/auth/login", {
        email,
        password,
      });
      const payload = res.data ?? {};
      const admin = payload.admin ?? payload.data?.admin ?? {};
      const token = payload.token ?? payload.data?.token ?? "";
      const storage = rememberMe ? localStorage : sessionStorage;
      localStorage.removeItem("adminUser");
      sessionStorage.removeItem("adminUser");
      localStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminToken");
      storage.setItem("adminUser", JSON.stringify(admin));
      if (token) storage.setItem("adminToken", token);
      navigate("/admin", { replace: true });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  }

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "20px",
      position: "relative",
    },
    containerBefore: {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      pointerEvents: "none",
    },
    loginBox: {
      background: "white",
      borderRadius: "24px",
      padding: "48px 40px",
      width: "100%",
      maxWidth: "440px",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
      position: "relative",
      animation: "slideUp 0.5s ease-out",
    },
    brandHeader: {
      textAlign: "center",
      marginBottom: "36px",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      marginBottom: "16px",
    },
    logoIcon: {
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      width: "56px",
      height: "56px",
      borderRadius: "14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "28px",
      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
    },
    logoText: {
      fontSize: "24px",
      fontWeight: 700,
      color: "#1a1a2e",
      letterSpacing: "-0.5px",
    },
    title: {
      fontSize: "28px",
      fontWeight: 700,
      color: "#1a1a2e",
      margin: "0 0 8px 0",
      letterSpacing: "-0.5px",
    },
    subtitle: {
      color: "#6b7280",
      fontSize: "15px",
      margin: 0,
      lineHeight: 1.5,
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "14px",
      fontWeight: 600,
      color: "#374151",
      letterSpacing: "0.3px",
    },
    inputWrapper: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    inputIcon: {
      position: "absolute",
      left: "14px",
      fontSize: "18px",
      opacity: 0.6,
      pointerEvents: "none",
    },
    input: {
      width: "100%",
      padding: "14px 14px 14px 44px",
      border: "2px solid #e5e7eb",
      borderRadius: "12px",
      fontSize: "15px",
      transition: "all 0.3s ease",
      background: "#f9fafb",
      color: "#1a1a2e",
      outline: "none",
    },
    inputFocus: {
      borderColor: "#667eea",
      background: "white",
      boxShadow: "0 0 0 4px rgba(102, 126, 234, 0.1)",
    },
    togglePassword: {
      position: "absolute",
      right: "14px",
      background: "none",
      border: "none",
      fontSize: "18px",
      cursor: "pointer",
      padding: "4px",
      opacity: 0.6,
      transition: "opacity 0.2s",
    },
    optionsRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "4px 0",
    },
    checkboxLabel: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "14px",
      color: "#4b5563",
      cursor: "pointer",
    },
    checkbox: {
      width: "18px",
      height: "18px",
      cursor: "pointer",
      accentColor: "#667eea",
    },
    forgotLink: {
      fontSize: "14px",
      color: "#667eea",
      textDecoration: "none",
      fontWeight: 500,
      transition: "color 0.2s",
    },
    errorMessage: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: "10px",
      padding: "12px 16px",
      color: "#dc2626",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      animation: "shake 0.4s ease-out",
    },
    errorIcon: {
      fontSize: "18px",
    },
    submitButton: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      border: "none",
      padding: "16px",
      borderRadius: "12px",
      fontSize: "16px",
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.3s ease",
      marginTop: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
    },
    submitButtonHover: {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)",
    },
    submitButtonDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
      transform: "none",
    },
    spinner: {
      width: "20px",
      height: "20px",
      border: "3px solid rgba(255, 255, 255, 0.3)",
      borderTopColor: "white",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    },
    divider: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      color: "#9ca3af",
      fontSize: "13px",
      margin: "4px 0",
    },
    dividerLine: {
      flex: 1,
      height: "1px",
      background: "#e5e7eb",
    },
    footer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      color: "#9ca3af",
      fontSize: "13px",
      paddingTop: "4px",
    },
    footerIcon: {
      fontSize: "16px",
    },
  };

  return (
    <>
      <style>
        {`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .login-input:focus {
            border-color: #667eea !important;
            background: white !important;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1) !important;
          }
          .submit-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }
          .forgot-link:hover {
            color: #764ba2;
            text-decoration: underline;
          }
          .toggle-pass:hover {
            opacity: 1;
          }
        `}
      </style>

      <div style={styles.container}>
        <div style={styles.containerBefore}></div>
        
        <div style={styles.loginBox}>
          <div style={styles.brandHeader}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>🔐</div>
              <span style={styles.logoText}>ConnectNKT</span>
            </div>
            <h1 style={styles.title}>Admin Access</h1>
            <p style={styles.subtitle}>Sign in to manage your dashboard and tools</p>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label} htmlFor="email">
                Email Address
              </label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>📧</span>
                <input
                  id="email"
                  className="login-input"
                  style={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@connectnkt.com"
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                  onFocus={(e) => {
                    e.target.style.borderColor = "#667eea";
                    e.target.style.background = "white";
                    e.target.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1)";
                  }}
                  onBlur={(e) => {
                    if (!e.target.value) {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.background = "#f9fafb";
                      e.target.style.boxShadow = "none";
                    }
                  }}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label} htmlFor="password">
                Password
              </label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>🔑</span>
                <input
                  id="password"
                  className="login-input"
                  style={styles.input}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                  onFocus={(e) => {
                    e.target.style.borderColor = "#667eea";
                    e.target.style.background = "white";
                    e.target.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1)";
                  }}
                  onBlur={(e) => {
                    if (!e.target.value) {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.background = "#f9fafb";
                      e.target.style.boxShadow = "none";
                    }
                  }}
                />
                <button
                  type="button"
                  className="toggle-pass"
                  style={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div style={styles.errorMessage}>
                <span style={styles.errorIcon}>⚠️</span>
                {error}
              </div>
            )}

            <button
              className="submit-btn"
              style={{
                ...styles.submitButton,
                ...(loading || !email || !password ? styles.submitButtonDisabled : {}),
              }}
              type="submit"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <span style={styles.spinner}></span>
                  Signing in...
                </>
              ) : (
                "Open Admin Panel"
              )}
            </button>

            <div style={styles.divider}>
              <span style={styles.dividerLine}></span>
              <span>Secure access only</span>
              <span style={styles.dividerLine}></span>
            </div>

            <div style={styles.footer}>
              <span style={styles.footerIcon}>🛡️</span>
              <span>Protected with enterprise-grade security</span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
