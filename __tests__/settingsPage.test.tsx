// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/app/hooks/useAppSession", () => ({ signOutAppSession: vi.fn() }));
vi.mock("@/app/components/sessionAuthForNextJS", () => ({
  SessionAuthForNextJS: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import SettingsPage from "@/app/settings/page";

describe("settings page", () => {
  it("places personal account controls behind the authenticated route boundary", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download my data as JSON" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeTruthy();
    expect(screen.queryByText("Choose a postal entity")).toBeNull();
  });
});
