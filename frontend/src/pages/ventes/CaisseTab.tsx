import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, InputNumber, Space, Statistic, Row, Col, Table, Tag, App, Divider } from 'antd';
import { LockOutlined, UnlockOutlined, DollarOutlined } from '@ant-design/icons';
import { ventesApi } from '../../api/ventes';
import type { ClotureCaisse } from '../../api/ventes';

export default function CaisseTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [montantOuverture, setMontantOuverture] = useState(0);
  const [montantCloture, setMontantCloture] = useState(0);

  const { data: etat } = useQuery({
    queryKey: ['caisse-etat'],
    queryFn: ventesApi.getEtatCaisse,
  });

  const { data: historique } = useQuery({
    queryKey: ['caisse-historique'],
    queryFn: () => ventesApi.getHistoriqueCaisse(),
  });

  const ouvrirMutation = useMutation({
    mutationFn: () => ventesApi.ouvrirCaisse(montantOuverture),
    onSuccess: () => {
      message.success('Caisse ouverte');
      queryClient.invalidateQueries({ queryKey: ['caisse-etat'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const cloturerMutation = useMutation({
    mutationFn: () => ventesApi.cloturerCaisse(montantCloture),
    onSuccess: () => {
      message.success('Caisse cloturee');
      queryClient.invalidateQueries({ queryKey: ['caisse-etat'] });
      queryClient.invalidateQueries({ queryKey: ['caisse-historique'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    { title: 'Caissier', key: 'user', render: (_: unknown, r: ClotureCaisse) => r.user ? `${r.user.nom} ${r.user.prenom}` : '-' },
    { title: 'Ouverture', dataIndex: 'montantOuverture', key: 'ouv', render: (v: number) => `${Number(v).toLocaleString()} DA` },
    { title: 'Cloture', dataIndex: 'montantCloture', key: 'clot', render: (v: number) => Number(v) > 0 ? `${Number(v).toLocaleString()} DA` : '-' },
    {
      title: 'Ecart',
      dataIndex: 'ecart',
      key: 'ecart',
      render: (v: number) => {
        const n = Number(v);
        if (n === 0) return <Tag color="green">0 DA</Tag>;
        return <Tag color={n > 0 ? 'blue' : 'red'}>{n > 0 ? '+' : ''}{n} DA</Tag>;
      },
    },
  ];

  return (
    <Space direction="vertical" className="w-full" size="large">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Statut"
              value={etat?.caisseOuverte ? 'OUVERTE' : 'FERMEE'}
              valueStyle={{ color: etat?.caisseOuverte ? '#52c41a' : '#ff4d4f' }}
              prefix={etat?.caisseOuverte ? <UnlockOutlined /> : <LockOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Fond de caisse"
              value={etat?.montantOuverture || 0}
              suffix="DA"
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Ventes du jour"
              value={etat?.totalVentes || 0}
              suffix="DA"
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Nb ventes" value={etat?.nbVentes || 0} />
          </Card>
        </Col>
      </Row>

      {etat?.ventesParMode && etat.ventesParMode.length > 0 && (
        <Card title="Repartition par mode de paiement" size="small">
          <Row gutter={16}>
            {etat.ventesParMode.map((v) => (
              <Col key={v.mode} span={4}>
                <Statistic title={v.mode} value={v.total} suffix="DA" />
                <Tag>{v.count} vente(s)</Tag>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <Card title={etat?.caisseOuverte ? 'Cloturer la caisse' : 'Ouvrir la caisse'} size="small">
        {!etat?.caisseOuverte ? (
          <Space>
            <InputNumber
              placeholder="Montant d'ouverture"
              min={0}
              value={montantOuverture}
              onChange={(v) => setMontantOuverture(v || 0)}
              addonAfter="DA"
              style={{ width: 200 }}
            />
            <Button type="primary" icon={<UnlockOutlined />} onClick={() => ouvrirMutation.mutate()} loading={ouvrirMutation.isPending}>
              Ouvrir la caisse
            </Button>
          </Space>
        ) : (
          <Space>
            <InputNumber
              placeholder="Montant en caisse"
              min={0}
              value={montantCloture}
              onChange={(v) => setMontantCloture(v || 0)}
              addonAfter="DA"
              style={{ width: 200 }}
            />
            <Button type="primary" danger icon={<LockOutlined />} onClick={() => cloturerMutation.mutate()} loading={cloturerMutation.isPending}>
              Cloturer la caisse
            </Button>
          </Space>
        )}
      </Card>

      <Divider orientation="left">Historique des clotures</Divider>
      <Table
        dataSource={historique?.data || []}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10 }}
      />
    </Space>
  );
}
