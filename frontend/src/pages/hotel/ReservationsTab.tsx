import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Select, InputNumber, DatePicker, Input, Tag, Space, App, Popconfirm, TimePicker, Row, Col, Empty, Descriptions, Divider, Spin } from 'antd';
import { PlusOutlined, LoginOutlined, LogoutOutlined, UserAddOutlined, PrinterOutlined, CreditCardOutlined } from '@ant-design/icons';
import { hotelApi } from '../../api/hotel';
import { ticketsApi } from '../../api/caisse';
import { clientsApi } from '../../api/clients';
import type { Client } from '../../api/clients';
import type { Reservation, Chambre, TypeReservation } from '../../api/hotel';
import { getErrorMessage } from '../../api/errors';

const MOYEN_LABELS: Record<string, string> = {
  ESPECES: 'Especes',
  CARTE: 'Carte',
  VIREMENT: 'Virement',
  CHEQUE: 'Cheque',
  MOBILE_MONEY: 'Mobile Money',
};

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: 'orange',
  CONFIRMEE: 'gold',
  EN_COURS: 'green',
  TERMINEE: 'default',
  ANNULEE: 'red',
};

const TYPE_COLORS: Record<TypeReservation, string> = {
  NUIT: 'blue',
  SIESTE: 'purple',
  SIESTE_PROLONGEE: 'cyan',
};

const TYPE_LABELS: Record<TypeReservation, string> = {
  NUIT: 'Nuitee',
  SIESTE: 'Sieste',
  SIESTE_PROLONGEE: 'Sieste Prolongee',
};

export default function ReservationsTab() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [paiementsModalOpen, setPaiementsModalOpen] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [maxPersonnes, setMaxPersonnes] = useState<number | null>(null);
  const [typeReservation, setTypeReservation] = useState<TypeReservation>('NUIT');
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();
  const checkoutTargetRef = useRef<string | null>(null);

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => hotelApi.getReservations(),
    refetchInterval: 30_000,
  });

  const { data: factureData, isLoading: factureLoading } = useQuery({
    queryKey: ['reservation-facture', selectedReservationId],
    queryFn: () => hotelApi.getReservationFacture(selectedReservationId!),
    enabled: !!selectedReservationId && paiementsModalOpen,
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
      setMaxPersonnes(null);
      setTypeReservation('NUIT');
      invalidateAll();
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const onError = (err: unknown) => message.error(getErrorMessage(err));

  const confirmerMutation = useMutation({
    mutationFn: hotelApi.confirmerReservation,
    onSuccess: () => { message.success('Reservation confirmee'); invalidateAll(); },
    onError,
  });

  const annulerMutation = useMutation({
    mutationFn: hotelApi.annulerReservation,
    onSuccess: () => { message.success('Reservation annulee'); invalidateAll(); },
    onError,
  });

  const checkInMutation = useMutation({
    mutationFn: hotelApi.checkIn,
    onSuccess: () => { message.success('Check-in effectue'); invalidateAll(); },
    onError,
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => hotelApi.checkOut(id),
    onSuccess: () => { message.success('Check-out effectue'); invalidateAll(); },
    onError: (err: unknown) => {
      const errMsg = getErrorMessage(err);
      if (errMsg.toLowerCase().includes('impay') && checkoutTargetRef.current) {
        const targetId = checkoutTargetRef.current;
        modal.confirm({
          title: 'Solde impaye',
          content: `${errMsg}. Voulez-vous forcer le check-out ?`,
          okText: 'Forcer le depart',
          okButtonProps: { danger: true },
          cancelText: 'Annuler',
          onOk: () =>
            hotelApi.checkOut(targetId, true)
              .then(() => { message.success('Check-out force effectue'); invalidateAll(); })
              .catch(() => message.error('Erreur lors du check-out force')),
        });
      } else {
        message.error(errMsg);
      }
    },
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
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const chambresDisponibles = chambres?.filter((c: Chambre) => c.statut === 'DISPONIBLE') || [];

  const chambresForType = chambresDisponibles.filter((c: Chambre) => {
    if (typeReservation === 'SIESTE') return c.prixSieste != null;
    if (typeReservation === 'SIESTE_PROLONGEE') return c.prixJournee != null;
    return true;
  });

  const getPrixLabel = (c: Chambre): string => {
    if (typeReservation === 'SIESTE' && c.prixSieste) return `${Number(c.prixSieste).toLocaleString()} FCFA/sieste`;
    if (typeReservation === 'SIESTE_PROLONGEE' && c.prixJournee) return `${Number(c.prixJournee).toLocaleString()} FCFA/sieste prolongee`;
    return `${Number(c.prixNuit).toLocaleString()} FCFA/nuit`;
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'typeReservation',
      key: 'type',
      width: 85,
      render: (t: TypeReservation) => (
        <Tag color={TYPE_COLORS[t] ?? 'blue'}>{TYPE_LABELS[t] ?? t}</Tag>
      ),
    },
    {
      title: 'Chambre',
      key: 'chambre',
      width: 110,
      render: (_: unknown, r: Reservation) => `${r.chambre.numero} (${r.chambre.type})`,
    },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: Reservation) => `${r.client.nom} ${r.client.prenom}`,
    },
    {
      title: 'Arrivee',
      key: 'arrivee',
      width: 120,
      render: (_: unknown, r: Reservation) => (
        <div>
          <div>{new Date(r.dateArrivee).toLocaleDateString('fr-FR')}</div>
          {r.heureArrivee && <div className="text-xs text-slate-400">{r.heureArrivee}</div>}
        </div>
      ),
    },
    {
      title: 'Depart',
      key: 'depart',
      width: 120,
      render: (_: unknown, r: Reservation) => (
        <div>
          <div>{new Date(r.dateDepart).toLocaleDateString('fr-FR')}</div>
          {r.heureDepart && <div className="text-xs text-slate-400">{r.heureDepart}</div>}
        </div>
      ),
    },
    { title: 'Pers.', dataIndex: 'nbPersonnes', key: 'pers', width: 60 },
    {
      title: 'Montant',
      dataIndex: 'montantTotal',
      key: 'montant',
      width: 130,
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
            <Popconfirm
              title="Effectuer le check-out ?"
              description="Le sejour sera cloture et la facture generee."
              onConfirm={() => { checkoutTargetRef.current = r.id; checkOutMutation.mutate(r.id); }}
              okText="Check-out"
              cancelText="Non"
            >
              <Button size="small" icon={<LogoutOutlined />} type="primary">Check-out</Button>
            </Popconfirm>
          )}
          {(r.statut === 'EN_COURS' || r.statut === 'CONFIRMEE' || r.statut === 'TERMINEE') && (
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={async () => {
                try {
                  const blob = await ticketsApi.imprimerReservation(r.id);
                  const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                  window.open(url, '_blank');
                } catch { message.error("Erreur lors de l'impression"); }
              }}
            >
              Ticket
            </Button>
          )}
          {(r.statut === 'EN_COURS' || r.statut === 'TERMINEE') && (
            <Button
              size="small"
              icon={<CreditCardOutlined />}
              onClick={() => { setSelectedReservationId(r.id); setPaiementsModalOpen(true); }}
            >
              Paiements
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const closeModal = () => {
    setModalOpen(false);
    form.resetFields();
    setMaxPersonnes(null);
    setTypeReservation('NUIT');
  };

  return (
    <>
      <div className="mb-3 flex gap-3">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouvelle reservation
        </Button>
      </div>

      <Table dataSource={reservations || []} columns={columns} rowKey="id" loading={isLoading} size="small" />

      <Modal
        title="Nouvelle reservation"
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            const dateArrivee = values.date.format('YYYY-MM-DD');
            createMutation.mutate({
              chambreId: values.chambreId,
              clientId: values.clientId,
              typeReservation,
              dateArrivee,
              nbPersonnes: values.nbPersonnes,
              heureArrivee: values.heureArrivee?.format('HH:mm') || undefined,
              // SIESTE uniquement : heureDepart manuelle
              heureDepart: typeReservation === 'SIESTE' ? values.heureDepart?.format('HH:mm') || undefined : undefined,
              notes: values.notes || undefined,
            });
          }}
        >
          {/* Type de reservation */}
          <Form.Item name="typeReservation" label="Type de sejour" initialValue="NUIT">
            <Select
              options={[
                { value: 'NUIT', label: 'Nuitee (12H-12H) — depart automatique lendemain 12h' },
                { value: 'SIESTE', label: 'Sieste (2H) — heures libres en journee' },
                { value: 'SIESTE_PROLONGEE', label: 'Sieste prolongee (22H-6H) — arrivee a partir de 22h' },
              ]}
              onChange={(val: TypeReservation) => {
                setTypeReservation(val);
                form.setFieldValue('chambreId', undefined);
                form.setFieldValue('heureArrivee', undefined);
                form.setFieldValue('heureDepart', undefined);
                setMaxPersonnes(null);
              }}
            />
          </Form.Item>

          {/* Chambre — filtrée selon le type */}
          <Form.Item name="chambreId" label="Chambre" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              notFoundContent={
                <Empty
                  description={
                    typeReservation !== 'NUIT'
                      ? `Aucune chambre avec tarif ${TYPE_LABELS[typeReservation].toLowerCase()} configuré`
                      : 'Aucune chambre disponible'
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              }
              options={chambresForType.map((c: Chambre) => ({
                value: c.id,
                label: `${c.numero} - ${c.type} (${c.capacite} pers.) — ${getPrixLabel(c)}`,
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

          {/* Client */}
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

          {/* Date d'arrivée (toujours un DatePicker simple) */}
          <Form.Item name="date" label="Date d'arrivee" rules={[{ required: true }]}>
            <DatePicker className="w-full" placeholder="Selectionner la date" />
          </Form.Item>

          {/* Heure arrivée */}
          <Row gutter={12}>
            <Col span={typeReservation === 'SIESTE' ? 12 : 24}>
              <Form.Item
                name="heureArrivee"
                label={typeReservation === 'SIESTE_PROLONGEE' ? 'Heure arrivee (>= 22h00)' : 'Heure arrivee'}
                rules={typeReservation !== 'NUIT' ? [{ required: true, message: 'Requis' }] : []}
                extra={
                  typeReservation === 'SIESTE_PROLONGEE'
                    ? 'Depart automatique 8h apres (ex: 22h → 06h00)'
                    : typeReservation === 'NUIT'
                    ? 'Depart automatique le lendemain a 12h00'
                    : undefined
                }
              >
                <TimePicker
                  format="HH:mm"
                  className="w-full"
                  minuteStep={15}
                  placeholder={typeReservation === 'SIESTE_PROLONGEE' ? '22:00' : '14:00'}
                  disabledTime={typeReservation === 'SIESTE_PROLONGEE' ? () => ({ disabledHours: () => Array.from({ length: 22 }, (_, i) => i) }) : undefined}
                />
              </Form.Item>
            </Col>
            {typeReservation === 'SIESTE' && (
              <Col span={12}>
                <Form.Item
                  name="heureDepart"
                  label="Heure depart"
                  dependencies={['heureArrivee']}
                  rules={[
                    { required: true, message: 'Requis' },
                    ({ getFieldValue }: { getFieldValue: (name: string) => unknown }) => ({
                      validator(_: unknown, value: { isAfter?: (d: unknown) => boolean } | null) {
                        const debut = getFieldValue('heureArrivee');
                        if (!value || !debut || value.isAfter?.(debut)) return Promise.resolve();
                        return Promise.reject(new Error("L'heure de depart doit etre apres l'arrivee"));
                      },
                    }),
                  ]}
                >
                  <TimePicker format="HH:mm" className="w-full" minuteStep={15} placeholder="16:00" />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Form.Item
            name="nbPersonnes"
            label={maxPersonnes !== null ? `Nombre de personnes (max ${maxPersonnes})` : 'Nombre de personnes'}
            rules={[{ required: true }]}
            initialValue={1}
          >
            <InputNumber min={1} max={maxPersonnes ?? undefined} disabled={maxPersonnes === null} className="w-full" />
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
        <Form form={clientForm} layout="vertical" onFinish={(values) => createClientMutation.mutate(values)}>
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

      {/* Modal paiements en tranches */}
      <Modal
        title="Paiements de la reservation"
        open={paiementsModalOpen}
        onCancel={() => { setPaiementsModalOpen(false); setSelectedReservationId(null); }}
        footer={null}
        width={560}
      >
        {factureLoading ? (
          <div className="flex justify-center py-8"><Spin /></div>
        ) : !factureData ? (
          <p className="text-slate-400 text-center py-6">Aucune facture generee pour cette reservation.</p>
        ) : (
          <>
            <Descriptions size="small" column={2} className="mb-4">
              <Descriptions.Item label="Facture n°">{factureData.numero}</Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={factureData.payee ? 'green' : 'orange'}>
                  {factureData.payee ? 'Reglee' : 'En attente'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total">{Number(factureData.total).toLocaleString()} FCFA</Descriptions.Item>
              <Descriptions.Item label="Paye">{Number(factureData.montantPaye).toLocaleString()} FCFA</Descriptions.Item>
              <Descriptions.Item label="Reste" span={2}>
                <span className={Number(factureData.reste) > 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
                  {Number(factureData.reste).toLocaleString()} FCFA
                </span>
              </Descriptions.Item>
            </Descriptions>

            {factureData.paiement && (
              <>
                <Divider titlePlacement="left" plain>Paiement unique</Divider>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="Montant">{Number(factureData.paiement.montant).toLocaleString()} FCFA</Descriptions.Item>
                  <Descriptions.Item label="Moyen">{MOYEN_LABELS[factureData.paiement.moyen] ?? factureData.paiement.moyen}</Descriptions.Item>
                  <Descriptions.Item label="Date">{new Date(factureData.paiement.createdAt).toLocaleDateString('fr-FR')}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            {factureData.tranches && factureData.tranches.length > 0 && (
              <>
                <Divider titlePlacement="left" plain>Paiements par tranches ({factureData.tranches.length})</Divider>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={factureData.tranches}
                  rowKey="id"
                  columns={[
                    {
                      title: 'Date',
                      dataIndex: 'createdAt',
                      width: 100,
                      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
                    },
                    {
                      title: 'Montant',
                      dataIndex: 'montant',
                      render: (m: number) => `${Number(m).toLocaleString()} FCFA`,
                    },
                    {
                      title: 'Moyen',
                      dataIndex: 'moyen',
                      render: (m: string) => MOYEN_LABELS[m] ?? m,
                    },
                    { title: 'Ref', dataIndex: 'reference', width: 120 },
                    { title: 'Notes', dataIndex: 'notes', render: (n: string | null) => n ?? '-' },
                  ]}
                  summary={(rows) => {
                    const total = rows.reduce((s, r) => s + Number(r.montant), 0);
                    return (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0}><span className="font-medium">Total tranches</span></Table.Summary.Cell>
                        <Table.Summary.Cell index={1}><span className="font-semibold">{total.toLocaleString()} FCFA</span></Table.Summary.Cell>
                        <Table.Summary.Cell index={2} colSpan={3} />
                      </Table.Summary.Row>
                    );
                  }}
                />
              </>
            )}

            {!factureData.paiement && (!factureData.tranches || factureData.tranches.length === 0) && (
              <p className="text-slate-400 text-center py-4">Aucun paiement enregistre.</p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
