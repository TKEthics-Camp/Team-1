// Inline styles here pass values to CSS through custom properties
// (style={{ "--c": color }}), which React supports but its types don't list.
import "react";

declare module "react" {
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined;
  }
}
