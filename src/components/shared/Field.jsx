import { useId } from "react";

// A labelled group. The label is tied to its contents with
// aria-labelledby, so a screen reader announces "Date, group" on the way
// in, rather than reading a stray word and then an unnamed control. A
// <label> wrapper would do it for a single input but breaks a row of chips,
// where tapping the label would press the first chip.
export default function Field({ label, children }) {
  const id = useId();
  return (
    <div className="field" role="group" aria-labelledby={id}>
      <span className="label" id={id}>{label}</span>
      {children}
    </div>
  );
}
