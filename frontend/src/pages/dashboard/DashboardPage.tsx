import { Card, Col, Row, Statistic } from 'antd';
import { TeamOutlined, ShoppingOutlined, DollarOutlined, ScheduleOutlined } from '@ant-design/icons';

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Tableau de bord</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Clients" value={0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Produits" value={0} prefix={<ShoppingOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Ventes du jour" value={0} prefix={<DollarOutlined />} suffix="FCFA" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Presences" value={0} prefix={<ScheduleOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
