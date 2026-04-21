import { PlaceholderPane } from "@/components/shell/PlaceholderPane";
import { surfaceById } from "@/lib/surfaces";

export default function RetrosPage() {
  return <PlaceholderPane title={surfaceById("retros").label} />;
}
