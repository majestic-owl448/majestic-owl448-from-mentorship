// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  StampInventoryResults,
  type InventoryResponse,
} from "@/app/components/stampInventory";

const inventory: InventoryResponse = {
  activeCountryCode: "IT",
  displayCurrencyCode: "EUR",
  inventoryTotal: { amount: "0", currencyCode: "EUR" },
  stamps: [
    {
      id: "action-stamp",
      countryCode: "IT",
      postalEntityId: "italy-post",
      postalEntity: {
        id: "italy-post",
        name: "Poste Italiane",
        countryCode: "IT",
      },
      name: "Rejected named stamp",
      yearOfIssue: null,
      faceValueType: "NAMED",
      faceAmount: null,
      faceCurrencyCode: null,
      namedFaceValueId: null,
      namedFaceValueProposalId: "rejected-definition",
      namedFaceValue: {
        id: "rejected-definition",
        countryCode: "IT",
        displayCode: "Rejected",
        proposalStatus: "REJECTED",
      },
      upcomingNamedFaceValue: null,
      manualPostageAmount: null,
      manualPostageCurrencyCode: null,
      quantityOwned: 1,
      quantityAnnulled: 0,
      usableQuantity: 1,
      expired: false,
      actionRequired: true,
      proposalActions: [
        {
          proposalType: "NAMED_DEFINITION",
          proposalId: "rejected-definition",
        },
      ],
      availableFallback: null,
      unitPostageValue: null,
      totalPostageValue: null,
      valuation: { status: "ACTION_REQUIRED", source: null },
      createdAt: "2026-08-28T10:00:00.000Z",
    },
  ],
};

describe("rejected proposal replacement controls", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("searches beyond the initial replacement result window", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input), "http://localhost");
      const query = url.searchParams.get("query");
      return Response.json({
        namedFaceValues:
          query === "Zona 9"
            ? [
                {
                  id: "approved-zona-9",
                  countryCode: "IT",
                  displayCode: "B Zona 9",
                },
              ]
            : [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <StampInventoryResults
        inventory={inventory}
        onStampUpdated={() => undefined}
      />,
    );

    await user.type(
      screen.getByLabelText("Search eligible named/code replacements"),
      "Zona 9",
    );

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "Use B Zona 9" }),
      ).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/named-face-values?countryCode=IT&query=Zona+9",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
