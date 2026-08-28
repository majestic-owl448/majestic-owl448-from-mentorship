import { NextRequest, NextResponse } from "next/server";
import { withModerator } from "@/lib/moderatorAuth";
import {
  getModerationProposalDetail,
  moderationProposalTypes,
  type ModerationProposalType,
} from "@/lib/moderationProposals";

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
