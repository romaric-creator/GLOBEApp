import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/auth';

export function useAuth() {
  const navigate = useNavigate();
  const { isAuthenticated, setUser, logout } = useAuthStore();

  const { data, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.profile().then((r) => r.data),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data, setUser]);

  useEffect(() => {
    if (isError) {
      logout();
      navigate('/login');
    }
  }, [isError, logout, navigate]);

  return { isAuthenticated };
}
