import { getDocuments } from "@/features/documents/actions";
import { DocumentList } from "@/features/documents/components/document-list";

export default async function DocumentsPage() {
  const documents = await getDocuments();
  return <DocumentList documents={documents} />;
}
