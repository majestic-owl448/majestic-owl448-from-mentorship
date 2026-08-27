// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
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
});
