import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import {
  createDefinitionProposal,
  createValueProposal,
  listUserNamedFaceValueProposals,
  ProposalTargetError,
} from "@/lib/namedFaceValueProposals";
import {
  type ValueProposalInput,
  validateNamedFaceValueProposal,
} from "@/lib/namedFaceValueProposalValidation";
import {
  localDateInTimeZone,
  PostalEntitySettingRequiredError,
  requireActivePostalEntitySetting,
} from "@/lib/postalEntitySettings";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
    await getProfile();
    return NextResponse.json(await listUserNamedFaceValueProposals(userId));
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }
    const validation = validateNamedFaceValueProposal(body);
    if (validation.errors) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }
    const profile = await getProfile();

    try {
      const proposal =
        validation.data.proposalType === "DEFINITION"
          ? await createDefinitionProposal(userId, validation.data)
          : await (async (valueInput: ValueProposalInput) => {
              await requireActivePostalEntitySetting(userId);
              return createValueProposal(
                userId,
                valueInput,
                localDateInTimeZone(profile.timeZone),
              );
            })(validation.data);
      return NextResponse.json(
        {
          proposal: {
            ...proposal,
            proposalType: validation.data.proposalType,
            createdAt: proposal.createdAt.toISOString(),
          },
        },
        { status: 201 },
      );
    } catch (caught) {
      if (caught instanceof ProposalTargetError) {
        return NextResponse.json(
          { errors: { [caught.field]: caught.message } },
          { status: 400 },
        );
      }
      if (caught instanceof PostalEntitySettingRequiredError) {
        return NextResponse.json(
          { error: caught.message, settingsUrl: "/dashboard" },
          { status: 409 },
        );
      }
      throw caught;
    }
  });
}
