import { Card, Col, Row, Statistic, Spin, Tag, Button, List, Typography } from "antd";
import {
  TeamOutlined,
  ShoppingOutlined,
  DollarOutlined,
  ScheduleOutlined,
  HomeOutlined,
  CoffeeOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { clientsApi } from "../../api/clients";
import { produitsApi } from "../../api/produits";
import { rapportsApi } from "../../api/rapports";
import { hotelApi } from "../../api/hotel";
import { ventesApi } from "../../api/ventes";
import { restaurantApi } from "../../api/restaurant";
import { useAuthStore } from "../../store/auth";
import dayjs from "dayjs";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || 'employe';
  const today = dayjs().format("YYYY-MM-DD");
  const startOfMonth = dayjs().startOf("month").format("YYYY-MM-DD");

  const isManager = role === 'admin' || role === 'manager';
  const isCaissier = role === 'caissier';
  const isServeur = role === 'serveur';

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.findAll().then((r) => r.data),
    enabled: isManager,
  });

  const { data: produits } = useQuery({
    queryKey: ["produits"],
    queryFn: () => produitsApi.findAll().then((r) => r.data),
  });

  const { data: ca, isLoading: loadingCa } = useQuery({
    queryKey: ["dashboard-ca"],
    queryFn: () => rapportsApi.getChiffreAffaires(startOfMonth, today),
    enabled: isManager,
  });

  const { data: personnel } = useQuery({
    queryKey: ["dashboard-personnel"],
    queryFn: rapportsApi.getResumePersonnel,
    enabled: isManager,
  });

  const { data: hotelStats } = useQuery({
    queryKey: ["dashboard-hotel"],
    queryFn: hotelApi.getStats,
  });

  const { data: ventesStats } = useQuery({
    queryKey: ["dashboard-ventes-stats"],
    queryFn: ventesApi.getStats,
    enabled: isCaissier || isManager,
  });

  const { data: restoStats } = useQuery({
    queryKey: ["dashboard-resto-stats"],
    queryFn: restaurantApi.getStats,
    enabled: isServeur || isManager,
  });

  const alertesProduits = produits?.filter(p => p.actif && p.stockActuel <= p.seuilAlerte) || [];
  const isLoading = isManager ? loadingCa : false;

  const quickActions = getQuickActions(role);

  return (
    <Spin spinning={isLoading}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold m-0">
              Bonjour, {user?.prenom || 'Utilisateur'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {dayjs().format('dddd D MMMM YYYY')}
            </p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="mb-6 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.path}
              type="default"
              icon={action.icon}
              onClick={() => navigate(action.path)}
              className="rounded-xl"
            >
              {action.label}
            </Button>
          ))}
        </div>

        {/* Stats principales selon le role */}
        {isManager && (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable onClick={() => navigate('/ventes')} className="cursor-pointer">
                  <Statistic
                    title="CA du mois"
                    value={ca?.total || 0}
                    prefix={<DollarOutlined />}
                    suffix="FCFA"
                    valueStyle={{ color: "#3f8600" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable onClick={() => navigate('/hotel')} className="cursor-pointer">
                  <Statistic
                    title="Occupation hotel"
                    value={hotelStats?.tauxOccupation || 0}
                    suffix="%"
                    prefix={<HomeOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable onClick={() => navigate('/clients')} className="cursor-pointer">
                  <Statistic
                    title="Clients"
                    value={clients?.length || 0}
                    prefix={<TeamOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable onClick={() => navigate('/personnel')} className="cursor-pointer">
                  <Statistic
                    title="Presents aujourd'hui"
                    value={personnel?.presentsAujourdhui || 0}
                    prefix={<ScheduleOutlined />}
                  />
                </Card>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="CA Ventes" value={ca?.ventes || 0} suffix="FCFA" />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="CA Restaurant" value={ca?.restaurant || 0} suffix="FCFA" prefix={<CoffeeOutlined />} />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="CA Hotel" value={ca?.hotel || 0} suffix="FCFA" prefix={<HomeOutlined />} />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="Personnel en conge" value={personnel?.enConge || 0} valueStyle={{ color: "#faad14" }} />
                </Card>
              </Col>
            </Row>
          </>
        )}

        {isCaissier && (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card hoverable onClick={() => navigate('/ventes')} className="cursor-pointer">
                <Statistic
                  title="Ventes aujourd'hui"
                  value={ventesStats?.ventesAujourdHui || 0}
                  prefix={<ShoppingCartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Total du jour"
                  value={ventesStats?.totalAujourdHui || 0}
                  prefix={<DollarOutlined />}
                  suffix="FCFA"
                  valueStyle={{ color: "#3f8600" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card hoverable onClick={() => navigate('/hotel')} className="cursor-pointer">
                <Statistic
                  title="Occupation hotel"
                  value={hotelStats?.tauxOccupation || 0}
                  suffix="%"
                  prefix={<HomeOutlined />}
                />
              </Card>
            </Col>
          </Row>
        )}

        {isServeur && (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card hoverable onClick={() => navigate('/restaurant')} className="cursor-pointer">
                <Statistic
                  title="Commandes en cours"
                  value={restoStats?.commandesEnCours || 0}
                  prefix={<CoffeeOutlined />}
                  valueStyle={{ color: "#1677ff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card hoverable onClick={() => navigate('/restaurant')} className="cursor-pointer">
                <Statistic
                  title="Commandes aujourd'hui"
                  value={restoStats?.commandesAujourdHui || 0}
                  prefix={<ShoppingOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="CA restaurant du jour"
                  value={restoStats?.caJour || 0}
                  suffix="FCFA"
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: "#3f8600" }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {!isManager && !isCaissier && !isServeur && (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card hoverable onClick={() => navigate('/hotel')} className="cursor-pointer">
                <Statistic title="Occupation hotel" value={hotelStats?.tauxOccupation || 0} suffix="%" prefix={<HomeOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="Produits" value={produits?.filter(p => p.actif).length || 0} prefix={<ShoppingOutlined />} />
              </Card>
            </Col>
          </Row>
        )}

        {/* Alertes stock - visible par tous sauf serveur */}
        {!isServeur && alertesProduits.length > 0 && (
          <Card
            title={<span><WarningOutlined className="text-red-500 mr-2" />Alertes stock ({alertesProduits.length})</span>}
            size="small"
            className="mt-6"
            extra={<Button type="link" icon={<ArrowRightOutlined />} onClick={() => navigate('/produits')}>Voir tout</Button>}
          >
            <List
              dataSource={alertesProduits.slice(0, 5)}
              renderItem={(p) => (
                <List.Item>
                  <div className="flex items-center justify-between w-full">
                    <Typography.Text>{p.nom}</Typography.Text>
                    <Tag color="red">{p.stockActuel} {p.unite} (seuil: {p.seuilAlerte})</Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    </Spin>
  );
}

function getQuickActions(role: string) {
  const actions = [
    { label: 'Nouvelle vente', icon: <ShoppingCartOutlined />, path: '/ventes', roles: ['admin', 'manager', 'caissier'] },
    { label: 'Nouvelle commande', icon: <CoffeeOutlined />, path: '/restaurant', roles: ['admin', 'manager', 'serveur'] },
    { label: 'Reservations', icon: <HomeOutlined />, path: '/hotel', roles: ['admin', 'manager', 'caissier', 'employe'] },
    { label: 'Rapports', icon: <DollarOutlined />, path: '/rapports', roles: ['admin', 'manager'] },
  ];
  return actions.filter((a) => a.roles.includes(role));
}
