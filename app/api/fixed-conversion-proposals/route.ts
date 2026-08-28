import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import {
  createCurrencyConversionProposal,
  CurrencyConversionProposalCurrencyError,
  CurrencyConversionProposalTargetError,
  listCurrencyConversionProposalWorkflow,
} from "@/lib/currencyConversionProposals";
import { validateCurrencyConversionProposal } from "@/lib/currencyConversionProposalValidation";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
    await getProfile();
    return NextResponse.json(
      await listCurrencyConversionProposalWorkflow(userId),
    );
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
    const validation = validateCurrencyConversionProposal(body);
    if (validation.errors) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }
    await getProfile();

    try {
      const proposal = await createCurrencyConversionProposal(
        userId,
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
          { errors: { [caught.field]: caught.message } },
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
