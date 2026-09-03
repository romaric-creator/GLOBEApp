import { useAuthStore } from './store/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const token = useAuthStore((s) => s.token);
  return token ? <DashboardPage /> : <LoginPage />;
}
