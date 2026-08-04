import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Tag, Button, Popconfirm, App } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { ventesApi } from '../../api/ventes';
import type { Creance } from '../../api/ventes';

const statutColors: Record<string, string> = {
  EN_COURS: 'processing',
  EN_RETARD: 'error',
  PAYEE: 'success',
  ANNULEE: 'default',
};

export default function CreancesTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data: creances, isLoading } = useQuery({
    queryKey: ['creances'],
    queryFn: () => ventesApi.getCreances(),
  });

  const payerMutation = useMutation({
    mutationFn: ventesApi.payerCreance,
    onSuccess: () => {
      message.success('Creance marquee comme payee');
      queryClient.invalidateQueries({ queryKey: ['creances'] });
    },
  });

  const columns = [
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: Creance) => `${r.client.nom} ${r.client.prenom || ''}`,
    },
    {
      title: 'Vente',
      dataIndex: ['vente', 'numero'],
      key: 'vente',
    },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      render: (v: number) => `${Number(v).toLocaleString()} FCFA`,
    },
    {
      title: 'Echeance',
      dataIndex: 'dateEcheance',
      key: 'echeance',
      render: (d: string) => {
        const date = new Date(d);
        const isLate = date < new Date();
        return (
          <span style={{ color: isLate ? '#ff4d4f' : undefined }}>
            {date.toLocaleDateString('fr-FR')}
          </span>
        );
      },
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      render: (s: string) => <Tag color={statutColors[s]}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Creance) => (
        <Popconfirm title="Marquer comme payee ?" onConfirm={() => payerMutation.mutate(record.id)}>
          <Button size="small" type="primary" icon={<CheckOutlined />}>
            Payer
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Table
      dataSource={creances || []}
      columns={columns}
      rowKey="id"
      loading={isLoading}
      pagination={{ pageSize: 20 }}
    />
  );
}
