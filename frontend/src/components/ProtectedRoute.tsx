import { Navigate } from 'react-router-dom';
import { Result } from 'antd';
import { useAuthStore } from '../store/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Result status="403" title="Acces refuse" subTitle="Vous n'avez pas les droits pour acceder a cette page." />;
  }

  return <>{children}</>;
}
