"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AuthFormProps {
  mode: "login" | "signup";
  onSubmit: (email: string, password: string) => Promise<void>;
}

export default function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(email, password);
      router.push(isSignup ? "/onboarding" : "/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-20">
      <h1 className="text-2xl font-semibold">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm text-white/50">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm text-white/50">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn btn-solid mt-2">
          <span>{submitting ? "Please wait..." : isSignup ? "Sign up" : "Log in"}</span>
        </button>
      </form>

      <p className="text-sm text-white/55">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <Link href={isSignup ? "/login" : "/signup"} className="text-white hover:underline">
          {isSignup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
