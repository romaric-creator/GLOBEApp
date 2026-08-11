import { Form, Input, Button, App } from "antd";
import { UserOutlined, LockOutlined, SafetyOutlined, TeamOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth";
import type { LoginDto } from "../../api/auth";
import { getErrorMessage } from "../../api/errors";
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
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/70 bg-white/70 shadow-[0_24px_80px_rgba(201,168,76,0.18)] backdrop-blur-xl">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          {/* Panneau gauche */}
          <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10 text-white"
            style={{ backgroundImage: "url('/login-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(28,28,28,0.72) 0%, rgba(28,28,28,0.55) 50%, rgba(28,28,28,0.68) 100%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at top left, rgba(201,168,76,0.18), transparent 50%)" }} />

            <div className="relative z-10 flex flex-col items-center text-center">
              <img
                src="/logo-globe.jpeg"
                alt="Résidence Meublée Globe"
                className="w-48 h-48 object-contain rounded-2xl mb-6"
                style={{ background: "white", padding: "12px" }}
              />
              <p className="mt-2 max-w-xs text-sm leading-6 text-amber-100/80">
                Gérez votre résidence avec une expérience moderne, fluide et sécurisée.
              </p>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="rounded-2xl p-3" style={{ border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.08)" }}>
                <div className="flex items-center gap-2 font-medium text-amber-200">
                  <SafetyOutlined />
                  <span>Suivi sécurisé des accès et des opérations</span>
                </div>
              </div>
              <div className="rounded-2xl p-3" style={{ border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.08)" }}>
                <div className="flex items-center gap-2 font-medium text-amber-200">
                  <TeamOutlined />
                  <span>Gestion centralisée des clients, stock et services</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panneau droite */}
          <div className="auth-panel p-8 md:p-12">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "rgba(201,168,76,0.12)" }}>
                <UserOutlined className="text-xl" style={{ color: "#C9A84C" }} />
              </div>
              <h2 className="text-2xl font-semibold" style={{ color: "#1C1C1C" }}>
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
                <Input.Password prefix={<LockOutlined />} placeholder="Mot de passe" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block className="h-12">
                  Se connecter
                </Button>
              </Form.Item>
            </Form>
            <p className="mt-6 text-center text-xs text-slate-400">
              Développé par{" "}
              <span style={{ color: "#C9A84C", fontWeight: 500 }}>SparkNest</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
