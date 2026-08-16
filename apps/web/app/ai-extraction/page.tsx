"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingState } from "@/components/ui/loading-state";
import { AIExtraction, Candidate } from "@/lib/types";
import { AppHeader } from "@/components/ui/app-header";

export default function AIExtractionPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState(
    "Extract structured candidate information from CV",
  );
  const [candidateId, setCandidateId] = useState("");

  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [extraction, setExtraction] = useState<AIExtraction | null>(null);

  const [fullName, setFullName] = useState("");
  const [skills, setSkills] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [certifications, setCertifications] = useState("");

  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    async function loadCandidates() {
      setLoadingCandidates(true);

      try {
        const result = await api<{
          data: Candidate[];
        }>("/v1/candidates?limit=100");

        if (!cancelled) {
          setCandidates(result.data);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load candidates.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      }
    }

    void loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return <LoadingState />;
  }

  const canCreateExtraction =
    user.role === "ADMIN" || user.role === "RECRUITER";

  const canConfirmExtraction =
    user.role === "ADMIN" || user.role === "RECRUITER";

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setSuccess("");

    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedTypes = ["application/pdf", "text/plain"];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF or text CV.");
      event.target.value = "";
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidateId) {
      setError("Please select a candidate before uploading a CV.");
      return;
    }

    if (!file) {
      setError("Please select a CV first.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    setExtraction(null);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("purpose", purpose);

      if (candidateId) {
        formData.append("candidateId", candidateId);
      }

      const result = await api<AIExtraction>("/v1/ai/cv-extractions", {
        method: "POST",
        body: formData,
      });

      setExtraction(result);

      setFullName(result.output.fullName);
      setSkills(result.output.skills.join(", "));
      setYearsOfExperience(String(result.output.yearsOfExperience));
      setCertifications(result.output.certifications.join(", "));

      setSuccess(
        "CV processed successfully. Review the proposed extraction before confirming it.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process CV.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(decision: "accept" | "reject") {
    if (!extraction) {
      return;
    }

    setConfirming(true);
    setError("");
    setSuccess("");

    try {
      const body =
        decision === "accept"
          ? {
              decision,
              candidateId: extraction.candidateId ?? candidateId,
              overrides: {
                fullName,
                skills: skills
                  .split(",")
                  .map((skill) => skill.trim())
                  .filter(Boolean),
                yearsOfExperience: Number(yearsOfExperience),
                certifications: certifications
                  .split(",")
                  .map((certification) => certification.trim())
                  .filter(Boolean),
              },
            }
          : {
              decision,
            };

      const result = await api<AIExtraction>(
        `/v1/ai/cv-extractions/${extraction.id}/confirm`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );

      setExtraction(result);

      if (decision === "accept") {
        setSuccess("Extraction confirmed and candidate data updated.");
      } else {
        setSuccess("Extraction rejected successfully.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to confirm extraction.",
      );
    } finally {
      setConfirming(false);
    }
  }

  if (!canCreateExtraction) {
    return (
      <main className="min-h-screen bg-slate-50">
        <AppHeader title="AI CV Extraction" backHref="/dashboard" />

        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-900">Access restricted</h2>

            <p className="mt-2 text-sm text-amber-800">
              Your role does not have permission to create AI CV extractions.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Candidate Compliance
            </p>

            <h1 className="text-xl font-bold text-slate-900">
              AI CV Extraction
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user.name}</span>

            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Governed CV extraction
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Upload a candidate CV to generate a structured proposal. AI output
            is never automatically accepted. Review and confirm the extracted
            information before it changes candidate data.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="font-semibold text-slate-900">Upload CV</h3>

              <p className="mt-1 text-sm text-slate-500">
                PDF or plain text files are supported.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Candidate
                </label>

                <select
                  value={candidateId}
                  required
                  onChange={(event) => setCandidateId(event.target.value)}
                  disabled={loadingCandidates}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select a candidate</option>

                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · {candidate.email}
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-xs text-slate-500">
                  Select the candidate this CV belongs to before processing.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Purpose
                </label>

                <input
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  CV file
                </label>

                <input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={handleFileChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-500"
                />

                {file && (
                  <p className="mt-2 text-xs text-slate-500">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!file || submitting}
                className="w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Extracting..." : "Extract CV information"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {!extraction ? (
              <div className="flex min-h-[420px] items-center justify-center text-center">
                <div className="max-w-sm">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    AI
                  </div>

                  <h3 className="font-semibold text-slate-900">
                    No extraction yet
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Upload a CV to generate a proposed structured extraction.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Proposed extraction
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Model: {extraction.model}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    {extraction.status}
                  </span>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Full name
                    </label>

                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      disabled={extraction.status !== "PROPOSED"}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Skills
                    </label>

                    <textarea
                      value={skills}
                      onChange={(event) => setSkills(event.target.value)}
                      disabled={extraction.status !== "PROPOSED"}
                      rows={3}
                      placeholder="React, TypeScript, Node.js"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 text-slate-500"
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Separate skills with commas.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Years of experience
                    </label>

                    <input
                      type="number"
                      min={0}
                      value={yearsOfExperience}
                      onChange={(event) =>
                        setYearsOfExperience(event.target.value)
                      }
                      disabled={extraction.status !== "PROPOSED"}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Certifications
                    </label>

                    <textarea
                      value={certifications}
                      onChange={(event) =>
                        setCertifications(event.target.value)
                      }
                      disabled={extraction.status !== "PROPOSED"}
                      rows={3}
                      placeholder="AWS Certified Developer, Scrum Master"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 text-slate-500"
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Separate certifications with commas.
                    </p>
                  </div>

                  {extraction.status === "PROPOSED" && canConfirmExtraction && (
                    <div className="flex gap-3 border-t border-slate-200 pt-5">
                      <button
                        type="button"
                        disabled={confirming}
                        onClick={() => handleDecision("reject")}
                        className="flex-1 rounded-lg border border-red-200 bg-white px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {confirming ? "Processing..." : "Reject"}
                      </button>

                      <button
                        type="button"
                        disabled={confirming}
                        onClick={() => handleDecision("accept")}
                        className="flex-1 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {confirming ? "Processing..." : "Confirm & save"}
                      </button>
                    </div>
                  )}

                  {extraction.status !== "PROPOSED" && (
                    <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                      This extraction has already been{" "}
                      <strong>{extraction.status.toLowerCase()}</strong>.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
