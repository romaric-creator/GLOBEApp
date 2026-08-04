import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, theme } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  AccountBookOutlined,
  BarChartOutlined,
  CloudOutlined,
  HomeOutlined,
  CoffeeOutlined,
  SafetyCertificateOutlined,
  CarOutlined,
  CalendarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/auth';
import { authApi } from '../../api/auth';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/clients', icon: <TeamOutlined />, label: 'Clients' },
  { key: '/produits', icon: <ShoppingOutlined />, label: 'Produits & Stock' },
  { key: '/ventes', icon: <ShoppingCartOutlined />, label: 'Ventes & Caisse' },
  { key: '/personnel', icon: <UserOutlined />, label: 'Personnel' },
  { key: '/hotel', icon: <HomeOutlined />, label: 'Hotel' },
  { key: '/restaurant', icon: <CoffeeOutlined />, label: 'Bar & Restaurant' },
  { key: '/piscine', icon: <SafetyCertificateOutlined />, label: 'Piscine & Loisirs' },
  { key: '/livraison', icon: <CarOutlined />, label: 'Livraison' },
  { key: '/salle-fete', icon: <CalendarOutlined />, label: 'Salle de fete' },
  { key: '/comptabilite', icon: <AccountBookOutlined />, label: 'Comptabilite' },
  { key: '/rapports', icon: <BarChartOutlined />, label: 'Rapports' },
  { key: '/sauvegarde', icon: <CloudOutlined />, label: 'Sauvegarde' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token } = theme.useToken();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Deconnexion',
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Layout className="min-h-screen">
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <h2 className="text-lg font-bold m-0" style={{ color: token.colorPrimary }}>
            {collapsed ? 'G' : 'GLOBEApp'}
          </h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="mt-2"
        />
      </Sider>
      <Layout>
        <Header className="flex items-center justify-between px-4" style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={userMenu} placement="bottomRight">
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar icon={<UserOutlined />} />
              <span>{user?.prenom} {user?.nom}</span>
            </div>
          </Dropdown>
        </Header>
        <Content className="m-4 p-6 bg-white rounded-lg min-h-[280px]">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
