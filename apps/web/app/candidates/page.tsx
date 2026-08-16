"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Candidate, CandidatesResponse } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";
import { AppHeader } from "@/components/ui/app-header";

export default function CandidatesPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useAuth();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    async function loadCandidates() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        const result = await api<CandidatesResponse>(
          `/v1/candidates?${params.toString()}`,
        );

        if (cancelled) {
          return;
        }

        setCandidates(result.data);
        setTotalPages(result.meta.totalPages);
        setTotal(result.meta.total);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load candidates",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [user, page, search]);

  useEffect(() => {
    if (!loadingUser && !user) {
      router.replace("/login");
    }
  }, [user, router, loadingUser]);

  if (loadingUser || !user) {
    return <LoadingState />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader title="Candidates" />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Candidate directory
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {total} candidate{total === 1 ? "" : "s"} in your tenant.
            </p>
          </div>

          <button
            onClick={() => router.push("/candidates/new")}
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Add candidate
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading candidates...
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="font-semibold text-slate-900">
                No candidates found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Add your first candidate to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Candidate
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Role
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {candidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {candidate.name}
                        </p>

                        <p className="text-sm text-slate-500">
                          {candidate.email}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {candidate.roleAppliedFor}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(candidate.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <button
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
