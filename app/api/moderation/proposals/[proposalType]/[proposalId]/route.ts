import { NextRequest, NextResponse } from "next/server";
import { withModerator } from "@/lib/moderatorAuth";
import {
  getModerationProposalDetail,
  moderationProposalTypes,
  type ModerationProposalType,
} from "@/lib/moderationProposals";
import {
  ApprovalInputError,
  ApprovalTargetError,
  ProposalAlreadyDecidedError,
  ProposalNotFoundError,
  approveModerationProposal,
  validateDecisionNote,
} from "@/lib/moderationApproval";
import {
  MergeInputError,
  MergeTargetError,
  mergeModerationProposal,
  validateMergeTargetId,
} from "@/lib/moderationMerge";
import {
  PostalEntityCorrectionError,
  approvePostalEntity,
  mergePostalEntity,
  rejectPostalEntity,
} from "@/lib/postalEntityModeration";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ proposalType: string; proposalId: string }>;
  },
) {
  return withModerator(request, async () => {
    const { proposalType, proposalId } = await context.params;
    if (!moderationProposalTypes.includes(proposalType as ModerationProposalType)) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const proposal = await getModerationProposalDetail(
      proposalType as ModerationProposalType,
      proposalId,
    );
    return proposal
      ? NextResponse.json({ proposal })
      : NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  });
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ proposalType: string; proposalId: string }>;
  },
) {
  return withModerator(request, async (moderatorId) => {
    const { proposalType, proposalId } = await context.params;
    if (!moderationProposalTypes.includes(proposalType as ModerationProposalType)) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Enter a decision note." },
        { status: 400 },
      );
    }

    try {
      const input = body as {
        action?: unknown;
        decisionNote?: unknown;
        targetId?: unknown;
        correctedValues?: unknown;
      } | null;
      const decisionNote = validateDecisionNote(
        input?.decisionNote,
      );
      const action = input?.action ?? "APPROVE";
      if (proposalType === "POSTAL_ENTITY" && action === "APPROVE") {
        await approvePostalEntity(
          proposalId,
          moderatorId,
          decisionNote,
          input?.correctedValues,
        );
      } else if (proposalType === "POSTAL_ENTITY" && action === "MERGE") {
        await mergePostalEntity(
          proposalId,
          validateMergeTargetId(input?.targetId),
          moderatorId,
          decisionNote,
        );
      } else if (proposalType === "POSTAL_ENTITY" && action === "REJECT") {
        await rejectPostalEntity(
          proposalId,
          moderatorId,
          decisionNote,
        );
      } else if (action === "APPROVE") {
        await approveModerationProposal(
          proposalType as ModerationProposalType,
          proposalId,
          moderatorId,
          decisionNote,
        );
      } else if (action === "MERGE") {
        await mergeModerationProposal(
          proposalType as ModerationProposalType,
          proposalId,
          validateMergeTargetId(input?.targetId),
          moderatorId,
          decisionNote,
        );
      } else {
        throw new MergeInputError("Select a valid moderation action.");
      }
      const proposal = await getModerationProposalDetail(
        proposalType as ModerationProposalType,
        proposalId,
      );
      return NextResponse.json({ proposal });
    } catch (caught) {
      if (
        caught instanceof ApprovalInputError ||
        caught instanceof MergeInputError
      ) {
        return NextResponse.json({ error: caught.message }, { status: 400 });
      }
      if (caught instanceof PostalEntityCorrectionError) {
        return NextResponse.json(
          { error: caught.message, errors: caught.errors },
          { status: 400 },
        );
      }
      if (caught instanceof ProposalNotFoundError) {
        return NextResponse.json({ error: caught.message }, { status: 404 });
      }
      if (
        caught instanceof ProposalAlreadyDecidedError ||
        caught instanceof ApprovalTargetError ||
        caught instanceof MergeTargetError
      ) {
        return NextResponse.json({ error: caught.message }, { status: 409 });
      }
      throw caught;
    }
  });
}
