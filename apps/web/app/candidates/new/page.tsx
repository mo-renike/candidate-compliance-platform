"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingState } from "@/components/ui/loading-state";
import type { Candidate, CreateCandidateInput } from "@/lib/types";
import { AppHeader } from "@/components/ui/app-header";

export default function NewCandidatePage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useAuth();

  const [form, setForm] = useState<CreateCandidateInput>({
    name: "",
    email: "",
    roleAppliedFor: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loadingUser, user, router, loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      await api<Candidate>("/v1/candidates", {
        method: "POST",
        body: JSON.stringify(form),
      });

      router.replace("/candidates");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create candidate",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <LoadingState />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader title="Add candidate" backHref="/candidates" />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-500">Add candidate</h1>

          <p className="mt-2 text-sm text-slate-500">
            Add a candidate to your tenant workspace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-6">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>

              <input
                id="name"
                required
                maxLength={120}
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-500 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-500 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="jane@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="roleAppliedFor"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Role applied for
              </label>

              <input
                id="roleAppliedFor"
                required
                maxLength={120}
                value={form.roleAppliedFor}
                onChange={(event) =>
                  setForm({
                    ...form,
                    roleAppliedFor: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-500 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Software Engineer"
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create candidate"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
