import sprig from "../../assets/sprig.png";

// Mascot + title header used on every start-flow step after Welcome.
// The mascot sits where a nav-bar icon would in the Figma, which is why
// these screens don't carry an app title of their own.
export default function SfHead({ children }) {
  return (
    <div className="sf-head">
      <img className="sf-mascot" src={sprig} alt="" />
      <h2>{children}</h2>
    </div>
  );
}
