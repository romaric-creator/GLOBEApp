import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsg } from '../../hooks/useMsg';
import {
  Table, Button, Modal, Form, Select, Input, InputNumber,
  DatePicker, TimePicker, Tag, Card, Row, Col, Statistic,
  Space, App, Tabs, Popconfirm, Tooltip, Dropdown,
} from 'antd';
import {
  PlusOutlined, CalendarOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, InfoCircleOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { exportToExcel, exportToPDF } from '../../utils/export';
import { salleFeteApi } from '../../api/salle-fete';
import { clientsApi } from '../../api/clients';
import type { ReservationSalle, TypeReservationSalle } from '../../api/salle-fete';
import type { Client } from '../../api/clients';
import { useAuthStore } from '../../store/auth';

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: 'orange',
  CONFIRMEE: 'green',
  ANNULEE: 'red',
  TERMINEE: 'default',
};

const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONFIRMEE: 'Confirmee',
  ANNULEE: 'Annulee',
  TERMINEE: 'Terminee',
};

// ─────────────────────────────────────────────────────────
// Onglet Types de réservation
// ─────────────────────────────────────────────────────────
function TypesTab() {
  const { message } = App.useApp();
  const { err } = useMsg();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<TypeReservationSalle | null>(null);
  const [form] = Form.useForm();

  const { data: types, isLoading } = useQuery({
    queryKey: ['types-reservation-salle'],
    queryFn: salleFeteApi.getTypes,
  });

  const createMutation = useMutation({
    mutationFn: salleFeteApi.createType,
    onSuccess: () => {
      message.success('Type cree');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['types-reservation-salle'] });
    },
    onError: (e: unknown) => err(e),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof salleFeteApi.updateType>[1] }) =>
      salleFeteApi.updateType(id, data),
    onSuccess: () => {
      message.success('Type modifie');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['types-reservation-salle'] });
    },
    onError: (e: unknown) => err(e),
  });

  const deleteMutation = useMutation({
    mutationFn: salleFeteApi.deleteType,
    onSuccess: () => {
      message.success('Type desactive');
      queryClient.invalidateQueries({ queryKey: ['types-reservation-salle'] });
    },
    onError: (e: unknown) => err(e),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingType(null);
    form.resetFields();
  };

  const openEdit = (t: TypeReservationSalle) => {
    setEditingType(t);
    form.setFieldsValue(t);
    setModalOpen(true);
  };

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      render: (nom: string, record: TypeReservationSalle) => (
        <div>
          <div className="font-medium">{nom}</div>
          {record.description && (
            <div className="text-xs text-slate-400">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Inclusions',
      dataIndex: 'inclusions',
      key: 'inclusions',
      render: (v: string | null) => v ? (
        <Tooltip title={v}>
          <span className="text-sm text-slate-500 truncate max-w-xs block">{v}</span>
        </Tooltip>
      ) : <span className="text-slate-300">—</span>,
    },
    {
      title: 'Prix de base',
      dataIndex: 'prixBase',
      key: 'prixBase',
      width: 140,
      render: (v: number) => `${Number(v).toLocaleString()} FCFA`,
    },
    ...(isAdmin ? [{
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: TypeReservationSalle) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Supprimer ce type ?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <>
      {isAdmin && (
        <div className="flex justify-end mb-3">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Nouveau type
          </Button>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={types || []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Aucun type defini. Creez vos propres types (ex: Simple, Avec decoration, Avec couverts...)' }}
      />

      <Modal
        title={editingType ? 'Modifier le type' : 'Nouveau type de reservation'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingType ? 'Enregistrer' : 'Creer'}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ prixBase: 0 }}
          onFinish={(values) => {
            if (editingType) {
              updateMutation.mutate({ id: editingType.id, data: values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item name="nom" label="Nom du type" rules={[{ required: true, message: 'Nom requis' }]}>
            <Input placeholder="Ex: Simple, Avec decoration, Avec couverts, VIP..." />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Courte description de ce type de reservation" />
          </Form.Item>
          <Form.Item
            name="inclusions"
            label={
              <span>
                Inclusions{' '}
                <Tooltip title="Ce qui est inclus dans ce type : decoration, couverts, sono, etc.">
                  <InfoCircleOutlined className="text-slate-400" />
                </Tooltip>
              </span>
            }
          >
            <Input.TextArea rows={3} placeholder="Ex: Decoration florale, 100 couverts, Sono..." />
          </Form.Item>
          <Form.Item name="prixBase" label="Prix de base (FCFA)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Onglet Réservations
// ─────────────────────────────────────────────────────────
function ReservationsTab() {
  const { message } = App.useApp();
  const { err } = useMsg();
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

  const { data: types } = useQuery({
    queryKey: ['types-reservation-salle'],
    queryFn: salleFeteApi.getTypes,
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
    onError: (e: unknown) => err(e),
  });

  const confirmerMutation = useMutation({
    mutationFn: salleFeteApi.confirmer,
    onSuccess: () => { message.success('Reservation confirmee'); invalidateAll(); },
    onError: (e: unknown) => err(e),
  });

  const annulerMutation = useMutation({
    mutationFn: salleFeteApi.annuler,
    onSuccess: () => { message.success('Reservation annulee'); invalidateAll(); },
    onError: (e: unknown) => err(e),
  });

  const terminerMutation = useMutation({
    mutationFn: salleFeteApi.terminer,
    onSuccess: () => { message.success('Evenement termine'); invalidateAll(); },
    onError: (e: unknown) => err(e),
  });

  const columns = [
    {
      title: 'Date',
      dataIndex: 'dateEvent',
      key: 'date',
      width: 100,
      sorter: (a: ReservationSalle, b: ReservationSalle) =>
        new Date(a.dateEvent).getTime() - new Date(b.dateEvent).getTime(),
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Horaire',
      key: 'horaire',
      width: 110,
      render: (_: unknown, r: ReservationSalle) => `${r.heureDebut} à ${r.heureFin}`,
    },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: ReservationSalle) => (
        <div>
          <div>{r.client.nom} {r.client.prenom}</div>
          {r.client.telephone && <div className="text-xs text-slate-400">{r.client.telephone}</div>}
        </div>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      width: 140,
      render: (_: unknown, r: ReservationSalle) => r.type
        ? <Tag color="purple">{r.type.nom}</Tag>
        : <span className="text-slate-300 text-xs">Non defini</span>,
    },
    { title: 'Motif', dataIndex: 'motif', key: 'motif' },
    { title: 'Invites', dataIndex: 'nbInvites', key: 'invites', width: 70 },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      width: 130,
      render: (m: number) => `${Number(m).toLocaleString()} FCFA`,
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 110,
      render: (s: string) => <Tag color={STATUT_COLORS[s]}>{STATUT_LABELS[s]}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, r: ReservationSalle) => (
        <Space size="small">
          {r.statut === 'EN_ATTENTE' && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                onClick={() => confirmerMutation.mutate(r.id)}>
                Confirmer
              </Button>
              <Popconfirm title="Annuler cette reservation ?" onConfirm={() => annulerMutation.mutate(r.id)}>
                <Button size="small" danger>Annuler</Button>
              </Popconfirm>
            </>
          )}
          {r.statut === 'CONFIRMEE' && (
            <>
              <Button size="small" onClick={() => terminerMutation.mutate(r.id)}>Terminer</Button>
              <Popconfirm title="Annuler cette reservation ?" onConfirm={() => annulerMutation.mutate(r.id)}>
                <Button size="small" danger>Annuler</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card size="small">
            <Statistic title="A venir" value={stats?.reservationsAVenir || 0} prefix={<CalendarOutlined />} styles={{ content: { color: '#C9A84C' } }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Total reservations" value={stats?.totalReservations || 0} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="CA du mois" value={stats?.caMois || 0} suffix="FCFA" styles={{ content: { color: '#52c41a' } }} />
          </Card>
        </Col>
      </Row>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-3">
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
        <Dropdown menu={{
          items: [
            {
              key: 'excel',
              label: 'Exporter Excel',
              onClick: () => exportToExcel(
                (reservations || []).map((r) => ({
                  Date: new Date(r.dateEvent).toLocaleDateString('fr-FR'),
                  Horaire: `${r.heureDebut} - ${r.heureFin}`,
                  Client: `${r.client.nom} ${r.client.prenom}`,
                  Type: r.type?.nom ?? '',
                  Motif: r.motif,
                  Invites: r.nbInvites,
                  'Montant (FCFA)': Number(r.montant),
                  Statut: STATUT_LABELS[r.statut] ?? r.statut,
                })),
                'reservations-salle-fete',
                'Reservations Salle de Fete',
              ),
            },
            {
              key: 'pdf',
              label: 'Exporter PDF',
              onClick: () => exportToPDF(
                [
                  { header: 'Date', dataKey: 'date' },
                  { header: 'Horaire', dataKey: 'horaire' },
                  { header: 'Client', dataKey: 'client' },
                  { header: 'Motif', dataKey: 'motif' },
                  { header: 'Invites', dataKey: 'invites' },
                  { header: 'Montant', dataKey: 'montant' },
                  { header: 'Statut', dataKey: 'statut' },
                ],
                (reservations || []).map((r) => ({
                  date: new Date(r.dateEvent).toLocaleDateString('fr-FR'),
                  horaire: `${r.heureDebut} - ${r.heureFin}`,
                  client: `${r.client.nom} ${r.client.prenom}`,
                  motif: r.motif,
                  invites: r.nbInvites,
                  montant: `${Number(r.montant).toLocaleString()} FCFA`,
                  statut: STATUT_LABELS[r.statut] ?? r.statut,
                })) as Record<string, unknown>[],
                'reservations-salle-fete',
                'Reservations Salle de Fete',
              ),
            },
          ],
        }}>
          <Button icon={<DownloadOutlined />}>Exporter</Button>
        </Dropdown>
      </div>

      <Table
        dataSource={reservations || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 10, showTotal: (t) => `${t} reservation(s)` }}
      />

      <Modal
        title="Nouvelle réservation : Salle de fête"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        width={540}
        okText="Reserver"
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
              typeId: values.typeId || undefined,
              notes: values.notes || undefined,
            });
          }}
        >
          <Form.Item name="clientId" label="Client" rules={[{ required: true, message: 'Client requis' }]}>
            <Select
              showSearch
              placeholder="Rechercher un client..."
              optionFilterProp="label"
              options={(clients || []).map((c: Client) => ({
                value: c.id,
                label: `${c.nom} ${c.prenom || ''}`.trim(),
              }))}
            />
          </Form.Item>
          <Form.Item name="typeId" label="Type de reservation">
            <Select
              allowClear
              placeholder="Selectionner un type (optionnel)"
              onChange={(typeId) => {
                if (typeId && types) {
                  const t = types.find((x) => x.id === typeId);
                  if (t && Number(t.prixBase) > 0) {
                    form.setFieldValue('montant', Number(t.prixBase));
                  }
                }
              }}
              options={(types || []).map((t: TypeReservationSalle) => ({
                value: t.id,
                label: t.nom,
                desc: t.description,
              }))}
              optionRender={(opt) => (
                <div>
                  <div className="font-medium">{opt.data.label}</div>
                  {opt.data.desc && <div className="text-xs text-slate-400">{opt.data.desc}</div>}
                </div>
              )}
            />
          </Form.Item>
          <Form.Item name="dateEvent" label="Date de l'evenement" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <div className="flex gap-3">
            <Form.Item name="heureDebut" label="Debut" rules={[{ required: true }]} className="flex-1">
              <TimePicker format="HH:mm" className="w-full" minuteStep={15} />
            </Form.Item>
            <Form.Item
              name="heureFin"
              label="Fin"
              dependencies={['heureDebut']}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const debut = getFieldValue('heureDebut');
                    if (!value || !debut || value.isAfter(debut)) return Promise.resolve();
                    return Promise.reject(new Error("L'heure de fin doit etre apres le debut"));
                  },
                }),
              ]}
              className="flex-1"
            >
              <TimePicker format="HH:mm" className="w-full" minuteStep={15} />
            </Form.Item>
          </div>
          <Form.Item name="motif" label="Motif" rules={[{ required: true }]}>
            <Input placeholder="Mariage, Anniversaire, Seminaire, Bapteme..." />
          </Form.Item>
          <Form.Item name="nbInvites" label="Nombre d'invites" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="montant" label="Montant total (FCFA)" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────
export default function SalleFetePage() {
  return (
    <div id="tour-salle-fete-page">
      <h2 className="text-xl font-semibold mb-4">Salle de fete</h2>
      <Tabs
        id="tour-salle-fete-tabs"
        defaultActiveKey="reservations"
        items={[
          { key: 'reservations', label: 'Reservations', children: <ReservationsTab /> },
          { key: 'types', label: 'Types de reservation', children: <TypesTab /> },
        ]}
      />
    </div>
  );
}
