import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Select, InputNumber, DatePicker, Input, Tag, Space, App } from 'antd';
import { PlusOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { hotelApi } from '../../api/hotel';
import { clientsApi } from '../../api/clients';
import type { Reservation, Chambre } from '../../api/hotel';

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: 'orange',
  CONFIRMEE: 'blue',
  EN_COURS: 'green',
  TERMINEE: 'default',
  ANNULEE: 'red',
};

export default function ReservationsTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', filterStatut],
    queryFn: () => hotelApi.getReservations(filterStatut),
  });

  const { data: chambres } = useQuery({
    queryKey: ['chambres'],
    queryFn: hotelApi.getChambres,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.findAll().then((r) => r.data),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
    queryClient.invalidateQueries({ queryKey: ['chambres'] });
    queryClient.invalidateQueries({ queryKey: ['hotel-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: hotelApi.createReservation,
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
    mutationFn: hotelApi.confirmerReservation,
    onSuccess: () => { message.success('Reservation confirmee'); invalidateAll(); },
  });

  const annulerMutation = useMutation({
    mutationFn: hotelApi.annulerReservation,
    onSuccess: () => { message.success('Reservation annulee'); invalidateAll(); },
  });

  const checkInMutation = useMutation({
    mutationFn: hotelApi.checkIn,
    onSuccess: () => { message.success('Check-in effectue'); invalidateAll(); },
  });

  const checkOutMutation = useMutation({
    mutationFn: hotelApi.checkOut,
    onSuccess: () => { message.success('Check-out effectue'); invalidateAll(); },
  });

  const chambresDisponibles = chambres?.filter((c: Chambre) => c.statut === 'DISPONIBLE') || [];

  const columns = [
    {
      title: 'Chambre',
      key: 'chambre',
      width: 100,
      render: (_: unknown, r: Reservation) => `${r.chambre.numero} (${r.chambre.type})`,
    },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: Reservation) => `${r.client.nom} ${r.client.prenom}`,
    },
    {
      title: 'Arrivee',
      dataIndex: 'dateArrivee',
      key: 'arrivee',
      width: 110,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Depart',
      dataIndex: 'dateDepart',
      key: 'depart',
      width: 110,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    { title: 'Pers.', dataIndex: 'nbPersonnes', key: 'pers', width: 60 },
    {
      title: 'Montant',
      dataIndex: 'montantTotal',
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
      render: (_: unknown, r: Reservation) => (
        <Space size="small">
          {r.statut === 'EN_ATTENTE' && (
            <>
              <Button size="small" type="primary" onClick={() => confirmerMutation.mutate(r.id)}>Confirmer</Button>
              <Button size="small" danger onClick={() => annulerMutation.mutate(r.id)}>Annuler</Button>
            </>
          )}
          {(r.statut === 'CONFIRMEE' || r.statut === 'EN_ATTENTE') && (
            <Button size="small" icon={<LoginOutlined />} onClick={() => checkInMutation.mutate(r.id)}>Check-in</Button>
          )}
          {r.statut === 'EN_COURS' && (
            <Button size="small" icon={<LogoutOutlined />} type="primary" onClick={() => checkOutMutation.mutate(r.id)}>Check-out</Button>
          )}
          {r.statut === 'CONFIRMEE' && (
            <Button size="small" danger onClick={() => annulerMutation.mutate(r.id)}>Annuler</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex gap-3">
        <Select
          placeholder="Filtrer par statut"
          allowClear
          style={{ width: 180 }}
          onChange={(v) => setFilterStatut(v || undefined)}
          options={[
            { value: 'EN_ATTENTE', label: 'En attente' },
            { value: 'CONFIRMEE', label: 'Confirmee' },
            { value: 'EN_COURS', label: 'En cours' },
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
        title="Nouvelle reservation"
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
              chambreId: values.chambreId,
              clientId: values.clientId,
              dateArrivee: values.dates[0].format('YYYY-MM-DD'),
              dateDepart: values.dates[1].format('YYYY-MM-DD'),
              nbPersonnes: values.nbPersonnes,
              notes: values.notes || undefined,
            });
          }}
        >
          <Form.Item name="chambreId" label="Chambre" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={chambresDisponibles.map((c: Chambre) => ({
                value: c.id,
                label: `${c.numero} - ${c.type} (${c.capacite} pers.) - ${Number(c.prixNuit).toLocaleString()} FCFA/nuit`,
              }))}
            />
          </Form.Item>
          <Form.Item name="clientId" label="Client" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={clients?.map((c: { id: string; nom: string; prenom?: string }) => ({
                value: c.id,
                label: `${c.nom} ${c.prenom || ''}`.trim(),
              })) || []}
            />
          </Form.Item>
          <Form.Item name="dates" label="Dates (arrivee - depart)" rules={[{ required: true }]}>
            <DatePicker.RangePicker className="w-full" />
          </Form.Item>
          <Form.Item name="nbPersonnes" label="Nombre de personnes" rules={[{ required: true }]} initialValue={1}>
            <InputNumber min={1} max={10} className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
