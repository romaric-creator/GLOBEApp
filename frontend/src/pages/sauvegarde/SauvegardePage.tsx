import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Card, Row, Col, Statistic, Tag, App } from 'antd';
import { CloudOutlined, DatabaseOutlined, ReloadOutlined } from '@ant-design/icons';
import { sauvegardeApi } from '../../api/sauvegarde';

const STATUT_COLORS: Record<string, string> = {
  EN_COURS: 'processing',
  REUSSIE: 'success',
  ECHOUEE: 'error',
};

const TYPE_COLORS: Record<string, string> = {
  COMPLETE: 'blue',
  INCREMENTALE: 'cyan',
};

function formatTaille(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function SauvegardePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data: sauvegardes, isLoading } = useQuery({
    queryKey: ['sauvegardes'],
    queryFn: sauvegardeApi.findAll,
  });

  const { data: stats } = useQuery({
    queryKey: ['sauvegarde-stats'],
    queryFn: sauvegardeApi.getStats,
  });

  const createMutation = useMutation({
    mutationFn: sauvegardeApi.create,
    onSuccess: () => {
      message.success('Sauvegarde lancee');
      queryClient.invalidateQueries({ queryKey: ['sauvegardes'] });
      queryClient.invalidateQueries({ queryKey: ['sauvegarde-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    },
  });

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 160,
      render: (d: string) => new Date(d).toLocaleString('fr-FR'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (t: string) => <Tag color={TYPE_COLORS[t]}>{t}</Tag>,
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 110,
      render: (s: string) => <Tag color={STATUT_COLORS[s]}>{s.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Taille',
      dataIndex: 'taille',
      key: 'taille',
      width: 100,
      render: (t: number | null) => formatTaille(t),
    },
    {
      title: 'Chemin',
      dataIndex: 'chemin',
      key: 'chemin',
      ellipsis: true,
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Sauvegarde & Restauration</h2>

      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card><Statistic title="Total sauvegardes" value={stats?.totalSauvegardes || 0} prefix={<DatabaseOutlined />} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Derniere sauvegarde" value={stats?.derniereSauvegarde ? new Date(stats.derniereSauvegarde).toLocaleString('fr-FR') : 'Aucune'} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Taille totale" value={formatTaille(stats?.tailleTotale || 0)} /></Card>
        </Col>
      </Row>

      <div className="mb-3 flex gap-3">
        <Button
          type="primary"
          icon={<CloudOutlined />}
          loading={createMutation.isPending}
          onClick={() => createMutation.mutate('COMPLETE')}
        >
          Sauvegarde complete
        </Button>
        <Button
          icon={<ReloadOutlined />}
          loading={createMutation.isPending}
          onClick={() => createMutation.mutate('INCREMENTALE')}
        >
          Sauvegarde incrementale
        </Button>
      </div>

      <Table dataSource={sauvegardes || []} columns={columns} rowKey="id" loading={isLoading} size="small" />
    </div>
  );
}
