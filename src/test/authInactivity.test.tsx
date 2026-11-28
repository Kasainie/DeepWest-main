import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/AuthContext";
import { SESSION_INACTIVITY_TIMEOUT_MS } from "@/lib/sessionInactivity";
import type { Session } from "@supabase/supabase-js";

const supabaseAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: supabaseAuth },
}));

const session: Session = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 3600,
  user: {
    id: "idle-test-user",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    role: "authenticated",
  },
};

function renderAuthenticatedApp() {
  return render(
    <AuthProvider>
      <div>Signed in</div>
    </AuthProvider>,
  );
}

describe("session inactivity lock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    supabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    supabaseAuth.getSession.mockResolvedValue({ data: { session } });
    supabaseAuth.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("locks the local session after 20 minutes without activity", async () => {
    await act(async () => {
      renderAuthenticatedApp();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_INACTIVITY_TIMEOUT_MS - 1);
    });
    expect(supabaseAuth.signOut).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(supabaseAuth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("resets the timeout when the user interacts with the app", async () => {
    await act(async () => {
      renderAuthenticatedApp();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    });
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_INACTIVITY_TIMEOUT_MS - 1);
    });
    expect(supabaseAuth.signOut).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(supabaseAuth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("uses activity from another app tab to reset the timeout", async () => {
    await act(async () => {
      renderAuthenticatedApp();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    });

    const key = `lktech_last_activity:${session.user.id}`;
    const lastActivityAt = Date.now();
    localStorage.setItem(key, String(lastActivityAt));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", {
        key,
        newValue: String(lastActivityAt),
      }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_INACTIVITY_TIMEOUT_MS - 1);
    });
    expect(supabaseAuth.signOut).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(supabaseAuth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
