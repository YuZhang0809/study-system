import { PlaceholderPane } from "@/components/shell/PlaceholderPane";
import { surfaceById } from "@/lib/surfaces";

export default function TodayPage() {
  return <PlaceholderPane title={surfaceById("today").label} />;
}
