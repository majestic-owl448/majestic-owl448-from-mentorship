// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigation = vi.hoisted(() => ({ pathname: "/dashboard", push: vi.fn() }));
const auth = vi.hoisted(() => ({ signOut: vi.fn(async () => undefined) }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock("@/app/hooks/useAppSession", () => ({ signOutAppSession: auth.signOut }));

import { AuthenticatedNavigation } from "@/app/components/authenticatedNavigation";

describe("authenticated navigation", () => {
  beforeEach(() => {
    navigation.pathname = "/dashboard";
    navigation.push.mockReset();
    auth.signOut.mockClear();
  });

  it("identifies the current page and keeps sign-out in navigation", async () => {
    const user = userEvent.setup();
    render(<AuthenticatedNavigation />);

    expect(screen.getByRole("navigation", { name: "Authenticated navigation" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("aria-current")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(navigation.push).toHaveBeenCalledWith("/auth");
  });
});
