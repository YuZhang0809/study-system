import { PlaceholderPane } from "@/components/shell/PlaceholderPane";
import { surfaceById } from "@/lib/surfaces";

export default function PlanPage() {
  return <PlaceholderPane title={surfaceById("plan").label} />;
}
