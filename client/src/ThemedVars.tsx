import { type PropsWithChildren, useMemo } from "react";
import { theme as antdTheme } from "antd";

export function ThemedVars({ children }: PropsWithChildren) {
  const { token } = antdTheme.useToken();

  const style = useMemo(
    () =>
      ({
        ["--app-colorBgBase"]: token.colorBgBase,
        ["--app-colorBgLayout"]: token.colorBgLayout,
        ["--app-colorBgContainer"]: token.colorBgContainer,
        ["--app-colorBgElevated"]: token.colorBgElevated,

        // Text
        ["--app-colorText"]: token.colorText,
        ["--app-colorTextSecondary"]: token.colorTextSecondary,
        ["--app-colorTextOnPrimary"]: token.colorTextLightSolid,

        // Links / Borders / Primary
        ["--app-colorLink"]: token.colorLink,
        ["--app-colorLinkHover"]: token.colorLinkHover,
        ["--app-colorLinkActive"]: token.colorLinkActive,
        ["--app-colorBorder"]: token.colorBorder,
        ["--app-colorPrimary"]: token.colorPrimary,

        ["--app-fontFamily"]: token.fontFamily,
      } as React.CSSProperties),
    [token]
  );

  return <div style={style}>{children}</div>;
}
