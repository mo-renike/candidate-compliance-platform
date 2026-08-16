"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { LoadingState } from "@/components/ui/loading-state";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  if (!user) {
    return <LoadingState />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Candidate Compliance
            </p>

            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>

            <p className="text-xs text-slate-500">{user.role}</p>
            <button
              onClick={() => router.push("/ai-extraction")}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              AI Extraction
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <button
            onClick={() => router.push("/candidates")}
            className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-slate-500">Candidates</p>

            <p className="mt-2 text-2xl font-bold text-slate-900">Manage</p>

            <p className="mt-2 text-sm text-slate-500">
              View and add candidates.
            </p>
          </button>
        </div>
      </div>
    </main>
  );
}
