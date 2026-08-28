// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NamedFaceValueProposals,
  ProposalStatusList,
} from "@/app/components/namedFaceValueProposals";

describe("named/code proposal interface", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        return Response.json(
          url.includes("named-face-values?")
            ? { namedFaceValues: [] }
            : { definitions: [], values: [] },
        );
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("labels proposal inputs and exposes definition and value controls to the keyboard", async () => {
    const user = userEvent.setup();
    render(
      <NamedFaceValueProposals
        activeCountryCode="IT"
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
      />,
    );

    expect(screen.getByLabelText("Proposal type")).toBeInstanceOf(
      HTMLSelectElement,
    );
    expect(screen.getByLabelText("Proposed display name or code")).toBeInstanceOf(
      HTMLInputElement,
    );
    expect(screen.getByLabelText("Source URL")).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByLabelText("Source note")).toBeInstanceOf(
      HTMLTextAreaElement,
    );

    await user.selectOptions(screen.getByLabelText("Proposal type"), "VALUE");
    expect(screen.getByLabelText("Proposed amount")).toBeInstanceOf(
      HTMLInputElement,
    );
    expect(
      (screen.getByLabelText("Effective date (leave blank for current)") as HTMLInputElement).type,
    ).toBe("date");
    expect(
      (screen.getByRole("button", { name: "Submit proposal" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("renders proposal status as text", () => {
    render(
      <ProposalStatusList
        proposals={{
          definitions: [
            {
              id: "pending-definition",
              proposalType: "DEFINITION",
              targetNamedFaceValueId: null,
              countryCode: "IT",
              displayCode: "B Zona 2",
              normalizedCode: "b zona 2",
              currencyCode: "EUR",
              sourceUrl: null,
              sourceNote: "Published tariff",
              status: "PENDING",
              createdAt: "2026-08-27T12:00:00.000Z",
            },
          ],
          values: [],
        }}
      />,
    );

    expect(screen.getByText("Status: PENDING")).toBeTruthy();
  });

  it("shows the decision note and replacement prompt after rejection", () => {
    render(
      <ProposalStatusList
        proposals={{
          definitions: [
            {
              id: "rejected-definition",
              proposalType: "DEFINITION",
              targetNamedFaceValueId: null,
              countryCode: "IT",
              displayCode: "Unsupported",
              normalizedCode: "unsupported",
              currencyCode: "EUR",
              sourceUrl: null,
              sourceNote: "Unverified source",
              status: "REJECTED",
              decidedAt: "2026-08-28T12:00:00.000Z",
              decisionNote: "Use the published tariff.",
              createdAt: "2026-08-27T12:00:00.000Z",
            },
          ],
          values: [
            {
              id: "blocked-value",
              proposalType: "VALUE",
              namedFaceValueId: null,
              definitionProposalId: "rejected-definition",
              amount: "0.75",
              effectiveOn: null,
              sourceUrl: null,
              sourceNote: "Same source",
              status: "PENDING",
              actionRequired: true,
              createdAt: "2026-08-27T13:00:00.000Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Decision note: Use the published tariff.")).toBeTruthy();
    expect(screen.getByText(/replace each affected inventory reference/)).toBeTruthy();
    expect(
      screen.getByText(/linked definition was rejected/),
    ).toBeTruthy();
  });

  it("links a corrected definition submission to the rejected proposal", async () => {
    const user = userEvent.setup();
    let submittedBody: Record<string, unknown> | null = null;
    const rejectedDefinition = {
      id: "rejected-definition",
      proposalType: "DEFINITION" as const,
      targetNamedFaceValueId: null,
      countryCode: "IT",
      displayCode: "Unsupported",
      normalizedCode: "unsupported",
      currencyCode: "EUR",
      sourceUrl: null,
      sourceNote: "Unverified source",
      status: "REJECTED" as const,
      decidedAt: "2026-08-28T12:00:00.000Z",
      decisionNote: "Use the published tariff.",
      createdAt: "2026-08-27T12:00:00.000Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("named-face-values?")) {
          return Response.json({ namedFaceValues: [] });
        }
        if (init?.method === "POST") {
          submittedBody = JSON.parse(String(init.body)) as Record<
            string,
            unknown
          >;
          return Response.json(
            {
              proposal: {
                ...rejectedDefinition,
                id: "corrected-definition",
                status: "PENDING",
              },
            },
            { status: 201 },
          );
        }
        return Response.json({
          definitions: [rejectedDefinition],
          values: [],
        });
      }),
    );
    render(
      <NamedFaceValueProposals
        activeCountryCode="IT"
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Resubmit corrected definition",
      }),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByLabelText("Proposed display name or code"),
      ),
    );
    expect(
      screen.getByText(/Correcting rejected definition rejected-definition/),
    ).toBeTruthy();
    await user.type(
      screen.getByLabelText("Proposed display name or code"),
      "Corrected",
    );
    await user.type(
      screen.getByLabelText("Proposed normalized code"),
      "corrected",
    );
    await user.selectOptions(screen.getByLabelText("Schedule currency"), "EUR");
    await user.type(screen.getByLabelText("Source note"), "Published tariff");
    await user.click(screen.getByRole("button", { name: "Submit proposal" }));

    await waitFor(() =>
      expect(submittedBody).toMatchObject({
        proposalType: "DEFINITION",
        replacesRejectedProposalId: "rejected-definition",
        countryCode: "IT",
        displayCode: "Corrected",
      }),
    );
  });

  it("programmatically associates validation errors with invalid fields", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        if (String(input).includes("named-face-values?")) {
          return Response.json({ namedFaceValues: [] });
        }
        if (init?.method === "POST") {
          return Response.json(
            {
              error: "Correct the proposal fields.",
              errors: { displayCode: "Enter a display name or code." },
            },
            { status: 400 },
          );
        }
        return Response.json({ definitions: [], values: [] });
      }),
    );
    render(
      <NamedFaceValueProposals
        activeCountryCode="IT"
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Submit proposal" }));

    const field = screen.getByLabelText("Proposed display name or code");
    await waitFor(() => expect(field.getAttribute("aria-invalid")).toBe("true"));
    expect(field.getAttribute("aria-describedby")).toBe(
      "proposal-display-code-error",
    );
    expect(screen.getByText("Enter a display name or code.").id).toBe(
      "proposal-display-code-error",
    );
  });

  it("keeps the correction target when the proposed country changes", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("named-face-values?")) {
          return Response.json({
            namedFaceValues: url.includes("countryCode=IT")
              ? [
                  {
                    id: "italy-zone-one",
                    countryCode: "IT",
                    displayCode: "B Zona 1",
                  },
                ]
              : [],
          });
        }
        return Response.json({ definitions: [], values: [] });
      }),
    );
    render(
      <NamedFaceValueProposals
        activeCountryCode="IT"
        countries={[
          { value: "IT", label: "Italy" },
          { value: "CH", label: "Switzerland" },
        ]}
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
      />,
    );

    const target = screen.getByLabelText(
      "Definition to correct (optional)",
    ) as HTMLSelectElement;
    await waitFor(() => expect(target.options).toHaveLength(2));
    await user.selectOptions(target, "approved:italy-zone-one");
    await user.selectOptions(screen.getByLabelText("Proposed country"), "CH");

    expect(target.value).toBe("approved:italy-zone-one");
    expect(
      (screen.getByLabelText("Existing definition country") as HTMLSelectElement)
        .value,
    ).toBe("IT");
  });

  it("keeps a successful submission status when the list refresh fails", async () => {
    const user = userEvent.setup();
    let proposalListRequests = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("named-face-values?")) {
        return Response.json({ namedFaceValues: [] });
      }
      if (init?.method === "POST") {
        return Response.json(
          { proposal: { id: "submitted-proposal" } },
          { status: 201 },
        );
      }
      proposalListRequests += 1;
      if (proposalListRequests > 1) {
        throw new Error("refresh failed");
      }
      return Response.json({ definitions: [], values: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <NamedFaceValueProposals
        activeCountryCode="IT"
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
      />,
    );

    await user.type(
      screen.getByLabelText("Proposed display name or code"),
      "B Zona 2",
    );
    await user.type(screen.getByLabelText("Proposed normalized code"), "b zona 2");
    await user.selectOptions(screen.getByLabelText("Schedule currency"), "EUR");
    await user.type(screen.getByLabelText("Source note"), "Published tariff");
    await user.click(screen.getByRole("button", { name: "Submit proposal" }));

    expect(
      await screen.findByText("Proposal submitted with PENDING status."),
    ).toBeTruthy();
    expect(
      await screen.findByText(
        "Proposal submitted, but the status list could not be refreshed.",
      ),
    ).toBeTruthy();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  });
});
