import { Layout, Menu, Avatar } from "antd";
import type React from "react";
import {
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  BookOutlined,
  FileAddOutlined,
  CloudUploadOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../services/authService";
import { useThemeStore } from "../store/themeStore";
import type { SiderTheme } from "antd/es/layout/Sider";
import { useUserStore } from "../store/userStore";

const { Sider, Content } = Layout;

type NavItem = { key: string; icon: React.ReactNode; label: React.ReactNode };

function buildNavItems(roles: string[] | undefined): NavItem[] {
  const common: NavItem[] = [
    { key: "/", icon: <HomeOutlined />, label: <Link to="/">Home</Link> },
    {
      key: "/upload-pdf",
      icon: <CloudUploadOutlined />,
      label: <Link to="/upload-pdf">Documentos</Link>,
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: <Link to="/settings">Settings</Link>,
    },
  ];

  const isProfessor = roles?.includes("docente");
  const isStudent = roles?.includes("estudiante");

  const professorOnly: NavItem[] = [
    {
      key: "/courses",
      icon: <SolutionOutlined />,
      label: <Link to="/courses">Materias</Link>,
    },
    {
      key: "/exams/create",
      icon: <FileAddOutlined />,
      label: <Link to="/exams/create">Crear Examen</Link>,
    },
  ];

  const studentOnly: NavItem[] = [
    {
      key: "/classes",
      icon: <BookOutlined />,
      label: <Link to="/classes">Clases</Link>,
    },
  ];

  return [
    ...common.slice(0, 1),
    ...(isProfessor ? professorOnly : []),
    ...(isStudent ? studentOnly : []),
    ...common.slice(1),
  ];
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const [systemTheme, setSystemTheme] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? "dark" : "light");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const currentTheme: SiderTheme = useMemo(
    () =>
      theme === "system" ? (systemTheme as SiderTheme) : (theme as SiderTheme),
    [theme, systemTheme]
  );
  const navItems = useMemo(() => buildNavItems(user?.roles), [user]);

  const selectedKey = useMemo(() => {
    const match = navItems.find((i) =>
      i.key === "/" ? pathname === "/" : pathname.startsWith(i.key)
    );
    return match?.key ?? "/";
  }, [pathname, navItems]);

  return (
    <Layout className="h-screen">
      <Sider
        width={260}
        collapsedWidth={96}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme={currentTheme}
        trigger={null}
        className="bg-[var(--app-colorBgLayout)]"
      >
        <div className="h-full ">
          <div className="h-full w-full pb-2 bg-[var(--app-colorBgContainer)] shadow-sm ring-1 ring-[var(--app-colorBorder)] flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <div className="text-xl font-semibold tracking-tight">
                LEARNING ISC
              </div>
            </div>

            {/* <ConfigProvider
              theme={{
                components: {
                  Menu: {
                    itemBorderRadius: 12,
                    itemHeight: 44,
                    itemPaddingInline: 12,
                    itemSelectedBg: "#B2B0E8",
                    itemSelectedColor: "#0f172a",
                    itemHoverBg: "rgba(15, 23, 42, 0.04)",
                    activeBarWidth: 0,
                  },
                },
              }}
            > */}
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={navItems}
              className="px-3"
              style={{
                borderInlineEnd: 0,
                flex: 1,
                overflowY: "auto",
              }}
            />
            {/* </ConfigProvider> */}

            <div className="px-5 pt-6 pb-2 mt-auto mb-2">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setTheme(theme === "light" ? "dark" : "light")
                    }
                    className="p-1 rounded-full hover:bg-[var(--app-colorBgElevated)]"
                    aria-label="Toggle theme"
                  >
                    {theme === "light" ? <MoonOutlined /> : <SunOutlined />}
                  </button>
                  <Avatar
                    size={64}
                    src="https://i.pravatar.cc/128?img=5"
                    className="ring-2 ring-white shadow"
                  />
                </div>
                <div className="mt-3 font-semibold">
                  {user?.name ?? ""} {user?.lastname ?? ""}
                </div>
                <div className="text-xs text-slate-500">
                  {user?.roles?.includes("docente")
                    ? "Docente"
                    : user?.roles?.includes("estudiante")
                    ? "Estudiante"
                    : ""}
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                await logout();
                setUser(null);
                navigate("/login", { replace: true });
              }}
              className="mx-auto mb-5 my-5 py-5 flex items-center justify-center gap-3 h-10 px-4 rounded-xl text-[var(--app-colorText)] hover:bg-[var(--app-colorBgElevated)]"
            >
              <LogoutOutlined />
              <span className="text-sm">Log Out</span>
            </button>
          </div>
        </div>
      </Sider>

      <Layout className="flex flex-col min-h-0">
        <Content className="flex-1 min-h-0 overflow-hidden pt-4 md:p-6 bg-[var(--app-colorBgLayout)]">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
