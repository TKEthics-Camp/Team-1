import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// A back arrow that always goes somewhere. History back is right whenever
// there is somewhere in this app to go back to — but a screen opened
// directly (an iPhone reminder tap, a reload, a shared link) is the first
// entry in history, and going back from there leaves the app or does
// nothing. React Router marks that first entry with the key "default".
export function useBack(fallback = "/") {
  const navigate = useNavigate();
  const location = useLocation();
  const isFirst = location.key === "default";
  return useCallback(() => {
    if (isFirst) navigate(fallback, { replace: true });
    else navigate(-1);
  }, [navigate, isFirst, fallback]);
}
