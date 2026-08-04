import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Select, InputNumber, DatePicker, Tag, Card, Row, Col, Statistic, App } from 'antd';
import { PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { piscineApi } from '../../api/piscine';
import { clientsApi } from '../../api/clients';
import type { TicketPiscine } from '../../api/piscine';

const TYPE_LABELS: Record<string, string> = {
  JOURNALIER: 'Journalier',
  ABONNEMENT_MENSUEL: 'Mensuel',
  ABONNEMENT_ANNUEL: 'Annuel',
};

const TYPE_COLORS: Record<string, string> = {
  JOURNALIER: 'blue',
  ABONNEMENT_MENSUEL: 'purple',
  ABONNEMENT_ANNUEL: 'gold',
};

export default function TicketsTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets-piscine'],
    queryFn: () => piscineApi.getTickets(),
  });

  const { data: stats } = useQuery({
    queryKey: ['piscine-stats'],
    queryFn: piscineApi.getStats,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.findAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: piscineApi.createTicket,
    onSuccess: () => {
      message.success('Ticket cree');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['tickets-piscine'] });
      queryClient.invalidateQueries({ queryKey: ['piscine-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const utiliserMutation = useMutation({
    mutationFn: piscineApi.utiliserTicket,
    onSuccess: () => {
      message.success('Ticket valide');
      queryClient.invalidateQueries({ queryKey: ['tickets-piscine'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (t: string) => <Tag color={TYPE_COLORS[t]}>{TYPE_LABELS[t]}</Tag>,
    },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: TicketPiscine) => r.client ? `${r.client.nom} ${r.client.prenom}` : 'Anonyme',
    },
    {
      title: 'Prix',
      dataIndex: 'prix',
      key: 'prix',
      width: 110,
      render: (p: number) => `${Number(p).toLocaleString()} FCFA`,
    },
    {
      title: 'Debut',
      dataIndex: 'dateDebut',
      key: 'debut',
      width: 100,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Fin',
      dataIndex: 'dateFin',
      key: 'fin',
      width: 100,
      render: (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '-',
    },
    {
      title: 'Statut',
      dataIndex: 'utilise',
      key: 'statut',
      width: 90,
      render: (u: boolean) => <Tag color={u ? 'default' : 'green'}>{u ? 'Utilise' : 'Valide'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, r: TicketPiscine) =>
        !r.utilise && (
          <Button size="small" icon={<CheckOutlined />} onClick={() => utiliserMutation.mutate(r.id)}>
            Valider
          </Button>
        ),
    },
  ];

  return (
    <>
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card><Statistic title="Tickets aujourd'hui" value={stats?.ticketsAujourdHui || 0} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Total tickets" value={stats?.totalTickets || 0} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Abonnements actifs" value={stats?.abonnementsActifs || 0} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="CA du jour" value={stats?.caJour || 0} suffix="FCFA" /></Card>
        </Col>
      </Row>

      <div className="mb-3">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouveau ticket
        </Button>
      </div>

      <Table dataSource={tickets || []} columns={columns} rowKey="id" loading={isLoading} size="small" />

      <Modal
        title="Nouveau ticket piscine"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            createMutation.mutate({
              type: values.type,
              prix: values.prix,
              dateDebut: values.dateDebut.format('YYYY-MM-DD'),
              clientId: values.clientId || undefined,
            });
          }}
        >
          <Form.Item name="type" label="Type" rules={[{ required: true }]} initialValue="JOURNALIER">
            <Select options={[
              { value: 'JOURNALIER', label: 'Journalier' },
              { value: 'ABONNEMENT_MENSUEL', label: 'Abonnement Mensuel' },
              { value: 'ABONNEMENT_ANNUEL', label: 'Abonnement Annuel' },
            ]} />
          </Form.Item>
          <Form.Item name="prix" label="Prix (FCFA)" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="dateDebut" label="Date debut" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="clientId" label="Client (optionnel)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={clients?.map((c: { id: string; nom: string; prenom?: string }) => ({
                value: c.id,
                label: `${c.nom} ${c.prenom || ''}`.trim(),
              })) || []}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
