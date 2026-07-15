import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase, isRealSupabase, getMockProfiles, saveMockProfiles, type Profile } from "../lib/supabase";

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    role: Profile["role"],
    customerName?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateUserRole: (userId: string, role: Profile["role"]) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isRealSupabase) {
      // Real Supabase Auth Flow
      const initAuth = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*, customers(name)")
              .eq("id", session.user.id)
              .single();
            
            if (profile) {
              setUser({
                ...profile,
                customer_name: (profile as any).customers?.name || (profile as any).customer_name
              });
            } else {
              // fallback if profile record hasn't synced yet
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                role: (session.user.user_metadata?.role as any) || "customer",
                customer_name: session.user.user_metadata?.customer_name,
                created_at: session.user.created_at,
              });
            }
          }
        } catch (e) {
          console.error("Auth loading failed", e);
        } finally {
          setLoading(false);
        }
      };

      initAuth();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          if (session?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*, customers(name)")
              .eq("id", session.user.id)
              .single();
            if (profile) {
              setUser({
                ...profile,
                customer_name: (profile as any).customers?.name || (profile as any).customer_name
              });
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Local Mock Auth Flow
      const mockSession = localStorage.getItem("forge_flow_session");
      if (mockSession) {
        try {
          const parsed = JSON.parse(mockSession) as Profile;
          // Refresh from mock profiles list in case role changed
          const profiles = getMockProfiles();
          const fresh = profiles.find((p) => p.id === parsed.id) || parsed;
          setUser(fresh);
        } catch (e) {
          localStorage.removeItem("forge_flow_session");
        }
      }
      setLoading(false);
    }
  }, []);

  // Sign In
  const signIn = async (email: string, password: string) => {
    if (isRealSupabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      // Check deactivation state
      const { data: profile } = await supabase
        .from("profiles")
        .select("deactivated")
        .eq("id", data.user?.id)
        .single();
      if (profile?.deactivated) {
        await supabase.auth.signOut();
        return { error: new Error("This account is deactivated.") };
      }
      return { error: null };
    } else {
      // Find matching mock user
      const profiles = getMockProfiles();
      const match = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (!match) {
        return { error: new Error("Invalid login credentials") };
      }
      if (match.deactivated) {
        return { error: new Error("This account has been deactivated.") };
      }
      // Simulate password check (any matches for demo config)
      if (password !== "password123") {
        return { error: new Error("Invalid password. Use 'password123' for demo accounts.") };
      }

      localStorage.setItem("forge_flow_session", JSON.stringify(match));
      setUser(match);
      return { error: null };
    }
  };

  // Sign Up
  const signUp = async (
    email: string,
    password: string,
    role: Profile["role"],
    customerName?: string
  ) => {
    if (isRealSupabase) {
      let customerId: string | undefined = undefined;
      if (customerName) {
        const { data: customerData } = await supabase
          .from("customers")
          .select("id")
          .eq("name", customerName)
          .maybeSingle();
        if (customerData) {
          customerId = customerData.id;
        }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            customer_name: customerName,
            customer_id: customerId,
          },
        },
      });
      if (error) return { error };
      return { error: null };
    } else {
      const profiles = getMockProfiles();
      if (profiles.some((p) => p.email.toLowerCase() === email.toLowerCase())) {
        return { error: new Error("User already exists") };
      }

      const newProfile: Profile = {
        id: `mock-uid-${Math.random().toString(36).substr(2, 9)}`,
        email,
        role,
        customer_name: customerName,
        created_at: new Date().toISOString(),
      };

      profiles.push(newProfile);
      saveMockProfiles(profiles);

      // Auto sign in new user
      localStorage.setItem("forge_flow_session", JSON.stringify(newProfile));
      setUser(newProfile);
      return { error: null };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (isRealSupabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem("forge_flow_session");
      setUser(null);
    }
  };

  // Update user role (Settings User Management Panel)
  const updateUserRole = async (userId: string, role: Profile["role"]) => {
    if (isRealSupabase) {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);
      if (error) return { error };
      return { error: null };
    } else {
      const profiles = getMockProfiles();
      const idx = profiles.findIndex((p) => p.id === userId);
      if (idx !== -1) {
        profiles[idx].role = role;
        saveMockProfiles(profiles);
        // If current user, update session as well
        if (user && user.id === userId) {
          const updatedUser = { ...user, role };
          localStorage.setItem("forge_flow_session", JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
        return { error: null };
      }
      return { error: new Error("User profile not found") };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
