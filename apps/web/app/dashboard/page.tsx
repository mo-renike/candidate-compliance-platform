"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { LoadingState } from "@/components/ui/loading-state";
import { AppHeader } from "@/components/ui/app-header";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  if (loading || !user) {
    return <LoadingState />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader title="Dashboard" />

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
