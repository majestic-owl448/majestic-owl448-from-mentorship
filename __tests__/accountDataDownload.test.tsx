import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountDataDownload } from "@/app/components/accountDataDownload";

describe("account data download", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:export");
    URL.revokeObjectURL = vi.fn();
  });

  it("downloads the authenticated export with the server filename", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("{}", {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": 'attachment; filename="stamp-inventory-export-2026-08-28.json"',
          },
        }),
      ),
    );
    render(<AccountDataDownload />);

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Download my data as JSON" }),
    );
    await user.keyboard("{Enter}");

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/account/export"));
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled());
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export");
  });

  it("announces export failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    render(<AccountDataDownload />);

    fireEvent.click(screen.getByRole("button", { name: "Download my data as JSON" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Your data export could not be created. Try again.",
    );
  });
});
// @vitest-environment jsdom
