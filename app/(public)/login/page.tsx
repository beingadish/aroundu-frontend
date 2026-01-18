"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "../../../services/auth";
import type { Role } from "../../../types/auth";
import { useAuth } from "../../../components/layout/AuthProvider";

function LoginPageInner() {
    const [role, setRole] = useState<Role>("CLIENT");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { setSession, session } = useAuth();
    const params = useSearchParams();

    useEffect(() => {
        const prefill = params.get("email");
        if (prefill) setEmail(prefill);
    }, [params]);

    useEffect(() => {
        if (!session) return;
        if (session.role === "ADMIN") router.replace("/admin");
        else if (session.role === "WORKER") router.replace("/worker/dashboard");
        else router.replace("/client/dashboard");
    }, [session, router]);

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            const sessionPayload = await login(email, password);
            if (role !== sessionPayload.role) {
                setError(`This account is ${sessionPayload.role.toLowerCase()}. Choose the correct role to continue.`);
                setBusy(false);
                return;
            }
            setSession(sessionPayload);
            if (sessionPayload.role === "ADMIN") router.push("/admin");
            else if (sessionPayload.role === "WORKER") router.push("/worker/dashboard");
            else router.push("/client/dashboard");
        } catch (err: any) {
            setError(err?.message ?? "Login failed");
        } finally {
            setBusy(false);
        }
    };

    const unavailable = error ? /unavailable|refused|offline/i.test(error) : false;

    return (
        <div className="grid items-start gap-6 md:grid-cols-2">
            <div className="card space-y-4 p-7">
                <div className="kicker">Sign back in</div>
                <h2 className="text-2xl font-semibold">Access your dashboard</h2>
                <p className="muted">Choose your role, enter credentials, and we'll route you to the correct experience.</p>
                {unavailable && (
                    <div className="card border border-danger/60 bg-danger/10 p-4 text-center text-red-100">
                        <div className="kicker text-red-200">Service unavailable</div>
                        <p className="text-sm">Uh oh! Looks like we're facing an issue. Please try again later.</p>
                    </div>
                )}
                <div className="grid gap-4 pt-2">
                    <div>
                        <div className="label">Role</div>
                        <div className="flex flex-wrap gap-2">
                            {["CLIENT", "WORKER", "ADMIN"].map((option) => (
                                <button
                                    key={option}
                                    className={`btn ${role === option ? "primary" : "ghost"}`}
                                    type="button"
                                    onClick={() => setRole(option as Role)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="label">Email</div>
                        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>
                    <div>
                        <div className="label">Password</div>
                        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    {error && !unavailable && <div className="badge border-danger/80 bg-danger/10 text-red-100">{error}</div>}
                    <div className="flex flex-wrap items-center gap-3">
                        <button className="btn primary" disabled={busy} onClick={submit}>
                            {busy ? "Signing in..." : "Login"}
                        </button>
                        <Link href="/signup" className="btn ghost">
                            Need an account?
                        </Link>
                        <Link href="/admin" className="btn ghost">
                            Admin login
                        </Link>
                    </div>
                </div>
            </div>
            <div className="card space-y-3 p-6">
                <div className="kicker">Tips</div>
                <ul className="muted list-disc space-y-2 pl-5 text-sm">
                    <li>Admins sign in with existing credentials; admin signup is disabled.</li>
                    <li>Choose the correct role to route to the right dashboard.</li>
                    <li>Logout fully clears your session cookie.</li>
                </ul>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="card p-6">Loading login...</div>}>
            <LoginPageInner />
        </Suspense>
    );
}
