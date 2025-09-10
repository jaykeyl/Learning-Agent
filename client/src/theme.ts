import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

export const palette = {
  P0: "#1A2A80",
  P1: "#3B38A0",
  P2: "#7A85C1",
  P3: "#B2B0E8",
};
const borderWidth = 1;

export const lightTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    lineWidth: borderWidth,
    colorPrimary: palette.P0,
    colorInfo: palette.P1,
    colorSuccess: "#16a34a",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    fontFamily: "Inter, sans-serif",
    borderRadius: 12,
    wireframe: false,
    colorBgBase: "#f6f9ff",
    colorBgLayout: "#f6f9ff",
    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",
    colorBorder: palette.P2,
    colorText: "#0f172a",
    colorTextPlaceholder: "#64748b",
    colorTextSecondary: palette.P3,
    colorLink: palette.P1,
    colorLinkHover: "#4c4ad1",
    colorLinkActive: palette.P0,
  },
  components: {
    Button: {
      colorPrimary: palette.P0,
      colorPrimaryHover: "#182670",
      colorPrimaryActive: "#121d56",
      primaryShadow: "none",
      controlHeight: 40,
      controlHeightLG: 44,
      borderRadius: 12,
    },
    Card: { borderRadiusLG: 16 },
    Input: { controlHeight: 40, colorBorder: palette.P2 },
    Tag: { defaultBg: palette.P3, defaultColor: palette.P0 },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: [antdTheme.darkAlgorithm],
  token: {
    lineWidth: borderWidth,
    colorPrimary: "#5b6ef0",
    colorInfo: "#7a8bff",
    colorSuccess: "#22c55e",
    colorWarning: "#f59e0b",
    colorError: "#f87171",
    fontFamily: "Inter, sans-serif",
    borderRadius: 12,
    colorBgBase: "#0b1024",
    colorBgLayout: "#0b1024",
    colorBgContainer: "#0f1735",
    colorBgElevated: "#141d47",
    colorBorder: "#35407a",
    colorText: "#e6eaff",
    colorTextPlaceholder: "#97a0e6",
    colorTextSecondary: "#bfc7ff",
    colorLink: "#9aa6ff",
    colorLinkHover: "#b4beff",
  },
  components: {
    Button: {
      colorPrimary: "#5b6ef0",
      colorPrimaryHover: "#5163e7",
      colorPrimaryActive: "#495bdd",
      primaryShadow: "none",
      controlHeight: 40,
      controlHeightLG: 44,
      borderRadius: 12,
    },
    Card: { borderRadiusLG: 16 },
    Input: { controlHeight: 40 },
    Tag: { defaultBg: "#2a326b", defaultColor: "#e6eaff" },
  },
};
