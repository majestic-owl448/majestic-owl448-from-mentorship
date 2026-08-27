import { validateNewMonetaryStamp } from "@/lib/stampValidation";

const validStamp = {
  countryCode: "IT",
  postalEntityId: "italy-post",
  name: "Definitive stamp",
  yearOfIssue: "",
  faceAmount: "0.25",
  faceCurrencyCode: "EUR",
  manualPostageAmount: "",
  manualPostageCurrencyCode: "",
  quantityOwned: "2",
  quantityAnnulled: "1",
  expired: false,
};

describe("monetary stamp validation", () => {
  it("accepts an absent year and exact decimal strings", () => {
    expect(validateNewMonetaryStamp(validStamp)).toEqual({
      data: {
        countryCode: "IT",
        postalEntityId: "italy-post",
        name: "Definitive stamp",
        yearOfIssue: null,
        faceAmount: "0.25",
        faceCurrencyCode: "EUR",
        manualPostageAmount: null,
        manualPostageCurrencyCode: null,
        quantityOwned: 2,
        quantityAnnulled: 1,
        expired: false,
      },
    });
  });

  it.each(["1.2.3", "-1", "1e3", "", ".5"])(
    "rejects the invalid face decimal %s",
    (faceAmount) => {
      expect(
        validateNewMonetaryStamp({ ...validStamp, faceAmount }),
      ).toMatchObject({
        errors: { faceAmount: "Enter a non-negative decimal amount." },
      });
    },
  );

  it.each(["0", "-1", "1.5", ""])(
    "rejects the non-positive whole owned quantity %s",
    (quantityOwned) => {
      expect(
        validateNewMonetaryStamp({ ...validStamp, quantityOwned }),
      ).toMatchObject({
        errors: {
          quantityOwned: "Enter a whole owned quantity greater than zero.",
        },
      });
    },
  );

  it("requires a country even when face and display currencies can match", () => {
    expect(
      validateNewMonetaryStamp({ ...validStamp, countryCode: "" }),
    ).toMatchObject({
      errors: { countryCode: "Select a valid ISO 3166-1 country." },
    });
  });

  it("requires a postal entity reference", () => {
    expect(
      validateNewMonetaryStamp({ ...validStamp, postalEntityId: "" }),
    ).toMatchObject({
      errors: { postalEntityId: "Select a postal entity." },
    });
  });

  it("requires manual fallback fields as a pair", () => {
    expect(
      validateNewMonetaryStamp({
        ...validStamp,
        manualPostageAmount: "0.30",
      }),
    ).toMatchObject({
      errors: {
        manualPostageCurrencyCode: "Select the manual postage currency.",
      },
    });
  });
});
