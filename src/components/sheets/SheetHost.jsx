import { useUI } from "../../ui/UIContext";
import EntrySheet from "./EntrySheet";
import PhotoSheet from "./PhotoSheet";
import OrbSheet from "./OrbSheet";
import StudentSheet from "./StudentSheet";
import IdeaSheet from "./IdeaSheet";

export default function SheetHost() {
  const { sheet } = useUI();
  if (!sheet) return null;
  if (sheet.type === "entry") return <EntrySheet interestId={sheet.id} />;
  if (sheet.type === "photo") return <PhotoSheet interestId={sheet.id} />;
  if (sheet.type === "orb") return <OrbSheet interestId={sheet.id} preset={sheet.preset} />;
  if (sheet.type === "student") return <StudentSheet student={sheet.student} />;
  if (sheet.type === "idea") return <IdeaSheet idea={sheet.idea} />;
  return null;
}
