import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Phone,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { loginApi } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — CoalGuard Mine Intelligence Platform" },
      {
        name: "description",
        content: "Secure login to CoalGuard AI-powered mine safety and compliance command center.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { loginUser, isAuthenticated } = useAppStore();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (hydrated && isAuthenticated) {
      void navigate({ to: "/dashboard" });
    }
  }, [hydrated, isAuthenticated, navigate]);

  if (!hydrated || isAuthenticated) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi(phone.trim(), password);
      loginUser(res.access_token, res.user);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-amber-50/20 px-4 py-8">
      {/* Decorative Background Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-50/30 blur-3xl" />
      </div>

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/25 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Coal<span className="text-emerald-600">Guard</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">AI-Powered Mine Intelligence Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
            <p className="mt-1 text-sm text-slate-500">Enter your registered phone number and password</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-sm text-rose-700 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Phone Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="phone">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9000000001"
                  className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all"
                  autoComplete="tel"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 pl-11 pr-11 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-slate-400">
          SIH 2026 · AI-Powered Smart Governance, Safety & Compliance System
        </p>
      </div>
    </main>
  );
}
