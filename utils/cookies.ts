import type { Session } from "../types/auth";

const SESSION_COOKIE = "au_session";

// Simple cookie utility to replace js-cookie and avoid module resolution issues
const Cookies = {
    get: (name: string) => {
        if (typeof document === "undefined") return undefined;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift();
        return undefined;
    },
    set: (name: string, value: string, options?: { expires?: number; path?: string; sameSite?: string; secure?: boolean }) => {
        if (typeof document === "undefined") return;
        let cookie = `${name}=${value}`;
        if (options?.path) cookie += `; path=${options.path}`;
        if (options?.expires) {
            const d = new Date();
            d.setTime(d.getTime() + options.expires * 24 * 60 * 60 * 1000);
            cookie += `; expires=${d.toUTCString()}`;
        }
        if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
        if (options?.secure) cookie += `; secure`;
        document.cookie = cookie;
    },
    remove: (name: string, options?: { path?: string }) => {
        if (typeof document === "undefined") return;
        document.cookie = `${name}=; path=${options?.path || "/"}; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    },
};

export const readSessionFromCookie = (): Session | null => {
    const raw = Cookies.get(SESSION_COOKIE);
    if (!raw) return null;
    try {
        // Handle potentially URI encoded cookie values
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(decoded) as Session;
        if (!parsed?.role || !parsed?.email) return null;
        return parsed;
    } catch (err) {
        console.error("Invalid session cookie", err);
        return null;
    }
};

export const persistSessionCookie = (session: Session) => {
    Cookies.set(SESSION_COOKIE, JSON.stringify(session), {
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        expires: 3,
        path: "/",
    });
};

export const clearSessionCookie = () => {
    Cookies.remove(SESSION_COOKIE, { path: "/" });
};
