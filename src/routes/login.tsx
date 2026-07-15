import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { KeyRound, Mail, ArrowRight, UserCheck, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In · Forge & Fabric" },
      { name: "description", content: "Sign in to the Forge & Fabric Industrial Garment Tracking app." },
    ],
  }),
  component: LoginPage,
});

const DEMO_USERS = [
  { label: "Admin", email: "admin@forgefabric.com", role: "admin", desc: "Full access & User settings" },
  { label: "Merchandiser", email: "merch@forgefabric.com", role: "merchandiser", desc: "Orders & Intake data" },
  { label: "Production", email: "prod@forgefabric.com", role: "production", desc: "Internal floor stages" },
  { label: "QC Inspector", email: "qc@forgefabric.com", role: "qc", desc: "Audits & read floor views" },
  { label: "Customer", email: "customer@forgefabric.com", role: "customer", desc: "Scoped order view" },
];

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    setSubmitting(true);
    setErrorMsg("");
    
    try {
      const { error } = await signIn(email, password);
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

  const handleQuickLogin = async (demoEmail: string) => {
    setSubmitting(true);
    setErrorMsg("");
    setEmail(demoEmail);
    setPassword("password123");

    const demoUser = DEMO_USERS.find((u) => u.email === demoEmail);
    const role = demoUser ? (demoUser.role as any) : "customer";
    const customerName = role === "customer" ? "Levi Strauss & Co." : undefined;

    try {
      let { error } = await signIn(demoEmail, "password123");
      
      // If user does not exist on Supabase Auth, automatically register them!
      if (error && (
        error.message.toLowerCase().includes("invalid login credentials") || 
        error.message.toLowerCase().includes("does not exist") || 
        error.message.toLowerCase().includes("email not confirmed")
      )) {
        const { error: signUpError } = await signUp(demoEmail, "password123", role, customerName);
        
        if (signUpError) {
          if (signUpError.message.includes("Email confirmation")) {
            setErrorMsg("Email confirmation is enabled. Please disable 'Confirm email' in your Supabase Auth provider settings to use quick login.");
          } else {
            setErrorMsg(signUpError.message);
          }
          setSubmitting(false);
          return;
        }
        
        // Retry logging in now that user is registered
        const retry = await signIn(demoEmail, "password123");
        error = retry.error;
      }

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setErrorMsg("Please disable 'Confirm email' in your Supabase Auth provider settings to enable quick login.");
        } else {
          setErrorMsg(error.message);
        }
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
            Industrial Garment Tracking &amp; Conversion Flow
          </h2>
          <p className="font-body-lg text-base text-on-primary-container leading-relaxed max-w-md">
            Full WIP operations control, material ledger reconciliation, and multi-checkpoint quality assurance in one integrated platform.
          </p>
        </div>
        <div className="z-10 text-xs text-on-primary-container/55 font-mono-data">
          v1.4.0 · Made for Production Teams
        </div>
      </div>

      {/* Main login panel */}
      <div className="flex-1 flex flex-col justify-center items-center py-12 px-6 lg:px-16 bg-white shadow-xl lg:shadow-none max-w-xl mx-auto lg:max-w-none lg:mx-0 lg:w-7/12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <Link to="/" className="lg:hidden text-xs text-secondary hover:underline mb-4 inline-block font-semibold">
              ← Back to home
            </Link>
            <h1 className="font-display-lg text-3xl font-extrabold text-primary">
              Access Operations
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant">
              Enter your credentials or select a demo role profile below.
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
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 h-10 rounded-lg border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                  disabled={submitting}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary-container text-on-primary-container hover:bg-black hover:text-white h-11 rounded-lg font-headline-sm text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
              disabled={submitting}
            >
              {submitting ? "Signing In..." : "Sign In"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="text-center">
            <span className="text-xs text-muted-foreground">
              New team member?{" "}
              <Link to="/signup" className="text-secondary font-semibold hover:underline">
                Create Account
              </Link>
            </span>
          </div>

          <div className="border-t border-outline-variant/60 pt-6 space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-secondary" />
              Demo Roles Quick-Access
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => handleQuickLogin(demo.email)}
                  className="flex items-center justify-between text-left p-3 rounded-lg border border-outline-variant bg-surface hover:border-secondary hover:bg-white transition-all group"
                  disabled={submitting}
                >
                  <div>
                    <span className="text-xs font-bold text-primary block group-hover:text-secondary">
                      {demo.label}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      {demo.desc}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-data text-[10px] text-muted-foreground block">
                      {demo.email}
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-secondary mt-0.5 inline-block">
                      Click to enter
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
