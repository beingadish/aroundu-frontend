"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../components/layout/AuthProvider";
import { currencyOptions, jobUrgencyOptions, paymentModeOptions } from "../../../../utils/constants";
import { createJob, deleteJob, getClientJobs, verifyReleaseCode } from "../../../../services/client";
import type { JobCreateRequest, JobSummary, JobUrgency, PaymentMode } from "../../../../types/job";

const parseNumberArray = (input: string): number[] =>
    input
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n));

export default function ClientDashboardPage() {
    const { session } = useAuth();
    const router = useRouter();
    const [jobs, setJobs] = useState<JobSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [jobForm, setJobForm] = useState({
        title: "",
        shortDescription: "",
        longDescription: "",
        amount: "",
        currency: "USD",
        jobLocationId: "",
        jobUrgency: "MEDIUM" as JobUrgency,
        requiredSkillIds: "",
        paymentMode: "ESCROW" as PaymentMode,
    });
    const [release, setRelease] = useState({ jobId: "", code: "" });

    const isClient = session?.role === "CLIENT";

    useEffect(() => {
        if (!session) return;
        if (!isClient) return;
        loadJobs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.userId]);

    const loadJobs = async () => {
        if (!session) return;
        setLoading(true);
        setStatus("Loading your jobs...");
        try {
            const res = await getClientJobs(session.userId, 0, 20);
            setJobs(res.data?.content ?? []);
            setStatus(res.message ?? "Loaded");
        } catch (err: any) {
            setStatus(err?.message ?? "Failed to load jobs");
        } finally {
            setLoading(false);
        }
    };

    const submitJob = async () => {
        if (!session) return;
        if (!jobForm.title || !jobForm.longDescription) {
            setStatus("Title and long description are required.");
            return;
        }
        const jobLocationId = Number(jobForm.jobLocationId);
        if (Number.isNaN(jobLocationId)) {
            setStatus("Job location id is required (use an existing location).");
            return;
        }
        const payload: JobCreateRequest = {
            title: jobForm.title,
            shortDescription: jobForm.shortDescription,
            longDescription: jobForm.longDescription,
            price: { currency: jobForm.currency, amount: Number(jobForm.amount || 0) },
            jobLocationId,
            jobUrgency: jobForm.jobUrgency,
            requiredSkillIds: parseNumberArray(jobForm.requiredSkillIds),
            paymentMode: jobForm.paymentMode,
        };
        setLoading(true);
        setStatus("Creating job...");
        try {
            await createJob(session.userId, payload);
            setStatus("Job created");
            setJobForm({ ...jobForm, title: "", shortDescription: "", longDescription: "", amount: "", requiredSkillIds: "" });
            loadJobs();
        } catch (err: any) {
            setStatus(err?.message ?? "Job creation failed");
        } finally {
            setLoading(false);
        }
    };

    const removeJob = async (jobId: number) => {
        if (!session) return;
        setLoading(true);
        setStatus("Deleting job...");
        try {
            await deleteJob(jobId, session.userId);
            setStatus("Job deleted");
            loadJobs();
        } catch (err: any) {
            setStatus(err?.message ?? "Delete failed");
        } finally {
            setLoading(false);
        }
    };

    const submitRelease = async () => {
        if (!session) return;
        const jobId = Number(release.jobId);
        if (!jobId) {
            setStatus("Job id required");
            return;
        }
        setLoading(true);
        setStatus("Verifying release code...");
        try {
            await verifyReleaseCode(jobId, session.userId, release.code);
            setStatus("Release confirmed");
        } catch (err: any) {
            setStatus(err?.message ?? "Release failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;
        if (!isClient) router.replace("/login");
    }, [session, isClient, router]);

    if (!session) {
        return (
            <div className="card space-y-2 p-6">
                <h2 className="text-xl font-semibold">Login required</h2>
                <p className="muted">Please login as a client to access your dashboard.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            <p className="muted text-sm">{status ?? "Welcome back. Manage your jobs and payments here."}</p>
            <div className="grid gap-4 md:grid-cols-2">
                <div className="card space-y-4 p-5">
                    <h3 className="text-lg font-semibold">Create job</h3>
                    <p className="muted text-sm">Post a job with required skills and payment mode. Address book is coming soon; use an existing location id for now.</p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <div className="label">Title</div>
                            <input className="input" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
                        </div>
                        <div>
                            <div className="label">Short description</div>
                            <input className="input" value={jobForm.shortDescription} onChange={(e) => setJobForm({ ...jobForm, shortDescription: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <div className="label">Long description</div>
                        <textarea
                            className="textarea"
                            rows={4}
                            value={jobForm.longDescription}
                            onChange={(e) => setJobForm({ ...jobForm, longDescription: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <div className="label">Amount</div>
                            <input className="input" type="number" value={jobForm.amount} onChange={(e) => setJobForm({ ...jobForm, amount: e.target.value })} />
                        </div>
                        <div>
                            <div className="label">Currency</div>
                            <select className="select" value={jobForm.currency} onChange={(e) => setJobForm({ ...jobForm, currency: e.target.value })}>
                                {currencyOptions.map((c) => (
                                    <option key={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <div className="label">Job location id</div>
                            <input
                                className="input"
                                value={jobForm.jobLocationId}
                                onChange={(e) => setJobForm({ ...jobForm, jobLocationId: e.target.value })}
                                placeholder="Existing address id"
                            />
                            <p className="muted mt-2 text-sm">Address book not implemented yet.</p>
                        </div>
                        <div>
                            <div className="label">Required skill ids (CSV)</div>
                            <input
                                className="input"
                                value={jobForm.requiredSkillIds}
                                onChange={(e) => setJobForm({ ...jobForm, requiredSkillIds: e.target.value })}
                                placeholder="1,2,3"
                            />
                        </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <div className="label">Urgency</div>
                            <select
                                className="select"
                                value={jobForm.jobUrgency}
                                onChange={(e) => setJobForm({ ...jobForm, jobUrgency: e.target.value as JobUrgency })}
                            >
                                {jobUrgencyOptions.map((u) => (
                                    <option key={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="label">Payment mode</div>
                            <select
                                className="select"
                                value={jobForm.paymentMode}
                                onChange={(e) => setJobForm({ ...jobForm, paymentMode: e.target.value as PaymentMode })}
                            >
                                {paymentModeOptions.map((p) => (
                                    <option key={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <button className="btn primary" onClick={submitJob} disabled={loading}>
                            {loading ? "Working..." : "Post job"}
                        </button>
                        <button className="btn ghost" type="button" disabled title="Not implemented yet">
                            Add address (Not Implemented)
                        </button>
                    </div>
                </div>
                <div className="card space-y-4 p-5">
                    <h3 className="text-lg font-semibold">Your jobs</h3>
                    <p className="muted text-sm">Refresh to sync with the latest state.</p>
                    <div className="flex gap-3">
                        <button className="btn ghost" onClick={loadJobs} disabled={loading}>
                            Refresh list
                        </button>
                    </div>
                    <div className="space-y-3">
                        {jobs.length === 0 && <div className="muted">No jobs yet.</div>}
                        <div className="grid gap-3">
                            {jobs.map((job) => (
                                <div key={job.id} className="card space-y-2 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="font-semibold">{job.title}</div>
                                            <div className="muted text-sm">{job.jobStatus ?? "-"} · {job.jobUrgency ?? "-"}</div>
                                        </div>
                                        <button className="btn danger" onClick={() => removeJob(job.id)} disabled={loading}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card space-y-4 p-5">
                <h3 className="text-lg font-semibold">Release payment code</h3>
                <p className="muted text-sm">Use the release code provided after job completion to trigger payout.</p>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <div className="label">Job id</div>
                        <input className="input" value={release.jobId} onChange={(e) => setRelease({ ...release, jobId: e.target.value })} />
                    </div>
                    <div>
                        <div className="label">Release code</div>
                        <input className="input" value={release.code} onChange={(e) => setRelease({ ...release, code: e.target.value })} />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="btn primary" onClick={submitRelease} disabled={loading}>
                        Verify & Release
                    </button>
                </div>
            </div>
        </div>
    );
}
