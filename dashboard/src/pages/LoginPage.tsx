import { useState } from 'react';
import { Form, Input, Button, App } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const { message } = App.useApp();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; motDePasse: string }) => {
    setLoading(true);
    try {
      const { accessToken, user } = await authApi.login(values.email, values.motDePasse);
      setAuth(user, accessToken);
    } catch {
      message.error('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'grid',
      gridTemplateRows: '1fr auto',
      background: '#fff',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
          }}>
            <div style={{
              width: 36, height: 36,
              background: '#111827',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ color: '#C9A84C', fontSize: 16, fontWeight: 800 }}>G</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: -0.3 }}>
              GLOBE Résidence
            </span>
          </div>
        </div>

        {/* Formulaire */}
        <div style={{ width: '100%', maxWidth: 340 }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: -0.4 }}>
              Connexion
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
              Accédez à votre espace de gestion
            </p>
          </div>

          <Form layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false}>
            <Form.Item
              name="email"
              label={<span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Adresse email</span>}
              rules={[{ required: true, message: 'Requis' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#9ca3af', fontSize: 14 }} />}
                placeholder="vous@exemple.com"
                size="large"
                type="email"
                style={{ borderRadius: 8, height: 44, fontSize: 14 }}
              />
            </Form.Item>

            <Form.Item
              name="motDePasse"
              label={<span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Mot de passe</span>}
              rules={[{ required: true, message: 'Requis' }]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af', fontSize: 14 }} />}
                placeholder="••••••••"
                size="large"
                style={{ borderRadius: 8, height: 44, fontSize: 14 }}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{
                height: 44,
                borderRadius: 8,
                background: '#111827',
                borderColor: '#111827',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </Form>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#d1d5db' }}>
          GLOBE Résidence &copy; {new Date().getFullYear()} &mdash; Gestion interne
        </p>
      </div>
    </div>
  );
}
