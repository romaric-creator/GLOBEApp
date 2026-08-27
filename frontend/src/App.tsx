import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";
import frFR from "antd/locale/fr_FR";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ClientsPage from "./pages/clients/ClientsPage";
import ProduitsPage from "./pages/produits/ProduitsPage";
import CaisseRestaurantPage from "./pages/caisse-restaurant/CaisseRestaurantPage";
import CaisseHotelPage from "./pages/caisse-hotel/CaisseHotelPage";
import PersonnelPage from "./pages/personnel/PersonnelPage";
import HotelPage from "./pages/hotel/HotelPage";
import RestaurantPage from "./pages/restaurant/RestaurantPage";
import PiscinePage from "./pages/piscine/PiscinePage";
import SalleFetePage from "./pages/salle-fete/SalleFetePage";
import ComptabilitePage from "./pages/comptabilite/ComptabilitePage";
import RapportsPage from "./pages/rapports/RapportsPage";
import SauvegardePage from "./pages/sauvegarde/SauvegardePage";
import ParametresPage from "./pages/parametres/ParametresPage";
import BossDashboardPage from "./pages/boss-dashboard/BossDashboardPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={frFR}
        theme={{
          token: {
            colorPrimary: "#C9A84C",
            colorInfo: "#C9A84C",
            colorLink: "#C9A84C",
            borderRadius: 10,
            colorBgContainer: "#ffffff",
            colorText: "#1C1C1C",
            fontFamily: "Inter, 'Segoe UI', Roboto, sans-serif",
          },
          components: {
            Button: {
              colorPrimary: "#C9A84C",
              colorPrimaryHover: "#b8932f",
              colorPrimaryActive: "#a07d22",
            },
            Menu: {
              itemSelectedBg: "rgba(201,168,76,0.12)",
              itemSelectedColor: "#C9A84C",
              itemHoverColor: "#C9A84C",
            },
          },
        }}
      >
        <AntApp>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/produits" element={<ProduitsPage />} />
                <Route path="/caisse-restaurant" element={<CaisseRestaurantPage />} />
                <Route path="/caisse-hotel" element={<CaisseHotelPage />} />
                <Route path="/personnel" element={<ProtectedRoute roles={['admin', 'manager']}><PersonnelPage /></ProtectedRoute>} />
                <Route path="/hotel" element={<HotelPage />} />
                <Route path="/restaurant" element={<RestaurantPage />} />
                <Route path="/piscine" element={<PiscinePage />} />
                <Route path="/salle-fete" element={<SalleFetePage />} />
                <Route path="/comptabilite" element={<ProtectedRoute roles={['admin', 'manager']}><ComptabilitePage /></ProtectedRoute>} />
                <Route path="/rapports" element={<ProtectedRoute roles={['admin', 'manager']}><RapportsPage /></ProtectedRoute>} />
                <Route path="/sauvegarde" element={<ProtectedRoute roles={['admin', 'manager']}><SauvegardePage /></ProtectedRoute>} />
                <Route path="/parametres" element={<ProtectedRoute roles={['admin', 'manager']}><ParametresPage /></ProtectedRoute>} />
                <Route path="/boss" element={<ProtectedRoute roles={['admin', 'manager']}><BossDashboardPage /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </HashRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
