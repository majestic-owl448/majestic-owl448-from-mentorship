// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({ mounted: true, developmentAuth: false }));
const sessionAuth = vi.hoisted(() => vi.fn(({ children }) => <>{children}</>));

vi.mock("@/app/hooks/useIsMounted", () => ({ useIsMounted: () => state.mounted }));
vi.mock("@/lib/developmentAuth", () => ({
  isDevelopmentAuthClientEnabled: () => state.developmentAuth,
}));
vi.mock("supertokens-auth-react/recipe/session", () => ({ SessionAuth: sessionAuth }));

import { SessionAuthForNextJS } from "@/app/components/sessionAuthForNextJS";

describe("SessionAuthForNextJS", () => {
  beforeEach(() => {
    state.mounted = true;
    state.developmentAuth = false;
    sessionAuth.mockClear();
  });

  it("requires an authenticated session after mounting", () => {
    render(<SessionAuthForNextJS><p>Protected settings</p></SessionAuthForNextJS>);

    expect(sessionAuth).toHaveBeenCalledWith(
      expect.objectContaining({ requireAuth: true }),
      undefined,
    );
    expect(screen.getByText("Protected settings")).toBeTruthy();
  });
});
