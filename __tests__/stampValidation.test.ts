import { validateNewStamp } from "@/lib/stampValidation";

const validStamp = {
  countryCode: "IT",
  postalEntityId: "italy-post",
  name: "Definitive stamp",
  yearOfIssue: "",
  faceValueType: "MONETARY",
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
    expect(validateNewStamp(validStamp)).toEqual({
      data: {
        countryCode: "IT",
        postalEntityId: "italy-post",
        name: "Definitive stamp",
        yearOfIssue: null,
        faceValueType: "MONETARY",
        faceAmount: "0.25",
        faceCurrencyCode: "EUR",
        namedFaceValueId: null,
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
        validateNewStamp({ ...validStamp, faceAmount }),
      ).toMatchObject({
        errors: { faceAmount: "Enter a non-negative decimal amount." },
      });
    },
  );

  it.each(["0", "-1", "1.5", ""])(
    "rejects the non-positive whole owned quantity %s",
    (quantityOwned) => {
      expect(
        validateNewStamp({ ...validStamp, quantityOwned }),
      ).toMatchObject({
        errors: {
          quantityOwned: "Enter an owned quantity from 1 to 2,147,483,647.",
        },
      });
    },
  );

  it("rejects quantities outside the database integer range", () => {
    expect(
      validateNewStamp({
        ...validStamp,
        quantityOwned: "2147483648",
        quantityAnnulled: "2147483648",
      }),
    ).toMatchObject({
      errors: {
        quantityOwned: "Enter an owned quantity from 1 to 2,147,483,647.",
        quantityAnnulled:
          "Enter an annulled quantity from 0 to 2,147,483,647.",
      },
    });
  });

  it("requires a country even when face and display currencies can match", () => {
    expect(
      validateNewStamp({ ...validStamp, countryCode: "" }),
    ).toMatchObject({
      errors: { countryCode: "Select a valid ISO 3166-1 country." },
    });
  });

  it("requires a postal entity reference", () => {
    expect(
      validateNewStamp({ ...validStamp, postalEntityId: "" }),
    ).toMatchObject({
      errors: { postalEntityId: "Select a postal entity." },
    });
  });

  it("requires manual fallback fields as a pair", () => {
    expect(
      validateNewStamp({
        ...validStamp,
        manualPostageAmount: "0.30",
      }),
    ).toMatchObject({
      errors: {
        manualPostageCurrencyCode: "Select the manual postage currency.",
      },
    });
  });

  it("accepts zero as the manual value for a stamp without a face value", () => {
    expect(
      validateNewStamp({
        ...validStamp,
        faceValueType: "NONE",
        faceAmount: "",
        faceCurrencyCode: "",
        manualPostageAmount: "0",
        manualPostageCurrencyCode: "EUR",
      }),
    ).toMatchObject({
      data: {
        faceValueType: "NONE",
        faceAmount: null,
        faceCurrencyCode: null,
        namedFaceValueId: null,
        manualPostageAmount: "0",
        manualPostageCurrencyCode: "EUR",
      },
    });
  });

  it("requires a manual amount and currency when no face value exists", () => {
    expect(
      validateNewStamp({
        ...validStamp,
        faceValueType: "NONE",
        faceAmount: "",
        faceCurrencyCode: "",
      }),
    ).toMatchObject({
      errors: {
        manualPostageAmount: "Enter the manual postage amount.",
        manualPostageCurrencyCode: "Select the manual postage currency.",
      },
    });
  });

  it("rejects a negative manual value", () => {
    expect(
      validateNewStamp({
        ...validStamp,
        faceValueType: "NONE",
        faceAmount: "",
        faceCurrencyCode: "",
        manualPostageAmount: "-0.01",
        manualPostageCurrencyCode: "EUR",
      }),
    ).toMatchObject({
      errors: {
        manualPostageAmount: "Enter a non-negative decimal amount.",
      },
    });
  });

  it("rejects face-value fields when no face value exists", () => {
    expect(
      validateNewStamp({
        ...validStamp,
        faceValueType: "NONE",
        namedFaceValueId: "italy-b-zone-one",
        manualPostageAmount: "1",
        manualPostageCurrencyCode: "EUR",
      }),
    ).toMatchObject({
      errors: {
        faceAmount: "Do not enter an amount for a stamp without a face value.",
        faceCurrencyCode:
          "Do not enter a currency for a stamp without a face value.",
        namedFaceValueId:
          "Do not select a named face value for a stamp without a face value.",
      },
    });
  });

  it("accepts a named face value reference without copied monetary fields", () => {
    expect(
      validateNewStamp({
        ...validStamp,
        faceValueType: "NAMED",
        faceAmount: "",
        faceCurrencyCode: "",
        namedFaceValueId: "italy-b-zone-one",
      }),
    ).toMatchObject({
      data: {
        faceValueType: "NAMED",
        faceAmount: null,
        faceCurrencyCode: null,
        namedFaceValueId: "italy-b-zone-one",
      },
    });
  });

  it("rejects missing and mixed named face value fields", () => {
    expect(
      validateNewStamp({
        ...validStamp,
        faceValueType: "NAMED",
        namedFaceValueId: "",
      }),
    ).toMatchObject({
      errors: {
        faceAmount: "Do not enter an amount for a named stamp.",
        faceCurrencyCode: "Do not enter a currency for a named stamp.",
        namedFaceValueId: "Select a named face value.",
      },
    });
  });
});
