import { DocumentEditor } from "@/components/project/document-editor";

type DocumentPageProps = {
  params: Promise<{ id: string; type: string }>;
};

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id, type } = await params;
  return <DocumentEditor projectId={id} documentType={type} />;
}
