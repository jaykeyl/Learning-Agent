import { type ReactNode } from "react";
import { Avatar, Breadcrumb, Typography } from "antd";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useThemeStore } from "../store/themeStore";

const { Title, Text } = Typography;

type UserInfo = {
  name: string;
  role?: string;
  avatarUrl?: string;
};

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  user?: UserInfo;
  breadcrumbs?: { label: ReactNode; href?: string }[];
  actions?: ReactNode;
  children: ReactNode;
};

export default function PageTemplate({
  title,
  subtitle,
  user,
  breadcrumbs,
  actions,
  children,
}: Props) {
  const { theme, setTheme } = useThemeStore();
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <header className="shrink-0 space-y-4 px-4 md:px-0">
        <div className="flex flex-wrap items-start md:items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumb
                className="mb-1"
                items={breadcrumbs.map((b) => ({
                  title: b.href ? (
                    <a href={b.href as string}>{b.label}</a>
                  ) : (
                    b.label
                  ),
                }))}
              />
            )}

            <Title level={2} className="!m-0 leading-tight">
              {title}
            </Title>
            {subtitle && (
              <Text type="secondary" className="block mt-1">
                {subtitle}
              </Text>
            )}
          </div>

          {actions && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              {actions}
            </div>
          )}

          {user && (
            <div className="flex items-center gap-3 bg-[var(--app-background-color)] p-2 rounded-lg shadow-sm">
              <Avatar src={user.avatarUrl} alt={user.name}>
                {user.name.charAt(0)}
              </Avatar>
              <div>
                <Text strong>{user.name}</Text>
                {user.role && <Text type="secondary"> — {user.role}</Text>}
              </div>
              <button onClick={toggleTheme}>
                {theme === "light" ? <MoonOutlined /> : <SunOutlined />}
              </button>
            </div>
          )}
        </div>
      </header>

      
      <main className="flex-1 min-h-0 overflow-auto pantalla-scroll px-4 md:px-0">
         {children}
      </main>
    </div>
  );
}
