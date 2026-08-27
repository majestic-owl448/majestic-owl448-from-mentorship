import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
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
import { upsertUserProfile } from "@/lib/userProfile";

ensureSuperTokensInit();

async function authenticatedUserId(session: { getUserId(): string }) {
  const userId = session.getUserId();
  const user = await supertokens.getUser(userId);
  await upsertUserProfile(userId, user?.emails[0] ?? null);
  return userId;
}

function authenticationRequired() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  return withSession(request, async (error, session) => {
    if (error) {
      return NextResponse.json(error, { status: 500 });
    }
    if (!session) {
      return authenticationRequired();
    }

    const userId = await authenticatedUserId(session);
    return NextResponse.json(await listUserNamedFaceValueProposals(userId));
  });
}

export async function POST(request: NextRequest) {
  return withSession(request, async (error, session) => {
    if (error) {
      return NextResponse.json(error, { status: 500 });
    }
    if (!session) {
      return authenticationRequired();
    }

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

    try {
      const userId = await authenticatedUserId(session);
      const proposal =
        validation.data.proposalType === "DEFINITION"
          ? await createDefinitionProposal(userId, validation.data)
          : await (async (valueInput: ValueProposalInput) => {
              const activeSetting =
                await requireActivePostalEntitySetting(userId);
              return createValueProposal(
                userId,
                valueInput,
                localDateInTimeZone(activeSetting.timeZone),
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
