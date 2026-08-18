import { Form, Input, Button, App } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[960px] grid lg:grid-cols-2 overflow-hidden rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.08)]">
        {/* Left — branding */}
        <div
          className="relative hidden lg:flex flex-col items-center justify-center p-12"
          style={{
            background: "linear-gradient(160deg, #1C1C1C 0%, #2a2518 50%, #1C1C1C 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "url('/login-bg.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              mixBlendMode: "overlay",
            }}
          />
          <div className="relative z-10 flex flex-col items-center text-center">
            <img
              src="/logo-globe.jpeg"
              alt="Globe"
              className="w-28 h-28 rounded-2xl object-contain shadow-lg"
              style={{ background: "white", padding: "8px" }}
            />
            <h1 className="mt-6 text-2xl font-semibold text-white tracking-tight">
              GLOBE Manager
            </h1>
            <p className="mt-3 max-w-[240px] text-sm leading-relaxed text-white/60">
              Gestion de residence simplifee, securisee et centralisee.
            </p>
          </div>

          <div className="absolute bottom-6 left-0 right-0 text-center">
            <span className="text-[11px] text-white/30 tracking-wide uppercase">
              SparkNest
            </span>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex flex-col justify-center p-10 md:p-14 bg-white">
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src="/logo-globe.jpeg"
              alt="Globe"
              className="w-16 h-16 rounded-xl object-contain"
              style={{ background: "white", padding: "4px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
            />
          </div>

          <h2 className="text-xl font-semibold text-[#1C1C1C]">
            Connexion
          </h2>
          <p className="mt-1 mb-8 text-sm text-slate-400">
            Entrez vos identifiants pour continuer
          </p>

          <Form form={form} onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
            <Form.Item
              name="email"
              label={<span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</span>}
              rules={[
                { required: true, message: "Email requis" },
                { type: "email", message: "Email invalide" },
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-slate-300" />}
                placeholder="nom@exemple.com"
                className="!rounded-xl !h-11"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label={<span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mot de passe</span>}
              rules={[{ required: true, message: "Mot de passe requis" }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-300" />}
                placeholder="Votre mot de passe"
                className="!rounded-xl !h-11"
              />
            </Form.Item>
            <Form.Item className="!mt-8 !mb-0">
              <Button
                type="primary"
                htmlType="submit"
                block
                className="!h-11 !rounded-xl !font-medium !text-sm"
              >
                Se connecter
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
