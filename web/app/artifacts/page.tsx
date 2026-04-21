import { PlaceholderPane } from "@/components/shell/PlaceholderPane";
import { surfaceById } from "@/lib/surfaces";

export default function ArtifactsPage() {
  return <PlaceholderPane title={surfaceById("artifacts").label} />;
}
