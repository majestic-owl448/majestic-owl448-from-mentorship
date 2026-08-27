import combRep from "@/lib/combRep";

describe("combRep", () => {
  it("uses the input length when no combination length is provided", () => {
    expect(combRep(["a", "b"])).toEqual([
      ["a", "a"],
      ["a", "b"],
      ["b", "b"],
    ]);
  });

  it("returns combinations with repetition for an explicit length", () => {
    expect(combRep([1, 2, 3], 2)).toEqual([
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 2],
      [2, 3],
      [3, 3],
    ]);
  });
});
