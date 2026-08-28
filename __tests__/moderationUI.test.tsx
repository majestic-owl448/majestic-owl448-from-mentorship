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
            decision: null,
            canonicalTargetId: null,
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
            compatibleMergeTargets: [
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

  it("supports keyboard approval confirmation and announces the resulting status", async () => {
    const user = userEvent.setup();
    const pendingProposal = {
      id: "conversion-proposal",
      proposalType: "FIXED_CONVERSION",
      status: "PENDING",
      proposer: { id: "proposer", email: "proposer@example.com" },
      submittedAt: "2026-08-28T10:00:00.000Z",
      source: { url: null, note: "Central bank bulletin" },
      decision: null,
      canonicalTargetId: null,
      proposedValues: {
        targetCurrencyConversionId: null,
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.91",
      },
      possibleMatches: [],
      compatibleMergeTargets: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ proposal: pendingProposal }))
      .mockResolvedValueOnce(
        Response.json({
          proposal: {
            ...pendingProposal,
            status: "APPROVED",
            decision: {
              moderator: {
                id: "moderator",
                email: "moderator@example.com",
              },
              decidedAt: "2026-08-28T11:00:00.000Z",
              note: "Rate checked against the central bank bulletin.",
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <ModerationProposalDetail
        proposalType="FIXED_CONVERSION"
        proposalId="conversion-proposal"
      />,
    );
    await screen.findByRole("heading", { name: "Moderate proposal" });

    const note = screen.getByLabelText("Decision note");
    note.focus();
    await user.keyboard("Rate checked against the central bank bulletin.");
    await user.tab();
    const confirmation = screen.getByRole("checkbox", {
      name: /I confirm that this proposal should update shared data/,
    });
    expect(document.activeElement).toBe(confirmation);
    await user.keyboard(" ");
    await user.tab();
    const approveButton = screen.getByRole("button", {
      name: "Approve proposal",
    });
    expect(document.activeElement).toBe(approveButton);
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("Proposal approved. Shared data is now available."),
    ).toBeTruthy();
    expect(screen.getByText("APPROVED")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Decision" })).toBeTruthy();
    expect(screen.getByText("moderator@example.com")).toBeTruthy();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/moderation/proposals/FIXED_CONVERSION/conversion-proposal",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "APPROVE",
          decisionNote: "Rate checked against the central bank bulletin.",
        }),
      }),
    );
  });

  it("supports keyboard merge-target selection and confirmation", async () => {
    const user = userEvent.setup();
    const pendingProposal = {
      id: "conversion-proposal",
      proposalType: "FIXED_CONVERSION",
      status: "PENDING",
      proposer: { id: "proposer", email: "proposer@example.com" },
      submittedAt: "2026-08-28T10:00:00.000Z",
      source: { url: null, note: "Central bank bulletin" },
      decision: null,
      canonicalTargetId: null,
      proposedValues: {
        targetCurrencyConversionId: null,
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.90",
      },
      possibleMatches: [
        {
          id: "approved-usd-eur",
          fromCurrencyCode: "USD",
          toCurrencyCode: "EUR",
          multiplier: "0.9",
        },
      ],
      compatibleMergeTargets: [
        {
          id: "approved-usd-eur",
          fromCurrencyCode: "USD",
          toCurrencyCode: "EUR",
          multiplier: "0.9",
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ proposal: pendingProposal }))
      .mockResolvedValueOnce(
        Response.json({
          proposal: {
            ...pendingProposal,
            status: "MERGED",
            canonicalTargetId: "approved-usd-eur",
            decision: {
              moderator: { id: "moderator", email: "moderator@example.com" },
              decidedAt: "2026-08-28T11:00:00.000Z",
              note: "Confirmed duplicate fixed conversion.",
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <ModerationProposalDetail
        proposalType="FIXED_CONVERSION"
        proposalId="conversion-proposal"
      />,
    );
    await screen.findByRole("heading", { name: "Moderate proposal" });

    const mergeAction = screen.getByRole("radio", {
      name: "Merge as a duplicate",
    });
    mergeAction.focus();
    await user.keyboard(" ");
    const target = screen.getByRole("radio", {
      name: /id: approved-usd-eur/,
    });
    await user.tab();
    expect(document.activeElement).toBe(target);
    await user.keyboard(" ");
    await user.tab();
    await user.keyboard("Confirmed duplicate fixed conversion.");
    await user.tab();
    const confirmation = screen.getByRole("checkbox", {
      name: /duplicate should use the selected canonical record/,
    });
    expect(document.activeElement).toBe(confirmation);
    await user.keyboard(" ");
    await user.tab();
    const mergeButton = screen.getByRole("button", { name: "Merge proposal" });
    expect(document.activeElement).toBe(mergeButton);
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText(
        "Proposal merged. References now use the canonical record.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("MERGED")).toBeTruthy();
    expect(screen.getByText("approved-usd-eur")).toBeTruthy();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/moderation/proposals/FIXED_CONVERSION/conversion-proposal",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "MERGE",
          decisionNote: "Confirmed duplicate fixed conversion.",
          targetId: "approved-usd-eur",
        }),
      }),
    );
  });

  it("requires a note and keyboard confirmation before rejection", async () => {
    const user = userEvent.setup();
    const pendingProposal = {
      id: "conversion-proposal",
      proposalType: "FIXED_CONVERSION",
      status: "PENDING",
      proposer: { id: "proposer", email: "proposer@example.com" },
      submittedAt: "2026-08-28T10:00:00.000Z",
      source: { url: null, note: "Unverified rate" },
      decision: null,
      canonicalTargetId: null,
      proposedValues: {
        targetCurrencyConversionId: null,
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.91",
      },
      possibleMatches: [],
      compatibleMergeTargets: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ proposal: pendingProposal }))
      .mockResolvedValueOnce(
        Response.json({
          proposal: {
            ...pendingProposal,
            status: "REJECTED",
            decision: {
              moderator: { id: "moderator", email: "moderator@example.com" },
              decidedAt: "2026-08-28T11:00:00.000Z",
              note: "The source does not verify the submitted rate.",
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <ModerationProposalDetail
        proposalType="FIXED_CONVERSION"
        proposalId="conversion-proposal"
      />,
    );
    await screen.findByRole("heading", { name: "Moderate proposal" });

    const rejectAction = screen.getByRole("radio", {
      name: "Reject without publishing",
    });
    rejectAction.focus();
    await user.keyboard(" ");
    const rejectButton = screen.getByRole("button", { name: "Reject proposal" });
    expect((rejectButton as HTMLButtonElement).disabled).toBe(true);
    await user.type(
      screen.getByLabelText("Decision note"),
      "The source does not verify the submitted rate.",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /proposal should be rejected and linked inventory should require action/,
      }),
    );
    expect((rejectButton as HTMLButtonElement).disabled).toBe(false);
    rejectButton.focus();
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText(
        "Proposal rejected. Linked inventory now requires action.",
      ),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/moderation/proposals/FIXED_CONVERSION/conversion-proposal",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "REJECT",
          decisionNote: "The source does not verify the submitted rate.",
        }),
      }),
    );
  });
});
