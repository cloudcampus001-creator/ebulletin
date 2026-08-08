import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { GraduationCap, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const search = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in · Bulletin" },
      { name: "description", content: "Sign in to manage your school's bulletins and report cards." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: (search.redirect ?? "/dashboard") as never });
  },
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode, redirect: redirectTo } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin + "/dashboard",
          },
        });
        if (error) throw error;
        toast.success("Account created. You can sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: (redirectTo ?? "/dashboard") as never });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: (redirectTo ?? "/dashboard") as never });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Marketing side */}
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground md:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-foreground text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold">Bulletin</span>
        </Link>
        <div className="max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
            République du Cameroun · Republic of Cameroon
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-snug">
            Print bulletins your school is proud to sign.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/80">
            Francophone &amp; Anglophone — moyennes, ranks, conduct, conseil de classe, all
            on one PDF that matches what you're already using.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} Bulletin</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display text-base font-semibold">Bulletin</span>
          </Link>

          <p className="eyebrow">{mode === "signup" ? "Create account" : "Welcome back"}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {mode === "signup" ? "Set up your school" : "Sign in"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "We'll walk you through the school setup wizard after sign up."
              : "Continue to your dashboard."}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-border bg-background text-sm font-medium transition-colors hover:bg-surface disabled:opacity-50"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your full name</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Mbarga" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@school.cm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="At least 8 characters" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5 17.6 35.5 12.5 30.4 12.5 24S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 16.2 4.5 9.4 9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-2 13.1-5.2l-6-5.1c-2 1.5-4.5 2.3-7.1 2.3-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.3 38.9 16 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6 5.1C40.8 35 43.5 30 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
