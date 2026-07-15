import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useAppData } from "../hooks/useAppData";
import { KeyRound, Mail, ArrowRight, UserPlus, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign Up · Forge & Fabric" },
      { name: "description", content: "Create an account for the Forge & Fabric Tracking app." },
    ],
  }),
  component: SignupPage,
});


function SignupPage() {
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  const { customers } = useAppData();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "merchandiser" | "production" | "qc" | "customer">("customer");
  const [customerName, setCustomerName] = useState(customers[0]?.name ?? "");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  if (user) {
    navigate({ to: "/dashboard" });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const selectedCustomer = role === "customer" ? customerName : undefined;
      const { error } = await signUp(email, password, role, selectedCustomer);
      if (error) {
        setErrorMsg(error.message);
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row items-stretch justify-center industrial-grid p-4 md:p-0">
      
      {/* Side Brand panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-primary-container p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 industrial-grid"></div>
        <div className="z-10">
          <Link to="/" className="font-display-lg text-lg font-bold text-white tracking-widest uppercase hover:opacity-80 transition-opacity">
            Forge & Fabric
          </Link>
        </div>
        <div className="z-10 space-y-6">
          <h2 className="font-display-lg text-4xl text-white font-extrabold leading-tight">
            Join the Production Floor Network
          </h2>
          <p className="font-body-lg text-base text-on-primary-container leading-relaxed max-w-md">
            Create an operational profile to connect with materials receiving, cut panel tracking, and quality management lines.
          </p>
        </div>
        <div className="z-10 text-xs text-on-primary-container/55 font-mono-data">
          v1.4.0 · Made for Production Teams
        </div>
      </div>

      {/* Main signup panel */}
      <div className="flex-1 flex flex-col justify-center items-center py-12 px-6 lg:px-16 bg-white shadow-xl lg:shadow-none max-w-xl mx-auto lg:max-w-none lg:mx-0 lg:w-7/12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <Link to="/" className="lg:hidden text-xs text-secondary hover:underline mb-4 inline-block font-semibold">
              ← Back to home
            </Link>
            <h1 className="font-display-lg text-3xl font-extrabold text-primary">
              Register User Profile
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant">
              Create your account credentials and select your functional role below.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-error-container text-on-error-container p-3 rounded-lg flex items-start gap-2.5 text-sm border border-error/25">
              <AlertTriangle className="h-5 w-5 shrink-0 text-error" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@forgefabric.com"
                  className="w-full pl-9 pr-3 h-10 rounded-lg border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 h-10 rounded-lg border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1 p-3 rounded-lg border border-outline-variant bg-surface-container-low animate-fade-in">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1">
                Associate Customer Company
              </label>
              <select
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 h-10 rounded-lg border border-outline-variant bg-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                disabled={submitting}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">
                All newly registered accounts are set to a Customer role by default. Internal staff roles must be granted by an administrator.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-primary-container text-on-primary-container hover:bg-black hover:text-white h-11 rounded-lg font-headline-sm text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
              disabled={submitting}
            >
              {submitting ? "Creating Profile..." : "Create Account"}
              <UserPlus className="h-4 w-4" />
            </button>
          </form>

          <div className="text-center">
            <span className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-secondary font-semibold hover:underline">
                Sign In
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
