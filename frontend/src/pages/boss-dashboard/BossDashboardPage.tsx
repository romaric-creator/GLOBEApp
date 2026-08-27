import { Card, Statistic, Spin, Tag, Progress, Badge, Alert } from 'antd';
import {
  DollarOutlined, HomeOutlined, CoffeeOutlined,
  WarningOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { hotelApi } from '../../api/hotel';
import { rapportsApi } from '../../api/rapports';
import { restaurantApi } from '../../api/restaurant';
import { caisseApi } from '../../api/caisse';
import { produitsApi } from '../../api/produits';
import dayjs from 'dayjs';

export default function BossDashboardPage() {
  const today = dayjs().format('YYYY-MM-DD');
  const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');

  const { data: hotelStats, isLoading: loadHotel } = useQuery({
    queryKey: ['boss-hotel-stats'],
    queryFn: hotelApi.getStats,
    refetchInterval: 30_000,
  });

  const { data: ca, isLoading: loadCa } = useQuery({
    queryKey: ['boss-ca', startOfMonth, today],
    queryFn: () => rapportsApi.getChiffreAffaires(startOfMonth, today),
    refetchInterval: 60_000,
  });

  const { data: restoStats } = useQuery({
    queryKey: ['boss-resto'],
    queryFn: restaurantApi.getStats,
    refetchInterval: 30_000,
  });

  const { data: caisses } = useQuery({
    queryKey: ['boss-caisses'],
    queryFn: caisseApi.getCaisses,
    refetchInterval: 30_000,
  });

  const { data: produits } = useQuery({
    queryKey: ['boss-produits'],
    queryFn: () => produitsApi.findAll().then((r) => r.data),
    refetchInterval: 120_000,
  });

  const loading = loadHotel || loadCa;
  const alertesProduits = produits?.filter((p: { actif: boolean; stockActuel: number; seuilAlerte: number }) => p.actif && p.stockActuel <= p.seuilAlerte) || [];

  const caisseHotel = caisses?.find((c) => c.type === 'HOTEL');
  const caisseResto = caisses?.find((c) => c.type === 'RESTAURANT_BAR');
  const caisseHotelOuverte = caisseHotel?.sessions?.some((s) => s.statut === 'OUVERTE');
  const caisseRestoOuverte = caisseResto?.sessions?.some((s) => s.statut === 'OUVERTE');

  return (
    <Spin spinning={loading}>
      <div className="max-w-md mx-auto px-3 py-4 space-y-3">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold m-0" style={{ color: '#C9A84C' }}>GLOBE Residence</h1>
          <p className="text-xs text-slate-500 m-0">{dayjs().format('dddd D MMMM YYYY — HH:mm')}</p>
        </div>

        {/* CA du jour/mois */}
        <Card size="small" className="shadow-sm">
          <div className="flex justify-between items-center">
            <Statistic
              title="CA du mois"
              value={ca?.total || 0}
              prefix={<DollarOutlined />}
              suffix="FCFA"
              valueStyle={{ fontSize: 18, color: '#3f8600' }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span>Hotel: {(ca?.hotel || 0).toLocaleString()}</span>
            <span>Resto: {(ca?.restaurant || 0).toLocaleString()}</span>
          </div>
        </Card>

        {/* Occupation Hotel */}
        <Card size="small" className="shadow-sm">
          <div className="flex justify-between items-center">
            <Statistic
              title="Occupation hotel"
              value={hotelStats?.tauxOccupation || 0}
              suffix="%"
              prefix={<HomeOutlined />}
              valueStyle={{ fontSize: 18 }}
            />
            <div className="text-right text-xs space-y-1">
              <div><Badge color="#52c41a" text={`${hotelStats?.occupees || 0} occupees`} /></div>
              <div><Badge color="#C9A84C" text={`${hotelStats?.disponibles || 0} libres`} /></div>
              <div><Badge color="#fa8c16" text={`${hotelStats?.reservees || 0} reservees`} /></div>
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

        {/* Restaurant */}
        <Card size="small" className="shadow-sm">
          <div className="flex justify-between items-center">
            <Statistic
              title="Restaurant aujourd'hui"
              value={restoStats?.caJour || 0}
              prefix={<CoffeeOutlined />}
              suffix="FCFA"
              valueStyle={{ fontSize: 16, color: '#fa8c16' }}
            />
            <div className="text-right text-xs">
              <div>{restoStats?.commandesEnPreparation || 0} en prep.</div>
              <div>{restoStats?.commandesAujourdHui || 0} commandes</div>
            </div>
          </div>
        </Card>

        {/* Caisses */}
        <Card size="small" title="Caisses" className="shadow-sm">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Caisse Hotel</span>
              {caisseHotelOuverte ? (
                <Tag icon={<CheckCircleOutlined />} color="success">Ouverte</Tag>
              ) : (
                <Tag icon={<CloseCircleOutlined />} color="default">Fermee</Tag>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Caisse Restaurant</span>
              {caisseRestoOuverte ? (
                <Tag icon={<CheckCircleOutlined />} color="success">Ouverte</Tag>
              ) : (
                <Tag icon={<CloseCircleOutlined />} color="default">Fermee</Tag>
              )}
            </div>
          </div>
        </Card>

        {/* Alertes */}
        {alertesProduits.length > 0 && (
          <Alert
            type="warning"
            icon={<WarningOutlined />}
            showIcon
            message={`${alertesProduits.length} produit(s) en alerte stock`}
            description={
              <ul className="m-0 pl-4 text-xs">
                {alertesProduits.slice(0, 5).map((p: { nom: string; stockActuel: number; unite: string }) => (
                  <li key={p.nom}>{p.nom} — {p.stockActuel} {p.unite}</li>
                ))}
              </ul>
            }
          />
        )}

        {hotelStats && hotelStats.maintenance > 0 && (
          <Alert
            type="error"
            showIcon
            message={`${hotelStats.maintenance} chambre(s) en maintenance`}
          />
        )}
      </div>
    </Spin>
  );
}
