import { NextRequest, NextResponse } from "next/server";
import { withModerator } from "@/lib/moderatorAuth";
import {
  listModerationProposals,
  moderationProposalStatuses,
  moderationProposalTypes,
  type ModerationProposalStatus,
  type ModerationProposalType,
} from "@/lib/moderationProposals";

function selectedFilter<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | null | undefined {
  if (value === null || value === "ALL") return null;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export async function GET(request: NextRequest) {
  return withModerator(request, async () => {
    const proposalType = selectedFilter(
      request.nextUrl.searchParams.get("type"),
      moderationProposalTypes,
    );
    const status = selectedFilter(
      request.nextUrl.searchParams.get("status"),
      moderationProposalStatuses,
    );
    if (proposalType === undefined || status === undefined) {
      return NextResponse.json(
        { error: "Select a valid proposal type and status." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      proposals: await listModerationProposals({
        proposalType: proposalType as ModerationProposalType | null,
        status: status as ModerationProposalStatus | null,
      }),
    });
  });
}
