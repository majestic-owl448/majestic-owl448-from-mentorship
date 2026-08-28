import { ModerationProposalDetail } from "@/app/components/moderationProposalDetail";
import { SessionAuthForNextJS } from "@/app/components/sessionAuthForNextJS";

export default async function ModerationProposalPage({
  params,
}: {
  params: Promise<{ proposalType: string; proposalId: string }>;
}) {
  const { proposalType, proposalId } = await params;
  return (
    <SessionAuthForNextJS>
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-16 sm:px-16 sm:py-24">
        <ModerationProposalDetail
          proposalType={proposalType}
          proposalId={proposalId}
        />
      </main>
    </SessionAuthForNextJS>
  );
}
