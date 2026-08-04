import { Form, Input, Button, Card, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import type { LoginDto } from '../../api/auth';
import { useAuthStore } from '../../store/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const onFinish = async (values: LoginDto) => {
    try {
      const { data } = await authApi.login(values);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Erreur de connexion');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">GLOBEApp</h1>
          <p className="text-gray-500">Connectez-vous a votre compte</p>
        </div>
        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Email requis' },
              { type: 'email', message: 'Email invalide' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Mot de passe requis' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mot de passe" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Se connecter
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
