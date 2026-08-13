import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Select, InputNumber, DatePicker, Input, Tag, Space, App, Popconfirm } from 'antd';
import { PlusOutlined, LoginOutlined, LogoutOutlined, UserAddOutlined } from '@ant-design/icons';
import { hotelApi } from '../../api/hotel';
import { clientsApi } from '../../api/clients';
import type { Client } from '../../api/clients';
import type { Reservation, Chambre } from '../../api/hotel';

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: 'orange',
  CONFIRMEE: 'gold',
  EN_COURS: 'green',
  TERMINEE: 'default',
  ANNULEE: 'red',
};

export default function ReservationsTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string | undefined>(undefined);
  const [maxPersonnes, setMaxPersonnes] = useState(10);
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', filterStatut],
    queryFn: () => hotelApi.getReservations(filterStatut),
    refetchInterval: 30_000,
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
      setMaxPersonnes(10);
      invalidateAll();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Une erreur s\'est produite. Veuillez réessayer.');
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

  const createClientMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: (res) => {
      message.success('Client cree');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      form.setFieldValue('clientId', res.data.id);
      setNewClientOpen(false);
      setModalOpen(true);
      clientForm.resetFields();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Une erreur s\'est produite. Veuillez réessayer.');
    },
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
              <Popconfirm title="Confirmer cette reservation ?" onConfirm={() => confirmerMutation.mutate(r.id)} okText="Confirmer" cancelText="Non">
                <Button size="small" type="primary">Confirmer</Button>
              </Popconfirm>
              <Popconfirm title="Annuler cette reservation ?" onConfirm={() => annulerMutation.mutate(r.id)} okButtonProps={{ danger: true }} okText="Annuler" cancelText="Non">
                <Button size="small" danger>Annuler</Button>
              </Popconfirm>
            </>
          )}
          {r.statut === 'CONFIRMEE' && (
            <>
              <Popconfirm title="Effectuer le check-in ?" onConfirm={() => checkInMutation.mutate(r.id)} okText="Check-in" cancelText="Non">
                <Button size="small" icon={<LoginOutlined />}>Check-in</Button>
              </Popconfirm>
              <Popconfirm title="Annuler cette reservation ?" onConfirm={() => annulerMutation.mutate(r.id)} okButtonProps={{ danger: true }} okText="Annuler" cancelText="Non">
                <Button size="small" danger>Annuler</Button>
              </Popconfirm>
            </>
          )}
          {r.statut === 'EN_COURS' && (
            <Popconfirm title="Effectuer le check-out ?" description="Le sejour sera cloture et la facture generee." onConfirm={() => checkOutMutation.mutate(r.id)} okText="Check-out" cancelText="Non">
              <Button size="small" icon={<LogoutOutlined />} type="primary">Check-out</Button>
            </Popconfirm>
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
        onCancel={() => { setModalOpen(false); form.resetFields(); setMaxPersonnes(10); }}
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
                capacite: c.capacite,
              }))}
              onChange={(val) => {
                const ch = chambresDisponibles.find((c: Chambre) => c.id === val);
                if (ch) {
                  setMaxPersonnes(ch.capacite);
                  form.setFieldValue('nbPersonnes', Math.min(form.getFieldValue('nbPersonnes') || 1, ch.capacite));
                }
              }}
            />
          </Form.Item>
          <Form.Item label="Client" required style={{ marginBottom: 8 }}>
            <div className="flex gap-2">
              <Form.Item name="clientId" rules={[{ required: true, message: 'Client requis' }]} className="flex-1 mb-0">
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Rechercher un client..."
                  options={(clients || []).map((c: Client) => ({
                    value: c.id,
                    label: `${c.nom}${c.prenom ? ' ' + c.prenom : ''}`,
                  }))}
                />
              </Form.Item>
              <Button icon={<UserAddOutlined />} onClick={() => { setModalOpen(false); setNewClientOpen(true); }} title="Nouveau client" />
            </div>
          </Form.Item>
          <Form.Item name="dates" label="Dates (arrivee - depart)" rules={[{ required: true }]}>
            <DatePicker.RangePicker className="w-full" />
          </Form.Item>
          <Form.Item
            name="nbPersonnes"
            label={`Nombre de personnes (max ${maxPersonnes})`}
            rules={[{ required: true }]}
            initialValue={1}
          >
            <InputNumber min={1} max={maxPersonnes} className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Nouveau client"
        open={newClientOpen}
        onCancel={() => { setNewClientOpen(false); setModalOpen(true); clientForm.resetFields(); }}
        onOk={() => clientForm.submit()}
        confirmLoading={createClientMutation.isPending}
        width={400}
        okText="Creer"
      >
        <Form
          form={clientForm}
          layout="vertical"
          onFinish={(values) => createClientMutation.mutate(values)}
        >
          <Form.Item name="nom" label="Nom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="prenom" label="Prenom">
            <Input />
          </Form.Item>
          <Form.Item name="telephone" label="Telephone">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="type" label="Type" initialValue="PARTICULIER">
            <Select options={[
              { value: 'PARTICULIER', label: 'Particulier' },
              { value: 'PROFESSIONNEL', label: 'Professionnel' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
