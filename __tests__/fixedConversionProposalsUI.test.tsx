// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  FixedConversionProposals,
  FixedConversionProposalStatusList,
} from "@/app/components/fixedConversionProposals";

describe("fixed-conversion proposal interface", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("labels every input and exposes proposal controls to the keyboard", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          approvedConversions: [
            {
              id: "approved-itl-eur",
              fromCurrencyCode: "ITL",
              toCurrencyCode: "EUR",
              multiplier: "0.0005",
            },
          ],
          proposals: [],
        }),
      ),
    );
    render(
      <FixedConversionProposals
        activeDisplayCurrencyCode="EUR"
        currencies={[
          { value: "EUR", label: "EUR - Euro" },
          { value: "ITL", label: "ITL - Italian lira" },
        ]}
        onProposalSubmitted={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Proposed source currency")).toBeInstanceOf(
      HTMLSelectElement,
    );
    expect(screen.getByLabelText("Exact multiplier")).toBeInstanceOf(
      HTMLInputElement,
    );
    expect(screen.getByLabelText("Source URL")).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByLabelText("Source note")).toBeInstanceOf(
      HTMLTextAreaElement,
    );
    await user.selectOptions(screen.getByLabelText("Proposal type"), "CORRECTION");
    const target = screen.getByLabelText("Approved conversion to correct");
    await waitFor(() =>
      expect((target as HTMLSelectElement).options).toHaveLength(2),
    );
    await user.selectOptions(target, "approved-itl-eur");
    expect(
      (screen.getByLabelText("Proposed source currency") as HTMLSelectElement)
        .value,
    ).toBe("ITL");
    expect(
      (screen.getByRole("button", {
        name: "Submit conversion proposal",
      }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("renders proposal status as text instead of color alone", () => {
    render(
      <FixedConversionProposalStatusList
        proposals={[
          {
            id: "pending-rate",
            targetCurrencyConversionId: null,
            fromCurrencyCode: "ITL",
            toCurrencyCode: "EUR",
            multiplier: "0.0005",
            sourceUrl: null,
            sourceNote: "National tariff",
            status: "PENDING",
            createdAt: "2026-08-27T12:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Status: PENDING")).toBeTruthy();
    expect(screen.getByText("Type: Missing conversion")).toBeTruthy();
  });

  it("shows the decision note and correction prompt for a rejected proposal", () => {
    render(
      <FixedConversionProposalStatusList
        proposals={[
          {
            id: "rejected-rate",
            targetCurrencyConversionId: null,
            fromCurrencyCode: "ITL",
            toCurrencyCode: "EUR",
            multiplier: "0.0005",
            sourceUrl: null,
            sourceNote: "Unverified source",
            status: "REJECTED",
            decidedAt: "2026-08-28T12:00:00.000Z",
            decisionNote: "Use the central bank bulletin.",
            createdAt: "2026-08-27T12:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Decision note: Use the central bank bulletin.")).toBeTruthy();
    expect(screen.getByText(/choose a fallback on each affected inventory row/)).toBeTruthy();
  });

  it("refreshes stamp values after a successful proposal submission", async () => {
    const user = userEvent.setup();
    const onProposalSubmitted = vi.fn(async () => undefined);
    const pendingProposal = {
      id: "pending-rate",
      targetCurrencyConversionId: null,
      fromCurrencyCode: "ITL",
      toCurrencyCode: "EUR",
      multiplier: "0.0005",
      sourceUrl: null,
      sourceNote: "National tariff",
      status: "PENDING" as const,
      createdAt: "2026-08-27T12:00:00.000Z",
    };
    let submitted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.method === "POST") {
          submitted = true;
          return Response.json({ proposal: pendingProposal }, { status: 201 });
        }
        return Response.json({
          approvedConversions: [],
          proposals: submitted ? [pendingProposal] : [],
        });
      }),
    );
    render(
      <FixedConversionProposals
        activeDisplayCurrencyCode="EUR"
        currencies={[
          { value: "EUR", label: "EUR - Euro" },
          { value: "ITL", label: "ITL - Italian lira" },
        ]}
        onProposalSubmitted={onProposalSubmitted}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Proposed source currency"),
      "ITL",
    );
    await user.type(screen.getByLabelText("Exact multiplier"), "0.0005");
    await user.type(screen.getByLabelText("Source note"), "National tariff");
    await user.click(
      screen.getByRole("button", { name: "Submit conversion proposal" }),
    );

    expect(
      await screen.findByText(
        "Proposal submitted with PENDING status. Your stamps now use this multiplier.",
      ),
    ).toBeTruthy();
    await waitFor(() => expect(onProposalSubmitted).toHaveBeenCalledOnce());
    expect(await screen.findByText("Status: PENDING")).toBeTruthy();
  });

  it("programmatically associates validation errors with invalid fields", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.method === "POST") {
          return Response.json(
            {
              error: "Correct the proposal fields.",
              errors: { multiplier: "Enter an exact positive multiplier." },
            },
            { status: 400 },
          );
        }
        return Response.json({ approvedConversions: [], proposals: [] });
      }),
    );
    render(
      <FixedConversionProposals
        activeDisplayCurrencyCode="EUR"
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
        onProposalSubmitted={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Submit conversion proposal" }),
    );

    const field = screen.getByLabelText("Exact multiplier");
    await waitFor(() => expect(field.getAttribute("aria-invalid")).toBe("true"));
    expect(field.getAttribute("aria-describedby")).toBe(
      "proposal-multiplier-error",
    );
    expect(screen.getByText("Enter an exact positive multiplier.").id).toBe(
      "proposal-multiplier-error",
    );
  });
});
