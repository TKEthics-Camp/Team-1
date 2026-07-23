import { PALETTE } from "../../lib/constants";
import PersonAvatar from "../shared/PersonAvatar";

// A classmate's face — a cartoon person tinted by their colour. (No orbs.)
export default function Avatar({ student, size }) {
  return <PersonAvatar color={PALETTE[student.color]} size={size} />;
}
