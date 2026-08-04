import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Row, Col, Statistic, Table, DatePicker, Select, Tabs } from 'antd';
import { TeamOutlined, HomeOutlined, RiseOutlined } from '@ant-design/icons';
import { rapportsApi } from '../../api/rapports';
import dayjs from 'dayjs';

export default function RapportsPage() {
  const now = dayjs();
  const [mois, setMois] = useState(now.month() + 1);
  const [annee, setAnnee] = useState(now.year());
  const [caDateDebut, setCaDateDebut] = useState(now.startOf('month').format('YYYY-MM-DD'));
  const [caDateFin, setCaDateFin] = useState(now.endOf('month').format('YYYY-MM-DD'));

  const { data: ca } = useQuery({
    queryKey: ['rapport-ca', caDateDebut, caDateFin],
    queryFn: () => rapportsApi.getChiffreAffaires(caDateDebut, caDateFin),
  });

  const { data: occupation } = useQuery({
    queryKey: ['rapport-occupation', caDateDebut, caDateFin],
    queryFn: () => rapportsApi.getOccupation(caDateDebut, caDateFin),
  });

  const { data: topProduits } = useQuery({
    queryKey: ['rapport-top-produits'],
    queryFn: () => rapportsApi.getTopProduits(10),
  });

  const { data: personnel } = useQuery({
    queryKey: ['rapport-personnel'],
    queryFn: rapportsApi.getResumePersonnel,
  });

  const { data: resumeMensuel } = useQuery({
    queryKey: ['rapport-mensuel', mois, annee],
    queryFn: () => rapportsApi.getResumeMensuel(mois, annee),
  });

  const tabItems = [
    {
      key: 'ca',
      label: 'Chiffre d\'affaires',
      children: (
        <>
          <div className="mb-4">
            <DatePicker.RangePicker
              defaultValue={[dayjs(caDateDebut), dayjs(caDateFin)]}
              onChange={(dates) => {
                if (dates) {
                  setCaDateDebut(dates[0]?.format('YYYY-MM-DD') || caDateDebut);
                  setCaDateFin(dates[1]?.format('YYYY-MM-DD') || caDateFin);
                }
              }}
            />
          </div>
          <Row gutter={16}>
            <Col span={4}><Card><Statistic title="Ventes" value={ca?.ventes || 0} suffix="FCFA" /></Card></Col>
            <Col span={4}><Card><Statistic title="Hotel" value={ca?.hotel || 0} suffix="FCFA" /></Card></Col>
            <Col span={4}><Card><Statistic title="Restaurant" value={ca?.restaurant || 0} suffix="FCFA" /></Card></Col>
            <Col span={4}><Card><Statistic title="Piscine" value={ca?.piscine || 0} suffix="FCFA" /></Card></Col>
            <Col span={4}><Card><Statistic title="Salle de fete" value={ca?.salleFete || 0} suffix="FCFA" /></Card></Col>
            <Col span={4}><Card><Statistic title="Total" value={ca?.total || 0} suffix="FCFA" valueStyle={{ color: '#3f8600' }} prefix={<RiseOutlined />} /></Card></Col>
          </Row>
        </>
      ),
    },
    {
      key: 'occupation',
      label: 'Occupation Hotel',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Card><Statistic title="Chambres totales" value={occupation?.total || 0} prefix={<HomeOutlined />} /></Card>
          </Col>
          <Col span={8}>
            <Card><Statistic title="Occupees" value={occupation?.occupees || 0} /></Card>
          </Col>
          <Col span={8}>
            <Card><Statistic title="Taux d'occupation" value={occupation?.taux || 0} suffix="%" valueStyle={{ color: (occupation?.taux || 0) > 70 ? '#3f8600' : '#cf1322' }} /></Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'produits',
      label: 'Top Produits',
      children: (
        <Table
          dataSource={topProduits || []}
          columns={[
            { title: '#', key: 'rank', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
            { title: 'Produit', dataIndex: 'nom', key: 'nom' },
            { title: 'Quantite vendue', dataIndex: 'quantite', key: 'quantite' },
          ]}
          rowKey="produitId"
          size="small"
          pagination={false}
        />
      ),
    },
    {
      key: 'personnel',
      label: 'Personnel',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Card><Statistic title="Effectif total" value={personnel?.effectifTotal || 0} prefix={<TeamOutlined />} /></Card>
          </Col>
          <Col span={8}>
            <Card><Statistic title="Presents aujourd'hui" value={personnel?.presentsAujourdhui || 0} valueStyle={{ color: '#3f8600' }} /></Card>
          </Col>
          <Col span={8}>
            <Card><Statistic title="En conge" value={personnel?.enConge || 0} valueStyle={{ color: '#faad14' }} /></Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'mensuel',
      label: 'Resume mensuel',
      children: (
        <>
          <div className="mb-4 flex gap-3">
            <Select
              value={mois}
              onChange={setMois}
              style={{ width: 120 }}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: dayjs().month(i).format('MMMM'),
              }))}
            />
            <Select
              value={annee}
              onChange={setAnnee}
              style={{ width: 100 }}
              options={Array.from({ length: 5 }, (_, i) => ({
                value: now.year() - 2 + i,
                label: `${now.year() - 2 + i}`,
              }))}
            />
          </div>
          <Row gutter={16}>
            <Col span={5}><Card><Statistic title="CA Total" value={resumeMensuel?.caTotal || 0} suffix="FCFA" valueStyle={{ color: '#3f8600' }} /></Card></Col>
            <Col span={5}><Card><Statistic title="Depenses" value={resumeMensuel?.depenses || 0} suffix="FCFA" valueStyle={{ color: '#cf1322' }} /></Card></Col>
            <Col span={5}><Card><Statistic title="Benefice" value={resumeMensuel?.benefice || 0} suffix="FCFA" /></Card></Col>
            <Col span={5}><Card><Statistic title="Nb Ventes" value={resumeMensuel?.nbVentes || 0} /></Card></Col>
            <Col span={4}><Card><Statistic title="Reservations" value={resumeMensuel?.nbReservations || 0} /></Card></Col>
          </Row>
        </>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Rapports & Statistiques</h2>
      <Tabs items={tabItems} />
    </div>
  );
}
