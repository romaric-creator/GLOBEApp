import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsg } from '../../hooks/useMsg';
import {
  Table, Button, Modal, Form, Select, InputNumber, DatePicker,
  Tag, Card, Row, Col, Statistic, App, Popconfirm, Space, Divider,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, CheckOutlined, PrinterOutlined, EyeOutlined } from '@ant-design/icons';
import { piscineApi } from '../../api/piscine';
import { ticketsApi } from '../../api/caisse';
import { clientsApi } from '../../api/clients';
import type { AccessoirePiscine, TicketPiscine } from '../../api/piscine';

const TYPE_LABELS: Record<string, string> = {
  JOURNALIER: 'Journalier',
  ABONNEMENT_MENSUEL: 'Mensuel',
  ABONNEMENT_ANNUEL: 'Annuel',
};

const TYPE_COLORS: Record<string, string> = {
  JOURNALIER: 'gold',
  ABONNEMENT_MENSUEL: 'purple',
  ABONNEMENT_ANNUEL: 'gold',
};

export default function TicketsTab() {
  const { message } = App.useApp();
  const { err } = useMsg();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [total, setTotal] = useState(0);
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

  const { data: accessoires } = useQuery({
    queryKey: ['accessoires-piscine'],
    queryFn: () => piscineApi.getAccessoires('true'),
  });

  const checkoutMutation = useMutation({
    mutationFn: piscineApi.checkoutPiscine,
    onSuccess: (createdTicket: TicketPiscine) => {
      message.success('Ticket cree');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['tickets-piscine'] });
      queryClient.invalidateQueries({ queryKey: ['piscine-stats'] });
      queryClient.invalidateQueries({ queryKey: ['accessoires-piscine'] });
      ticketsApi.imprimerPiscine(createdTicket.id).catch(() => {});
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Une erreur s\'est produite. Veuillez réessayer.');
    },
  });

  const utiliserMutation = useMutation({
    mutationFn: piscineApi.utiliserTicket,
    onSuccess: () => {
      message.success('Ticket valide');
      queryClient.invalidateQueries({ queryKey: ['tickets-piscine'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Une erreur s\'est produite. Veuillez réessayer.');
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    setTotal(0);
    form.resetFields();
  };

  const recalcTotal = (allValues: { prix?: number; accessoires?: { accessoireId?: string; type?: 'VENTE' | 'LOCATION'; quantite?: number }[] }) => {
    const prixEntree = allValues.prix || 0;
    const totalAccs = (allValues.accessoires || []).reduce((sum, line) => {
      if (!line?.accessoireId) return sum;
      const acc = (accessoires || []).find((a: AccessoirePiscine) => a.id === line.accessoireId);
      if (!acc) return sum;
      const prix = line.type === 'LOCATION' ? (acc.prixLocation ?? 0) : (acc.prixVente ?? 0);
      return sum + prix * (line.quantite || 1);
    }, 0);
    setTotal(prixEntree + totalAccs);
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (c: string | null) => c
        ? <span className="font-mono font-semibold text-sm" style={{ color: '#C9A84C' }}>{c}</span>
        : <span className="text-slate-400 text-xs">—</span>,
    },
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
      render: (_: unknown, r: TicketPiscine) => r.client
        ? `${r.client.nom} ${r.client.prenom}`
        : <span className="text-slate-400">Passant</span>,
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
      width: 160,
      render: (_: unknown, r: TicketPiscine) => (
        <Space size="small">
          {!r.utilise && (
            <Popconfirm title="Valider ce ticket ?" description="Cette action est irreversible." onConfirm={() => utiliserMutation.mutate(r.id)} okText="Valider" cancelText="Annuler">
              <Button size="small" icon={<CheckOutlined />}>Valider</Button>
            </Popconfirm>
          )}
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() =>
              ticketsApi.imprimerPiscine(r.id)
                .then(() => message.success('Ticket envoyé'))
                .catch(() => err('Erreur impression'))
            }
          >
            Ticket
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => ticketsApi.apercevoirPiscine(r.id).catch(() => err('Erreur apercu'))}
          />
        </Space>
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
          <Card><Statistic title="Abonnements actifs" value={stats?.abonnementsActifs || 0} styles={{ content: { color: '#52c41a' } }} /></Card>
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
        title={
          <div className="flex justify-between items-center pr-8">
            <span>Nouveau ticket piscine</span>
            {total > 0 && (
              <span className="text-base font-semibold" style={{ color: '#C9A84C' }}>
                Total : {total.toLocaleString()} FCFA
              </span>
            )}
          </div>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={checkoutMutation.isPending}
        width={520}
        okText="Valider et imprimer"
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(_, all) => recalcTotal(all)}
          onFinish={(values) => {
            checkoutMutation.mutate({
              type: values.type,
              prix: values.prix,
              dateDebut: values.dateDebut.format('YYYY-MM-DD'),
              clientId: values.clientId || undefined,
              accessoires: (values.accessoires || [])
                .filter((a: { accessoireId?: string }) => a?.accessoireId)
                .map((a: { accessoireId: string; type: 'VENTE' | 'LOCATION'; quantite: number }) => ({
                  accessoireId: a.accessoireId,
                  type: a.type || 'VENTE',
                  quantite: a.quantite || 1,
                })),
            });
          }}
        >
          <Form.Item name="type" label="Type d'acces" rules={[{ required: true }]} initialValue="JOURNALIER">
            <Select options={[
              { value: 'JOURNALIER', label: 'Journalier' },
              { value: 'ABONNEMENT_MENSUEL', label: 'Abonnement Mensuel' },
              { value: 'ABONNEMENT_ANNUEL', label: 'Abonnement Annuel' },
            ]} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="prix" label="Prix entree (FCFA)" rules={[{ required: true }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dateDebut" label="Date" rules={[{ required: true }]}>
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="clientId" label="Client (optionnel)">
            <Select
              allowClear
              showSearch
              placeholder="Passant anonyme si vide"
              optionFilterProp="label"
              options={clients?.map((c: { id: string; nom: string; prenom?: string }) => ({
                value: c.id,
                label: `${c.nom} ${c.prenom || ''}`.trim(),
              })) || []}
            />
          </Form.Item>

          <Divider titlePlacement="left" className="text-sm">
            Accessoires (optionnel)
          </Divider>

          <Form.List name="accessoires">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => {
                  const accId = form.getFieldValue(['accessoires', name, 'accessoireId']);
                  const accData = (accessoires || []).find((a: AccessoirePiscine) => a.id === accId);
                  const typeOp = form.getFieldValue(['accessoires', name, 'type']) || 'VENTE';
                  const prixUnit = accData
                    ? (typeOp === 'LOCATION' ? (accData.prixLocation ?? 0) : (accData.prixVente ?? 0))
                    : 0;

                  return (
                    <div key={key} className="flex gap-2 mb-2 items-start">
                      <Form.Item {...rest} name={[name, 'accessoireId']} className="flex-1 mb-0" rules={[{ required: true, message: 'Requis' }]}>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder="Choisir un accessoire"
                          options={(accessoires || [])
                            .filter((a: AccessoirePiscine) => a.stock > 0)
                            .map((a: AccessoirePiscine) => ({
                              value: a.id,
                              label: `${a.nom} (stock: ${a.stock})`,
                            }))}
                        />
                      </Form.Item>
                      <Form.Item {...rest} name={[name, 'type']} className="mb-0" initialValue="VENTE" style={{ width: 100 }}>
                        <Select
                          options={[
                            { value: 'VENTE', label: 'Vente' },
                            { value: 'LOCATION', label: 'Location' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item {...rest} name={[name, 'quantite']} className="mb-0" initialValue={1} style={{ width: 70 }}>
                        <InputNumber min={1} max={accData?.stock || 99} />
                      </Form.Item>
                      {prixUnit > 0 && (
                        <div className="text-xs text-slate-500 pt-2 whitespace-nowrap">
                          {prixUnit.toLocaleString()} F
                        </div>
                      )}
                      <Button type="text" danger icon={<MinusCircleOutlined />} className="mt-0.5" onClick={() => remove(name)} />
                    </div>
                  );
                })}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="small">
                  Ajouter un accessoire
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
}
