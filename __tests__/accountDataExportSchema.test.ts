import { prisma } from "@/lib/db";
import { USER_LINKED_MODEL_POLICY } from "@/lib/accountDataExport";

type RuntimeField = { name: string; kind: string; type: string };
type RuntimeModel = { fields: RuntimeField[] };

describe("account export schema coverage", () => {
  it("maps every scalar field on every directly user-linked model", () => {
    const runtimeDataModel = (
      prisma as unknown as { _runtimeDataModel: { models: Record<string, RuntimeModel> } }
    )._runtimeDataModel;
    const models = Object.entries(runtimeDataModel.models).map(([name, model]) => ({
      name,
      ...model,
    }));
    const directlyLinked = models.filter(
      (model) =>
        model.name === "UserProfile" ||
        model.fields.some(
          (field) => field.kind !== "object" && field.name === "userId",
        ) ||
        model.fields.some(
          (field) => field.kind === "object" && field.type === "UserProfile",
        ),
    );

    expect(directlyLinked.map((model) => model.name).sort()).toEqual(
      Object.keys(USER_LINKED_MODEL_POLICY).sort(),
    );

    for (const model of directlyLinked) {
      const policy = USER_LINKED_MODEL_POLICY[
        model.name as keyof typeof USER_LINKED_MODEL_POLICY
      ];
      const covered = [...policy.exportedFields, ...policy.secretFields].sort();
      const scalarFields = model.fields
        .filter((field) => field.kind !== "object")
        .map((field) => field.name)
        .sort();

      expect(covered, `${model.name} has an unmapped field`).toEqual(scalarFields);
    }
  });

  it("does not classify an excluded secret field as exported", () => {
    for (const policy of Object.values(USER_LINKED_MODEL_POLICY)) {
      expect(
        policy.exportedFields.filter((field) =>
          policy.secretFields.includes(field as never),
        ),
      ).toEqual([]);
    }
  });
});
