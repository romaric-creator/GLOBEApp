import { useState, useMemo, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Avatar,
  Breadcrumb,
  Tooltip,
  Drawer,
} from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  ShoppingOutlined,
  BankOutlined,
  UserOutlined,
  AccountBookOutlined,
  BarChartOutlined,
  CloudOutlined,
  SettingOutlined,
  HomeOutlined,
  CoffeeOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../store/auth";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationCenter from "../NotificationCenter";
import { authApi } from "../../api/auth";
import GlobalSearch from "../GlobalSearch";
import { SyncWidget } from "../SyncWidget";
import { startTour } from "../../hooks/useTour";

const { Header, Sider, Content } = Layout;

const allMenuItems = [
  { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
  {
    type: "group",
    label: "Operations",
    children: [
      { key: "/hotel", icon: <HomeOutlined />, label: "Hotel" },
      {
        key: "/restaurant",
        icon: <CoffeeOutlined />,
        label: "Bar & Restaurant",
      },
      {
        key: "/piscine",
        icon: <SafetyCertificateOutlined />,
        label: "Piscine",
      },
      {
        key: "/salle-fete",
        icon: <CalendarOutlined />,
        label: "Salle de fete",
      },
    ],
  },
  {
    type: "group",
    label: "Caisse",
    children: [
      { key: "/caisse-hotel", icon: <BankOutlined />, label: "Caisse Hotel" },
      {
        key: "/caisse-restaurant",
        icon: <BankOutlined />,
        label: "Caisse Restaurant",
      },
    ],
  },
  {
    type: "group",
    label: "Gestion",
    children: [
      { key: "/clients", icon: <TeamOutlined />, label: "Clients" },
      {
        key: "/produits",
        icon: <ShoppingOutlined />,
        label: "Produits & Stock",
      },
      {
        key: "/personnel",
        icon: <UserOutlined />,
        label: "Personnel",
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    type: "group",
    label: "Finance & Admin",
    roles: ["admin", "manager"],
    children: [
      {
        key: "/comptabilite",
        icon: <AccountBookOutlined />,
        label: "Comptabilite",
        roles: ["admin", "manager"],
      },
      {
        key: "/rapports",
        icon: <BarChartOutlined />,
        label: "Rapports",
        roles: ["admin", "manager"],
      },
      {
        key: "/sauvegarde",
        icon: <CloudOutlined />,
        label: "Sauvegarde",
        roles: ["admin", "manager"],
      },
      {
        key: "/parametres",
        icon: <SettingOutlined />,
        label: "Paramètres",
        roles: ["admin", "manager"],
      },
    ],
  },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const location = useLocation();
  const { user, logout } = useAuthStore();
  useAuth();
  useNotifications();

  const menuItems: ReturnType<typeof Array.prototype.filter> =
    allMenuItems.reduce((acc: object[], item) => {
      const it = item as {
        roles?: string[];
        children?: { roles?: string[] }[];
        type?: string;
        key?: string;
        label: string;
      };
      if (it.roles && (!user || !it.roles.includes(user.role))) return acc;
      if (it.children) {
        const filtered = it.children.filter(
          (c) => !c.roles || (user && c.roles.includes(user.role)),
        );
        if (filtered.length === 0) return acc;
        return [...acc, { ...it, children: filtered }];
      }
      return [...acc, it];
    }, []);

  const flatMenuItems = allMenuItems.flatMap((item) =>
    item.children ? item.children : [item],
  );

  const breadcrumbItems = useMemo(() => {
    const current = flatMenuItems.find(
      (m) => m.key && location.pathname.startsWith(m.key),
    );
    if (!current || current.key === "/dashboard") return [];
    const tabParam = new URLSearchParams(location.search).get("tab");
    const items: {
      title: string;
      href?: string;
      onClick?: (e: React.MouseEvent) => void;
    }[] = [
      {
        title: "Accueil",
        href: "/dashboard",
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          navigate("/dashboard");
        },
      },
      { title: current.label },
    ];
    if (tabParam) {
      items.push({
        title: tabParam.charAt(0).toUpperCase() + tabParam.slice(1),
      });
    }
    return items;
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handler = () => {
      logout();
      navigate("/login");
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [logout, navigate]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate("/login");
    }
  };

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Deconnexion",
        onClick: handleLogout,
      },
    ],
  };

  const siderContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div
        className="flex shrink-0 items-center justify-center px-4 py-3 transition-all duration-300 ease-in-out"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.18)", flexShrink: 0 }}
      >
        {collapsed && !isMobile ? (
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
            <img src="./logo-globe.jpeg" alt="Globe" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex items-center justify-center transition-all duration-300 ease-in-out">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <img src="./logo-globe.jpeg" alt="Globe" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => { navigate(key); if (isMobile) setMobileDrawerOpen(false); }}
          className="mt-1 border-none bg-transparent"
          style={{ background: "transparent" }}
        />
      </div>
    </div>
  );

  return (
    <Layout className="min-h-screen app-shell">
      {isMobile ? (
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          width={260}
          styles={{ body: { padding: 0 }, header: { display: "none" } }}
          style={{ borderRight: "1px solid rgba(201,168,76,0.18)" }}
        >
          {siderContent}
        </Drawer>
      ) : (
        <Sider
          id="tour-sidebar"
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="light"
          width={260}
          className="border-r border-slate-200/80"
          style={{
            background: "rgba(255,255,255,0.92)",
            height: "100vh",
            position: "sticky",
            top: 0,
            borderRight: "1px solid rgba(201,168,76,0.18)",
          }}
        >
          {siderContent}
        </Sider>
      )}
      <Layout className="bg-transparent">
        <Header
          className="flex items-center justify-between px-4 md:px-6"
          style={{
            background: "rgba(255,255,255,0.82)",
            borderBottom: "1px solid rgba(201,168,76,0.15)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={isMobile
                ? (mobileDrawerOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />)
                : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)
              }
              onClick={() => isMobile ? setMobileDrawerOpen((v) => !v) : setCollapsed((v) => !v)}
            />
            <div id="tour-search">
              <GlobalSearch />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncWidget />
            <NotificationCenter />
            <Tooltip title="Visite guidee">
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={startTour}
                className="text-slate-400 hover:text-slate-600"
              />
            </Tooltip>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div
                id="tour-user-menu"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 shadow-sm transition hover:shadow-md cursor-pointer"
              >
                <Avatar icon={<UserOutlined />} />
                <span className="text-sm font-medium text-slate-700">
                  {user?.prenom} {user?.nom}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          id="tour-content"
          className="m-4 min-h-70 rounded-3xl border border-slate-200/70 bg-white/75 p-6 shadow-[0_10px_30px_rgba(201,168,76,0.10)]"
        >
          {breadcrumbItems.length > 0 && (
            <Breadcrumb items={breadcrumbItems} className="mb-4" />
          )}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
