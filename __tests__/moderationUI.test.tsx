// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModerationProposalDetail } from "@/app/components/moderationProposalDetail";
import { ModerationQueue } from "@/app/components/moderationQueue";

describe("moderation interface", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("labels queue filters and provides keyboard-operable detail navigation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      return Response.json({
        proposals: url.includes("type=FIXED_CONVERSION")
          ? [
              {
                id: "conversion-proposal",
                proposalType: "FIXED_CONVERSION",
                status: "PENDING",
                summary: "USD to EUR at 0.91",
                proposer: { id: "proposer", email: "proposer@example.com" },
                submittedAt: "2026-08-28T10:00:00.000Z",
              },
            ]
          : [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ModerationQueue />);

    expect(screen.getByRole("form", { name: "Proposal queue filters" })).toBeTruthy();
    expect(screen.getByLabelText("Proposal type")).toBeInstanceOf(HTMLSelectElement);
    expect(screen.getByLabelText("Status")).toBeInstanceOf(HTMLSelectElement);

    await user.selectOptions(
      screen.getByLabelText("Proposal type"),
      "FIXED_CONVERSION",
    );
    const detailLink = await screen.findByRole("link", {
      name: /USD to EUR at 0.91/,
    });
    expect(detailLink.getAttribute("href")).toBe(
      "/moderation/FIXED_CONVERSION/conversion-proposal",
    );
    detailLink.focus();
    expect(document.activeElement).toBe(detailLink);
  });

  it("labels proposal data, submitted source, and possible matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          proposal: {
            id: "conversion-proposal",
            proposalType: "FIXED_CONVERSION",
            status: "PENDING",
            proposer: { id: "proposer", email: "proposer@example.com" },
            submittedAt: "2026-08-28T10:00:00.000Z",
            source: { url: null, note: "Central bank bulletin" },
            proposedValues: {
              targetCurrencyConversionId: "approved-usd-eur",
              fromCurrencyCode: "USD",
              toCurrencyCode: "EUR",
              multiplier: "0.91",
            },
            possibleMatches: [
              {
                id: "approved-usd-eur",
                fromCurrencyCode: "USD",
                toCurrencyCode: "EUR",
                multiplier: "0.90",
              },
            ],
          },
        }),
      ),
    );
    render(
      <ModerationProposalDetail
        proposalType="FIXED_CONVERSION"
        proposalId="conversion-proposal"
      />,
    );

    expect(await screen.findByRole("heading", { name: "Proposal details" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Proposed values" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Submitted source" })).toBeTruthy();
    expect(screen.getByText(/Central bank bulletin/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Possible approved matches" })).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Multiplier: 0.90/)).toBeTruthy());
    expect(screen.getByRole("link", { name: "Back to proposal queue" })).toBeTruthy();
  });
});
