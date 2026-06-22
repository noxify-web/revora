import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";

declare module "react" {
  // biome-ignore lint/style/noNamespace: JSX intrinsic augmentation requires the React JSX namespace
  namespace JSX {
    interface IntrinsicElements {
      "s-app-nav": HTMLAttributes<HTMLElement> & {
        children?: ReactNode;
      };
      "s-link": AnchorHTMLAttributes<HTMLAnchorElement> & {
        children?: ReactNode;
      };
      "ui-nav-menu": HTMLAttributes<HTMLElement> & {
        children?: ReactNode;
      };
    }
  }
}
