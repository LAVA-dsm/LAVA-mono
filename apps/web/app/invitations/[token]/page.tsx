import { InvitationResponse } from "@/components/project/invitation-response";

type InvitationPageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;
  return <InvitationResponse token={token} />;
}
