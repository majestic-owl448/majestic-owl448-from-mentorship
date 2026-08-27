import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  createCurrencyConversionProposal,
  CurrencyConversionProposalCurrencyError,
  CurrencyConversionProposalTargetError,
  listCurrencyConversionProposalWorkflow,
} from "@/lib/currencyConversionProposals";
import { validateCurrencyConversionProposal } from "@/lib/currencyConversionProposalValidation";
import { upsertUserProfile } from "@/lib/userProfile";

ensureSuperTokensInit();

function authenticationRequired() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

async function authenticatedUserId(session: { getUserId(): string }) {
  const userId = session.getUserId();
  const user = await supertokens.getUser(userId);
  await upsertUserProfile(userId, user?.emails[0] ?? null);
  return userId;
}

export async function GET(request: NextRequest) {
  return withSession(request, async (error, session) => {
    if (error) {
      return NextResponse.json(error, { status: 500 });
    }
    if (!session) {
      return authenticationRequired();
    }

    return NextResponse.json(
      await listCurrencyConversionProposalWorkflow(
        await authenticatedUserId(session),
      ),
    );
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
    const validation = validateCurrencyConversionProposal(body);
    if (validation.errors) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    try {
      const proposal = await createCurrencyConversionProposal(
        await authenticatedUserId(session),
        validation.data,
      );
      return NextResponse.json(
        {
          proposal: {
            ...proposal,
            createdAt: proposal.createdAt.toISOString(),
          },
        },
        { status: 201 },
      );
    } catch (caught) {
      if (caught instanceof CurrencyConversionProposalTargetError) {
        return NextResponse.json(
          { errors: { targetCurrencyConversionId: caught.message } },
          { status: 400 },
        );
      }
      if (caught instanceof CurrencyConversionProposalCurrencyError) {
        return NextResponse.json(
          { errors: { [caught.field]: caught.message } },
          { status: 400 },
        );
      }
      throw caught;
    }
  });
}
