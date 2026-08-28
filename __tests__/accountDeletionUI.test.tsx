// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
const auth = vi.hoisted(() => ({ signOut: vi.fn(async () => undefined) }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("supertokens-auth-react/recipe/session", () => ({
  signOut: auth.signOut,
}));

import { AccountDeletion } from "@/app/components/accountDeletion";

describe("account deletion control", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    navigation.replace.mockReset();
    navigation.refresh.mockReset();
    auth.signOut.mockClear();
  });

  it("cancels without changing the account and restores focus", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountDeletion />);

    const openButton = screen.getByRole("button", { name: "Delete my account" });
    await user.tab();
    expect(document.activeElement).toBe(openButton);
    await user.keyboard("{Enter}");

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(document.activeElement).toBe(cancelButton);
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(openButton));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires DELETE and submits permanent deletion from the keyboard", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ deleted: true })));
    render(<AccountDeletion />);

    await user.click(screen.getByRole("button", { name: "Delete my account" }));
    const confirmButton = screen.getByRole("button", {
      name: "Permanently delete my account",
    });
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByRole("textbox", { name: "Type DELETE to confirm" }), "DELETE");
    expect((confirmButton as HTMLButtonElement).disabled).toBe(false);
    confirmButton.focus();
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      }),
    );
    await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
    expect(navigation.replace).toHaveBeenCalledWith("/auth?accountDeleted=true");
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it("announces an incomplete deletion and its blocked state", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error:
              "Account deletion is still in progress. Access remains blocked while the deletion is retried.",
          },
          { status: 503 },
        ),
      ),
    );
    render(<AccountDeletion />);

    await user.click(screen.getByRole("button", { name: "Delete my account" }));
    await user.type(screen.getByRole("textbox", { name: "Type DELETE to confirm" }), "DELETE");
    await user.click(
      screen.getByRole("button", { name: "Permanently delete my account" }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Access remains blocked",
    );
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
