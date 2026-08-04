import { Card, Col, Row, Statistic } from 'antd';
import { TeamOutlined, ShoppingOutlined, DollarOutlined, ScheduleOutlined, HomeOutlined, CoffeeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../../api/clients';
import { produitsApi } from '../../api/produits';
import { rapportsApi } from '../../api/rapports';
import { hotelApi } from '../../api/hotel';
import dayjs from 'dayjs';

export default function DashboardPage() {
  const today = dayjs().format('YYYY-MM-DD');
  const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.findAll().then((r) => r.data),
  });

  const { data: produits } = useQuery({
    queryKey: ['produits'],
    queryFn: () => produitsApi.findAll().then((r) => r.data),
  });

  const { data: ca } = useQuery({
    queryKey: ['dashboard-ca'],
    queryFn: () => rapportsApi.getChiffreAffaires(startOfMonth, today),
  });

  const { data: personnel } = useQuery({
    queryKey: ['dashboard-personnel'],
    queryFn: rapportsApi.getResumePersonnel,
  });

  const { data: hotelStats } = useQuery({
    queryKey: ['dashboard-hotel'],
    queryFn: hotelApi.getStats,
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Tableau de bord</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Clients" value={clients?.length || 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Produits" value={produits?.length || 0} prefix={<ShoppingOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="CA du mois" value={ca?.total || 0} prefix={<DollarOutlined />} suffix="FCFA" valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Presents aujourd'hui" value={personnel?.presentsAujourdhui || 0} prefix={<ScheduleOutlined />} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Occupation hotel" value={hotelStats?.tauxOccupation || 0} suffix="%" prefix={<HomeOutlined />} />
          </Card>
        </Col>
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
            <Statistic title="Personnel en conge" value={personnel?.enConge || 0} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
