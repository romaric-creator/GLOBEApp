import { Form, Input, Button, App } from "antd";
import {
  UserOutlined,
  LockOutlined,
  HomeOutlined,
  SafetyOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth";
import type { LoginDto } from "../../api/auth";
import { useAuthStore } from "../../store/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const onFinish = async (values: LoginDto) => {
    try {
      const { data } = await authApi.login(values);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      setUser(data.user);
      navigate("/dashboard");
    } catch (error: any) {
      message.error(error.response?.data?.message || "Erreur de connexion");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/70 bg-white/70 shadow-[0_24px_80px_rgba(15,76,129,0.15)] backdrop-blur-xl">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[linear-gradient(135deg,#0f4c81_0%,#163a5b_100%)] p-10 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%)]" />
            <div className="relative z-10">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18 backdrop-blur-sm">
                <HomeOutlined className="text-2xl" />
              </div>
              <h1 className="text-3xl font-semibold">GLOBEApp</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-100">
                Gérez votre résidence avec une expérience moderne, fluide et sécurisée.
              </p>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 font-medium">
                  <SafetyOutlined />
                  <span>Suivi sécurisé des accès et des opérations</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 font-medium">
                  <TeamOutlined />
                  <span>Gestion centralisée des clients, stock et services</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-panel p-8 md:p-12">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f4c81]/10 text-[#0f4c81]">
                <UserOutlined className="text-xl" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-800">
                Bon retour
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Connectez-vous à votre espace de gestion
              </p>
            </div>

            <Form form={form} onFinish={onFinish} layout="vertical" size="large">
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: "Email requis" },
                  { type: "email", message: "Email invalide" },
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder="Email" />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: "Mot de passe requis" }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Mot de passe"
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block className="h-12">
                  Se connecter
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
