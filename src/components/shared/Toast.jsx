import { useUI } from "../../ui/UIContext";

// A brief, actionless confirmation — the coin reward for logging. Sits above
// UndoToast rather than replacing it: that one holds a delete open and can't
// be evicted by a reward note firing at the same moment.
export default function Toast() {
  const { toast } = useUI();
  if (!toast) return null;

  // keyed on the toast id so an identical message twice in a row still
  // replays the entrance instead of sitting there unchanged
  return (
    <div className="coin-toast" role="status" key={toast.id}>
      {toast.message}
    </div>
  );
}
