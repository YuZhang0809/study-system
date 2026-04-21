import { PlaceholderPane } from "@/components/shell/PlaceholderPane";
import { surfaceById } from "@/lib/surfaces";

export default function KnowledgePage() {
  return <PlaceholderPane title={surfaceById("knowledge").label} />;
}
