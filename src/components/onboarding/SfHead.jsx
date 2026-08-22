import Mascot from "../shared/Mascot";

// Mascot + title header used on every start-flow step after Welcome.
export default function SfHead({ children }) {
  return (
    <div className="sf-head">
      <Mascot size={54} className="sf-mascot" />
      <h2>{children}</h2>
    </div>
  );
}
