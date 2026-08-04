import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Select, Input, InputNumber, DatePicker, TimePicker, Tag, Card, Row, Col, Statistic, Space, App } from 'antd';
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import { salleFeteApi } from '../../api/salle-fete';
import { clientsApi } from '../../api/clients';
import type { ReservationSalle } from '../../api/salle-fete';

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: 'orange',
  CONFIRMEE: 'green',
  ANNULEE: 'red',
  TERMINEE: 'default',
};

export default function SalleFetePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations-salle', filterStatut],
    queryFn: () => salleFeteApi.getReservations(filterStatut),
  });

  const { data: stats } = useQuery({
    queryKey: ['salle-fete-stats'],
    queryFn: salleFeteApi.getStats,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.findAll().then((r) => r.data),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['reservations-salle'] });
    queryClient.invalidateQueries({ queryKey: ['salle-fete-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: salleFeteApi.createReservation,
    onSuccess: () => {
      message.success('Reservation creee');
      setModalOpen(false);
      form.resetFields();
      invalidateAll();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const confirmerMutation = useMutation({
    mutationFn: salleFeteApi.confirmer,
    onSuccess: () => { message.success('Reservation confirmee'); invalidateAll(); },
  });

  const annulerMutation = useMutation({
    mutationFn: salleFeteApi.annuler,
    onSuccess: () => { message.success('Reservation annulee'); invalidateAll(); },
  });

  const terminerMutation = useMutation({
    mutationFn: salleFeteApi.terminer,
    onSuccess: () => { message.success('Evenement termine'); invalidateAll(); },
  });

  const columns = [
    {
      title: 'Date',
      dataIndex: 'dateEvent',
      key: 'date',
      width: 100,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Horaire',
      key: 'horaire',
      width: 110,
      render: (_: unknown, r: ReservationSalle) => `${r.heureDebut} - ${r.heureFin}`,
    },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: ReservationSalle) => `${r.client.nom} ${r.client.prenom}`,
    },
    { title: 'Motif', dataIndex: 'motif', key: 'motif' },
    { title: 'Invites', dataIndex: 'nbInvites', key: 'invites', width: 70 },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      width: 120,
      render: (m: number) => `${Number(m).toLocaleString()} FCFA`,
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 110,
      render: (s: string) => <Tag color={STATUT_COLORS[s]}>{s.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, r: ReservationSalle) => (
        <Space size="small">
          {r.statut === 'EN_ATTENTE' && (
            <>
              <Button size="small" type="primary" onClick={() => confirmerMutation.mutate(r.id)}>Confirmer</Button>
              <Button size="small" danger onClick={() => annulerMutation.mutate(r.id)}>Annuler</Button>
            </>
          )}
          {r.statut === 'CONFIRMEE' && (
            <>
              <Button size="small" onClick={() => terminerMutation.mutate(r.id)}>Terminer</Button>
              <Button size="small" danger onClick={() => annulerMutation.mutate(r.id)}>Annuler</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Salle de fete</h2>

      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card><Statistic title="Reservations a venir" value={stats?.reservationsAVenir || 0} prefix={<CalendarOutlined />} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Total reservations" value={stats?.totalReservations || 0} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="CA du mois" value={stats?.caMois || 0} suffix="FCFA" /></Card>
        </Col>
      </Row>

      <div className="mb-3 flex gap-3">
        <Select
          placeholder="Filtrer par statut"
          allowClear
          style={{ width: 160 }}
          onChange={(v) => setFilterStatut(v || undefined)}
          options={[
            { value: 'EN_ATTENTE', label: 'En attente' },
            { value: 'CONFIRMEE', label: 'Confirmee' },
            { value: 'TERMINEE', label: 'Terminee' },
            { value: 'ANNULEE', label: 'Annulee' },
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouvelle reservation
        </Button>
      </div>

      <Table dataSource={reservations || []} columns={columns} rowKey="id" loading={isLoading} size="small" />

      <Modal
        title="Reserver la salle de fete"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            createMutation.mutate({
              dateEvent: values.dateEvent.format('YYYY-MM-DD'),
              heureDebut: values.heureDebut.format('HH:mm'),
              heureFin: values.heureFin.format('HH:mm'),
              nbInvites: values.nbInvites,
              motif: values.motif,
              montant: values.montant,
              clientId: values.clientId,
              notes: values.notes || undefined,
            });
          }}
        >
          <Form.Item name="clientId" label="Client" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={clients?.map((c: { id: string; nom: string; prenom: string }) => ({
                value: c.id,
                label: `${c.nom} ${c.prenom}`,
              })) || []}
            />
          </Form.Item>
          <Form.Item name="dateEvent" label="Date de l'evenement" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <div className="flex gap-3">
            <Form.Item name="heureDebut" label="Debut" rules={[{ required: true }]} className="flex-1">
              <TimePicker format="HH:mm" className="w-full" />
            </Form.Item>
            <Form.Item name="heureFin" label="Fin" rules={[{ required: true }]} className="flex-1">
              <TimePicker format="HH:mm" className="w-full" />
            </Form.Item>
          </div>
          <Form.Item name="motif" label="Motif" rules={[{ required: true }]}>
            <Input placeholder="Mariage, Anniversaire, Seminaire..." />
          </Form.Item>
          <Form.Item name="nbInvites" label="Nombre d'invites" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="montant" label="Montant (FCFA)" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
