import { useUI } from "../../ui/UIContext";
import EntrySheet from "./EntrySheet";
import PhotoSheet from "./PhotoSheet";
import OrbSheet from "./OrbSheet";
import StudentSheet from "./StudentSheet";
import UserProfileSheet from "./UserProfileSheet";
import IdeaSheet from "./IdeaSheet";
import JoinClassSheet from "./JoinClassSheet";
import AvatarSheet from "./AvatarSheet";
import YearReviewSheet from "./YearReviewSheet";
import MemoriesSheet from "./MemoriesSheet";
import UsernameSheet from "./UsernameSheet";

export default function SheetHost() {
  const { sheet } = useUI();
  if (!sheet) return null;
  if (sheet.type === "entry") return <EntrySheet interestId={sheet.id} />;
  if (sheet.type === "photo") return <PhotoSheet interestId={sheet.id} />;
  if (sheet.type === "orb") return <OrbSheet key={sheet.id || "new"} interestId={sheet.id} preset={sheet.preset} />;
  if (sheet.type === "student") return <StudentSheet student={sheet.student} />;
  if (sheet.type === "userProfile") {
    return <UserProfileSheet userId={sheet.userId} displayName={sheet.displayName} accountType={sheet.accountType} />;
  }
  if (sheet.type === "idea") return <IdeaSheet idea={sheet.idea} />;
  if (sheet.type === "joinClass") return <JoinClassSheet />;
  if (sheet.type === "avatar") return <AvatarSheet />;
  if (sheet.type === "yearReview") return <YearReviewSheet />;
  if (sheet.type === "memories") return <MemoriesSheet />;
  if (sheet.type === "username") return <UsernameSheet />;
  return null;
}
