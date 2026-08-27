// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach } from "vitest";
import {
  StampInventory,
  type InventoryResponse,
} from "@/app/components/stampInventory";

const inventory: InventoryResponse = {
  activeCountryCode: "IT",
  displayCurrencyCode: "EUR",
  inventoryTotal: { amount: "1", currencyCode: "EUR" },
  stamps: [
    {
      id: "removable",
      countryCode: "IT",
      postalEntityId: "italy-post",
      postalEntity: {
        id: "italy-post",
        name: "Poste Italiane",
        countryCode: "IT",
      },
      name: "Stamp removable",
      yearOfIssue: null,
      faceValueType: "MONETARY",
      faceAmount: "1",
      faceCurrencyCode: "EUR",
      namedFaceValueId: null,
      namedFaceValue: null,
      manualPostageAmount: null,
      manualPostageCurrencyCode: null,
      quantityOwned: 1,
      quantityAnnulled: 0,
      usableQuantity: 1,
      expired: false,
      unitPostageValue: {
        amount: "1",
        currencyCode: "EUR",
        source: "FACE_AMOUNT",
      },
      totalPostageValue: { amount: "1", currencyCode: "EUR" },
      valuation: { status: "RESOLVED", source: "FACE_AMOUNT" },
      createdAt: "2026-08-27T12:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
      this.querySelector<HTMLButtonElement>("button")?.focus();
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
    },
  });
  vi.stubGlobal(
    "requestAnimationFrame",
    (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("cancels and confirms removal with the keyboard and restores focus", async () => {
  const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
    if (init?.method === "DELETE") {
      return Response.json({
        deletedStampId: "removable",
        inventoryTotal: { amount: "0", currencyCode: "EUR" },
      });
    }
    return Response.json(inventory);
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  const { container } = render(
    <StampInventory
      activeCountryCode="IT"
      activeDisplayCurrencyCode="EUR"
      activePostalEntityId="italy-post"
      countries={[{ value: "IT", label: "Italy" }]}
      currencies={[{ value: "EUR", label: "Euro" }]}
      postalEntities={[
        { id: "italy-post", name: "Poste Italiane", countryCode: "IT" },
      ]}
    />,
  );
  const removeButton = await screen.findByRole("button", {
    name: "Remove stamp",
  });

  removeButton.focus();
  await user.keyboard("{Enter}");
  const dialog = screen.getByRole("dialog");
  const cancelButton = within(dialog).getByRole("button", { name: "Cancel" });
  expect(dialog.open).toBe(true);
  expect(document.activeElement).toBe(cancelButton);

  await user.keyboard("{Enter}");
  expect(dialog.open).toBe(false);
  expect(document.activeElement).toBe(removeButton);
  expect(screen.getByRole("heading", { name: "Stamp removable" })).toBeTruthy();

  await user.keyboard("{Enter}");
  await user.tab();
  const confirmButton = within(dialog).getByRole("button", {
    name: "Confirm removal",
  });
  expect(document.activeElement).toBe(confirmButton);
  await user.keyboard("{Enter}");

  await waitFor(() => {
    expect(
      screen.queryByRole("heading", { name: "Stamp removable" }),
    ).toBeNull();
  });
  expect(fetchMock).toHaveBeenCalledWith("/api/stamps/removable", {
    method: "DELETE",
  });
  expect(screen.getByText("No stamps have been added yet.")).toBeTruthy();
  expect(document.activeElement).toBe(
    container.querySelector<HTMLElement>('[tabindex="-1"]'),
  );
});
