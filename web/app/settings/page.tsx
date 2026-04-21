import { PlaceholderPane } from "@/components/shell/PlaceholderPane";
import { surfaceById } from "@/lib/surfaces";

export default function SettingsPage() {
  return <PlaceholderPane title={surfaceById("settings").label} />;
}
