import {
  Card, Col, Row, Statistic, Spin, Tag, Button, List, Typography, Progress, Badge, Alert,
} from 'antd';
import {
  TeamOutlined, ShoppingOutlined, DollarOutlined, ScheduleOutlined,
  HomeOutlined, CoffeeOutlined, WarningOutlined, ArrowRightOutlined,
  RiseOutlined, FallOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { clientsApi } from '../../api/clients';
import { produitsApi } from '../../api/produits';
import { rapportsApi } from '../../api/rapports';
import type { CA7JoursItem } from '../../api/rapports';
import { hotelApi } from '../../api/hotel';
import { restaurantApi } from '../../api/restaurant';
import { useAuthStore } from '../../store/auth';
import dayjs from 'dayjs';

// Graphique courbe CA 7 jours en SVG natif
function CA7Chart({ data }: { data: CA7JoursItem[] }) {
  if (!data || data.length === 0) return null;
  const W = 560;
  const H = 120;
  const PAD = { top: 10, right: 10, bottom: 30, left: 60 };
  const max = Math.max(...data.map((d) => d.total), 1);

  const xStep = (W - PAD.left - PAD.right) / (data.length - 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / max);

  const pointsTotal = data.map((d, i) => `${toX(i)},${toY(d.total)}`).join(' ');
  const pointsHotel = data.map((d, i) => `${toX(i)},${toY(d.hotel)}`).join(' ');
  const pointsResto = data.map((d, i) => `${toX(i)},${toY(d.restaurant)}`).join(' ');

  const areaPath = `M ${data.map((d, i) => `${toX(i)},${toY(d.total)}`).join(' L ')} L ${toX(data.length - 1)},${H - PAD.bottom} L ${toX(0)},${H - PAD.bottom} Z`;

  const formatY = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Grille */}
      {[0, 0.5, 1].map((ratio) => {
        const y = toY(max * ratio);
        return (
          <g key={ratio}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f0f0f0" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#8c8c8c">
              {formatY(max * ratio)}
            </text>
          </g>
        );
      })}
      {/* Axe X */}
      {data.map((d, i) => (
        <text key={d.date} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#8c8c8c">
          {dayjs(d.date).format('DD/MM')}
        </text>
      ))}
      {/* Aire totale */}
      <path d={areaPath} fill="rgba(201,168,76,0.10)" />
      {/* Lignes */}
      <polyline points={pointsTotal} fill="none" stroke="#C9A84C" strokeWidth={2} strokeLinejoin="round" />
      <polyline points={pointsHotel} fill="none" stroke="#52c41a" strokeWidth={1.5} strokeDasharray="4 2" strokeLinejoin="round" />
      <polyline points={pointsResto} fill="none" stroke="#fa8c16" strokeWidth={1.5} strokeDasharray="4 2" strokeLinejoin="round" />
      {/* Points sur la ligne totale */}
      {data.map((d, i) => (
        <circle key={d.date} cx={toX(i)} cy={toY(d.total)} r={3} fill="#C9A84C" />
      ))}
    </svg>
  );
}

// Légende du graphique
function ChartLegend() {
  return (
    <div className="flex gap-4 mt-2 text-xs text-slate-500">
      <span className="flex items-center gap-1">
        <span style={{ display: 'inline-block', width: 16, height: 2, background: '#C9A84C' }} />
        Total
      </span>
      <span className="flex items-center gap-1">
        <span style={{ display: 'inline-block', width: 16, height: 2, background: '#52c41a', borderTop: '2px dashed #52c41a' }} />
        Hotel
      </span>
      <span className="flex items-center gap-1">
        <span style={{ display: 'inline-block', width: 16, height: 2, background: '#fa8c16', borderTop: '2px dashed #fa8c16' }} />
        Restaurant
      </span>
    </div>
  );
}

// Variation N vs N-1
function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span style={{ fontSize: 12, color: up ? '#3f8600' : '#cf1322', marginLeft: 6 }}>
      {up ? <RiseOutlined /> : <FallOutlined />} {up ? '+' : ''}{pct}%
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || 'employe';
  const today = dayjs().format('YYYY-MM-DD');
  const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
  const startOfLastMonth = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
  const endOfLastMonth = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

  const isManager = role === 'admin' || role === 'manager';
  const isCaissier = role === 'caissier';
  const isServeur = role === 'serveur';

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.findAll().then((r) => r.data),
    enabled: isManager,
  });

  const { data: produits } = useQuery({
    queryKey: ['produits'],
    queryFn: () => produitsApi.findAll().then((r) => r.data),
  });

  const { data: ca, isLoading: loadingCa, isError: caError } = useQuery({
    queryKey: ['dashboard-ca', startOfMonth, today],
    queryFn: () => rapportsApi.getChiffreAffaires(startOfMonth, today),
    enabled: isManager,
  });

  const { data: caLastMonth } = useQuery({
    queryKey: ['dashboard-ca-last', startOfLastMonth, endOfLastMonth],
    queryFn: () => rapportsApi.getChiffreAffaires(startOfLastMonth, endOfLastMonth),
    enabled: isManager,
  });

  const { data: ca7Jours } = useQuery({
    queryKey: ['dashboard-ca-7j'],
    queryFn: rapportsApi.getCA7Jours,
    enabled: isManager,
  });

  const { data: personnel } = useQuery({
    queryKey: ['dashboard-personnel'],
    queryFn: rapportsApi.getResumePersonnel,
    enabled: isManager,
  });

  const { data: hotelStats } = useQuery({
    queryKey: ['hotel-stats'],
    queryFn: hotelApi.getStats,
  });

  const { data: restoStats } = useQuery({
    queryKey: ['dashboard-resto-stats'],
    queryFn: restaurantApi.getStats,
    enabled: isServeur || isManager || isCaissier,
  });

  const alertesProduits = produits?.filter((p: { actif: boolean; stockActuel: number; seuilAlerte: number }) => p.actif && p.stockActuel <= p.seuilAlerte) || [];

  const quickActions = getQuickActions(role);

  return (
    <Spin spinning={isManager ? loadingCa : false}>
      <div>
        {/* Header */}
        <div id="tour-dashboard-header" className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold m-0">
              Bonjour, {user?.prenom || 'Utilisateur'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {dayjs().format('dddd D MMMM YYYY')}
            </p>
          </div>
          <div className="flex gap-2">
            {quickActions.map((action) => (
              <Button key={action.path} type="default" icon={action.icon} onClick={() => navigate(action.path)} size="small">
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* ===== VUE MANAGER / ADMIN ===== */}
        {isManager && (
          <>
            {caError && (
              <Alert
                type="warning"
                message="Donnees financieres indisponibles"
                description="Impossible de charger les KPI financiers. Les autres donnees sont affichees normalement."
                showIcon
                closable
                className="mb-4"
              />
            )}
            {/* KPI row 1 */}
            <Row id="tour-dashboard-kpis" gutter={[12, 12]}>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small" hoverable onClick={() => navigate('/rapports')} className="cursor-pointer h-full">
                  <Statistic
                    title="CA du mois"
                    value={ca?.total || 0}
                    prefix={<DollarOutlined />}
                    suffix="FCFA"
                    valueStyle={{ color: '#3f8600', fontSize: 18 }}
                  />
                  <div className="mt-1 text-xs text-slate-400">
                    vs mois précédent
                    <Trend current={ca?.total || 0} previous={caLastMonth?.total || 0} />
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small" hoverable onClick={() => navigate('/hotel')} className="cursor-pointer h-full">
                  <div className="flex justify-between items-start">
                    <Statistic
                      title="Taux d'occupation"
                      value={hotelStats?.tauxOccupation || 0}
                      suffix="%"
                      prefix={<HomeOutlined />}
                      valueStyle={{ fontSize: 18 }}
                    />
                    <div className="text-xs text-slate-400 text-right mt-1">
                      <div>{hotelStats?.occupees || 0} occupées</div>
                      <div>{hotelStats?.disponibles || 0} libres</div>
                    </div>
                  </div>
                  <Progress
                    percent={hotelStats?.tauxOccupation || 0}
                    showInfo={false}
                    strokeColor={hotelStats?.tauxOccupation && hotelStats.tauxOccupation > 80 ? '#52c41a' : '#C9A84C'}
                    size="small"
                    className="mt-2 mb-0"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small" hoverable onClick={() => navigate('/clients')} className="cursor-pointer h-full">
                  <Statistic
                    title="Clients"
                    value={clients?.length || 0}
                    prefix={<TeamOutlined />}
                    valueStyle={{ fontSize: 18 }}
                  />
                  <div className="mt-1 text-xs text-slate-400">
                    {hotelStats?.reservationsAVenir || 0} réservations à venir
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card size="small" hoverable onClick={() => navigate('/personnel')} className="cursor-pointer h-full">
                  <Statistic
                    title="Personnel présent"
                    value={personnel?.presentsAujourdhui || 0}
                    prefix={<ScheduleOutlined />}
                    valueStyle={{ fontSize: 18 }}
                    suffix={`/ ${personnel?.effectifTotal || 0}`}
                  />
                  <div className="mt-1 text-xs">
                    {personnel?.enConge ? <Tag color="orange" style={{ fontSize: 10 }}>{personnel.enConge} en congé</Tag> : null}
                    {personnel && personnel.absents > 0 ? <Tag color="red" style={{ fontSize: 10 }}>{personnel.absents} absents</Tag> : null}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* KPI row 2 : détail CA + restaurant */}
            <Row gutter={[12, 12]} className="mt-3">
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic title="CA Hôtel" value={ca?.hotel || 0} suffix="FCFA" valueStyle={{ fontSize: 15, color: '#C9A84C' }} prefix={<HomeOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic title="CA Restaurant" value={ca?.restaurant || 0} suffix="FCFA" valueStyle={{ fontSize: 15, color: '#fa8c16' }} prefix={<CoffeeOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic title="Commandes en cours" value={restoStats?.commandesEnPreparation || 0} valueStyle={{ fontSize: 15, color: '#C9A84C' }} prefix={<CoffeeOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic title="CA resto aujourd'hui" value={restoStats?.caJour || 0} suffix="FCFA" valueStyle={{ fontSize: 15, color: '#3f8600' }} />
                </Card>
              </Col>
            </Row>

            {/* Graphique CA 7 jours + heatmap chambres */}
            <Row id="tour-dashboard-charts" gutter={[12, 12]} className="mt-3">
              <Col xs={24} lg={14}>
                <Card
                  title={<span><DollarOutlined className="mr-2" />CA sur 7 jours</span>}
                  size="small"
                  style={{ height: '100%' }}
                >
                  {ca7Jours && ca7Jours.length > 0 ? (
                    <>
                      <CA7Chart data={ca7Jours} />
                      <ChartLegend />
                    </>
                  ) : (
                    <div className="text-slate-400 text-sm py-4 text-center">Aucune donnée</div>
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={10}>
                <Card
                  title={<span><HomeOutlined className="mr-2" />Statut des chambres</span>}
                  size="small"
                  style={{ height: '100%' }}
                  extra={<Button type="link" size="small" onClick={() => navigate('/hotel')}>Gérer</Button>}
                >
                  <div className="space-y-2">
                    {[
                      { label: 'Occupées', count: hotelStats?.occupees || 0, color: '#52c41a', bg: '#f6ffed' },
                      { label: 'Disponibles', count: hotelStats?.disponibles || 0, color: '#C9A84C', bg: 'rgba(201,168,76,0.08)' },
                      { label: 'Réservées', count: hotelStats?.reservees || 0, color: '#fa8c16', bg: '#fff7e6' },
                      { label: 'Maintenance', count: hotelStats?.maintenance || 0, color: '#ff4d4f', bg: '#fff2f0' },
                    ].map(({ label, count, color, bg }) => (
                      <div key={label} className="flex items-center justify-between p-2 rounded" style={{ background: bg }}>
                        <span className="text-sm font-medium" style={{ color }}>{label}</span>
                        <Badge count={count} showZero style={{ backgroundColor: color }} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-slate-400 text-center">
                    Total : {hotelStats?.total || 0} chambres
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Répartition CA + Ticket moyen */}
            {ca && ca.total > 0 && (
              <Row gutter={[12, 12]} className="mt-3">
                <Col xs={24} lg={12}>
                  <Card title="Répartition CA du mois" size="small">
                    {[
                      { label: 'Hôtel', value: ca.hotel, color: '#C9A84C' },
                      { label: 'Restaurant', value: ca.restaurant, color: '#fa8c16' },
                      { label: 'Piscine', value: ca.piscine, color: '#13c2c2' },
                      { label: 'Salle de fête', value: ca.salle_fete, color: '#722ed1' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{label}</span>
                          <span style={{ color }}>{value.toLocaleString()} FCFA</span>
                        </div>
                        <Progress
                          percent={ca.total > 0 ? Math.round((value / ca.total) * 100) : 0}
                          strokeColor={color}
                          showInfo
                          size="small"
                        />
                      </div>
                    ))}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Indicateurs restaurant" size="small">
                    <Row gutter={[8, 8]}>
                      <Col span={12}>
                        <Statistic
                          title="Commandes aujourd'hui"
                          value={restoStats?.commandesAujourdHui || 0}
                          valueStyle={{ fontSize: 22 }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Ticket moyen"
                          value={
                            restoStats && restoStats.commandesAujourdHui > 0
                              ? Math.round(restoStats.caJour / restoStats.commandesAujourdHui)
                              : 0
                          }
                          suffix="FCFA"
                          valueStyle={{ fontSize: 22, color: '#3f8600' }}
                        />
                      </Col>
                      <Col span={24}>
                        <div className="text-xs text-slate-400 mt-1">
                          Réservations hôtel en cours :
                          <span className="ml-1 font-semibold text-slate-600">
                            {hotelStats?.reservationsEnCours || 0}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Réservations à venir :
                          <span className="ml-1 font-semibold text-slate-600">
                            {hotelStats?.reservationsAVenir || 0}
                          </span>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            )}
          </>
        )}

        {/* ===== VUE CAISSIER ===== */}
        {isCaissier && (
          <>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <Card hoverable onClick={() => navigate('/caisse-hotel')} className="cursor-pointer" size="small">
                  <Statistic title="Caisse Hôtel" value={0} prefix={<DollarOutlined />} suffix="FCFA" />
                  <div className="mt-1 text-xs text-slate-400">Cliquer pour ouvrir</div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card hoverable onClick={() => navigate('/caisse-restaurant')} className="cursor-pointer" size="small">
                  <Statistic title="Caisse Restaurant" value={restoStats?.caJour || 0} prefix={<CoffeeOutlined />} suffix="FCFA" />
                  <div className="mt-1 text-xs text-slate-400">CA restaurant du jour</div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic title="Occupation hôtel" value={hotelStats?.tauxOccupation || 0} suffix="%" prefix={<HomeOutlined />} />
                  <Progress percent={hotelStats?.tauxOccupation || 0} showInfo={false} size="small" className="mt-2 mb-0" />
                </Card>
              </Col>
            </Row>
            <Row gutter={[12, 12]} className="mt-3">
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic title="Commandes en cours" value={restoStats?.commandesEnPreparation || 0} valueStyle={{ color: '#C9A84C' }} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic title="Séjours en cours" value={hotelStats?.reservationsEnCours || 0} valueStyle={{ color: '#52c41a' }} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic title="Réservations à venir" value={hotelStats?.reservationsAVenir || 0} valueStyle={{ color: '#fa8c16' }} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic title="Chambres libres" value={hotelStats?.disponibles || 0} valueStyle={{ color: '#3f8600' }} />
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* ===== VUE SERVEUR ===== */}
        {isServeur && (
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
              <Card hoverable onClick={() => navigate('/restaurant')} className="cursor-pointer" size="small">
                <Statistic
                  title="En préparation"
                  value={restoStats?.commandesEnPreparation || 0}
                  prefix={<CoffeeOutlined />}
                  valueStyle={{ color: '#C9A84C', fontSize: 28 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card hoverable onClick={() => navigate('/restaurant')} className="cursor-pointer" size="small">
                <Statistic
                  title="Commandes aujourd'hui"
                  value={restoStats?.commandesAujourdHui || 0}
                  prefix={<ShoppingOutlined />}
                  valueStyle={{ fontSize: 28 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic
                  title="CA restaurant du jour"
                  value={restoStats?.caJour || 0}
                  suffix="FCFA"
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#3f8600', fontSize: 20 }}
                />
                <div className="mt-1 text-xs text-slate-400">
                  Ticket moyen :{' '}
                  {restoStats && restoStats.commandesAujourdHui > 0
                    ? Math.round(restoStats.caJour / restoStats.commandesAujourdHui).toLocaleString()
                    : 0}{' '}
                  FCFA
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* ===== VUE EMPLOYE ===== */}
        {!isManager && !isCaissier && !isServeur && (
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} lg={8}>
              <Card hoverable onClick={() => navigate('/hotel')} className="cursor-pointer" size="small">
                <Statistic title="Occupation hôtel" value={hotelStats?.tauxOccupation || 0} suffix="%" prefix={<HomeOutlined />} />
                <Progress percent={hotelStats?.tauxOccupation || 0} showInfo={false} size="small" className="mt-2 mb-0" />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card size="small">
                <Statistic title="Produits actifs" value={produits?.filter((p: { actif: boolean }) => p.actif).length || 0} prefix={<ShoppingOutlined />} />
              </Card>
            </Col>
          </Row>
        )}

        {/* ===== ALERTES STOCK ===== */}
        {!isServeur && alertesProduits.length > 0 && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <WarningOutlined className="text-red-500" />
                Alertes stock
                <Tag color="red">{alertesProduits.length}</Tag>
              </span>
            }
            size="small"
            className="mt-3"
            extra={
              <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => navigate('/produits')}>
                Voir tout
              </Button>
            }
          >
            <List
              dataSource={alertesProduits.slice(0, 5)}
              size="small"
              renderItem={(p: { nom: string; stockActuel: number; unite: string; seuilAlerte: number }) => (
                <List.Item style={{ padding: '4px 0' }}>
                  <div className="flex items-center justify-between w-full">
                    <Typography.Text>{p.nom}</Typography.Text>
                    <Tag color="red">{p.stockActuel} {p.unite} / seuil {p.seuilAlerte}</Tag>
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
    { label: 'Caisse Hôtel', icon: <DollarOutlined />, path: '/caisse-hotel', roles: ['admin', 'manager', 'caissier'] },
    { label: 'Caisse Resto', icon: <CoffeeOutlined />, path: '/caisse-restaurant', roles: ['admin', 'manager', 'caissier'] },
    { label: 'Commandes', icon: <CoffeeOutlined />, path: '/restaurant', roles: ['serveur'] },
    { label: 'Réservations', icon: <HomeOutlined />, path: '/hotel', roles: ['admin', 'manager', 'employe'] },
    { label: 'Rapports', icon: <DollarOutlined />, path: '/rapports', roles: ['admin', 'manager'] },
  ];
  return actions.filter((a) => a.roles.includes(role));
}
