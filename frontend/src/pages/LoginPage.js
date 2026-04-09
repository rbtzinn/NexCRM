import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Zap, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const BG_URL =
  "https://images.unsplash.com/photo-1640346876473-f76a73c71539?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjBnZW9tZXRyaWMlMjBtaW5pbWFsJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3NzU1MDI4MDN8MA&ixlib=rb-4.1.0&q=85";

const publicDemoMode = process.env.REACT_APP_PUBLIC_DEMO_MODE !== "false";

const demoAccounts = [
  { role: "Manager", email: "sarah.chen@nexcrm.io", password: "Manager@123!" },
  { role: "Analyst", email: "marcus.johnson@nexcrm.io", password: "Analyst@123!" },
];

if (!publicDemoMode) {
  demoAccounts.unshift({ role: "Admin", email: "admin@nexcrm.io", password: "Admin@123!" });
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setValue("email", account.email);
    setValue("password", account.password);
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left — Background */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden"
        style={{
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-[7px] flex items-center justify-center">
              <Zap className="w-4 h-4 text-black" fill="black" strokeWidth={0} />
            </div>
            <span className="font-outfit font-semibold text-lg text-white tracking-tight">NexCRM</span>
          </div>
          <div>
            <blockquote className="text-zinc-300 text-lg font-light leading-relaxed max-w-sm">
              "The platform that turned our scattered pipeline into a revenue machine."
            </blockquote>
            <p className="text-zinc-500 text-sm mt-4">— Sarah Chen, Sales Manager at NexCRM</p>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 lg:max-w-[480px] flex flex-col justify-center px-8 sm:px-12 lg:px-16">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-7 h-7 bg-white rounded-[6px] flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-black" fill="black" strokeWidth={0} />
          </div>
          <span className="font-outfit font-semibold text-[15px] text-white tracking-tight">NexCRM</span>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <div className="mb-8">
            <h1 className="font-outfit text-3xl font-semibold text-white tracking-tight">Sign in</h1>
            <p className="text-zinc-500 text-sm mt-2">Enter your credentials to access your workspace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="login-form">
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5" htmlFor="email">
                Email address
              </label>
              <input
                {...register("email")}
                id="email"
                type="email"
                placeholder="you@company.com"
                data-testid="login-email"
                className="w-full bg-[#0A0A0A] border border-white/[0.08] rounded-lg text-white text-sm placeholder-zinc-600 px-3.5 py-2.5 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1.5" data-testid="login-email-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  data-testid="login-password"
                  className="w-full bg-[#0A0A0A] border border-white/[0.08] rounded-lg text-white text-sm placeholder-zinc-600 px-3.5 py-2.5 pr-10 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5" data-testid="login-password-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full bg-white text-black text-sm font-semibold rounded-lg py-2.5 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">
              Demo accounts
            </p>
            {publicDemoMode && (
              <div className="mb-3 rounded-lg border border-white/[0.08] bg-[#0A0A0A] px-3.5 py-3">
                <p className="text-xs font-medium text-zinc-300">Public portfolio demo</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                  Login attempts are rate-limited and public write actions may be restricted to keep the demo stable.
                </p>
              </div>
            )}
            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  onClick={() => fillDemo(acc)}
                  data-testid={`demo-account-${acc.role.toLowerCase()}`}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0A0A0A] border border-white/[0.06] rounded-lg hover:border-white/[0.12] hover:bg-[#111111] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-zinc-300">{acc.role}</span>
                    <span className="text-xs text-zinc-600">{acc.email}</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
