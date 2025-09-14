
import { theme } from "antd";

export default function GlobalScrollbar() {
  const { token } = theme.useToken();

  const css = `
  :root{
    --scroll-size: 10px;
    --scroll-radius: 8px;
    --scroll-track-global: ${token.colorBgBase};
    --scroll-track-local: ${token.colorBgContainer};
    --scroll-thumb: ${token.colorBorderSecondary};
    --scroll-thumb-hover: ${token.colorBorder};
    --scroll-thumb-active: ${token.colorPrimary};
  }

  html,body{
    background: ${token.colorBgBase};
    /* Avoid reserving extra space on sides so sidebars don't look wider */
    scrollbar-gutter: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--scroll-thumb) var(--scroll-track-global);
  }

  html::-webkit-scrollbar,
  body::-webkit-scrollbar {
    width: var(--scroll-size);
    height: var(--scroll-size);
  }
  html::-webkit-scrollbar-track,
  body::-webkit-scrollbar-track {
    background: var(--scroll-track-global);
  }
  html::-webkit-scrollbar-thumb,
  body::-webkit-scrollbar-thumb {
    background: var(--scroll-thumb);
    border: 2px solid var(--scroll-track-global);
    border-radius: var(--scroll-radius);
    background-clip: padding-box;
  }
  html::-webkit-scrollbar-thumb:hover,
  body::-webkit-scrollbar-thumb:hover { background: var(--scroll-thumb-hover); }
  html::-webkit-scrollbar-thumb:active,
  body::-webkit-scrollbar-thumb:active { background: var(--scroll-thumb-active); }

  .pantalla-scroll{
    overflow: auto;
    scrollbar-gutter: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--scroll-thumb) var(--scroll-track-local);
  }
  .pantalla-scroll::-webkit-scrollbar{
    width: var(--scroll-size);
    height: var(--scroll-size);
  }
  .pantalla-scroll::-webkit-scrollbar-track{
    background: var(--scroll-track-local);
  }
  .pantalla-scroll::-webkit-scrollbar-thumb{
    background: var(--scroll-thumb);
    border: 2px solid var(--scroll-track-local);
    border-radius: var(--scroll-radius);
    background-clip: padding-box;
  }
  .pantalla-scroll::-webkit-scrollbar-thumb:hover{ background: var(--scroll-thumb-hover); }
  .pantalla-scroll::-webkit-scrollbar-thumb:active{ background: var(--scroll-thumb-active); }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
