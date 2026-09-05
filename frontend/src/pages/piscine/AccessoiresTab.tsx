import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsg } from '../../hooks/useMsg';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber,
  Tag, Card, Row, Col, Statistic, App, Popconfirm, Space, Tabs, Badge, Alert,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ShoppingCartOutlined, ToolOutlined, RollbackOutlined,
} from '@ant-design/icons';
import { piscineApi } from '../../api/piscine';
import { clientsApi } from '../../api/clients';
import type { AccessoirePiscine, TransactionAccessoire, TicketPiscine } from '../../api/piscine';
import type { Client } from '../../api/clients';

const TYPE_LABELS: Record<string, string> = {
  VENTE: 'Vente',
  LOCATION: 'Location',
  VENTE_ET_LOCATION: 'Vente & Location',
};

const TYPE_COLORS: Record<string, string> = {
  VENTE: 'gold',
  LOCATION: 'purple',
  VENTE_ET_LOCATION: 'cyan',
};

const TX_COLORS: Record<string, string> = {
  VENTE: 'green',
  LOCATION: 'orange',
  RETOUR: 'orange',
};

export default function AccessoiresTab() {
  const { message } = App.useApp();
  const { err } = useMsg();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txSuccess, setTxSuccess] = useState<{ nom: string; type: string; total: number } | null>(null);
  const [editingAcc, setEditingAcc] = useState<AccessoirePiscine | null>(null);
  const [selectedAcc, setSelectedAcc] = useState<AccessoirePiscine | null>(null);
  const [txQte, setTxQte] = useState(1);
  const [txPrix, setTxPrix] = useState(0);
  const [form] = Form.useForm();
  const [txForm] = Form.useForm();

  const { data: accessoires, isLoading } = useQuery({
    queryKey: ['accessoires-piscine'],
    queryFn: () => piscineApi.getAccessoires('true'),
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions-accessoire'],
    queryFn: () => piscineApi.getTransactions(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.findAll().then((r) => r.data),
  });

  const { data: ticketsJour } = useQuery({
    queryKey: ['tickets-piscine-jour'],
    queryFn: () => piscineApi.getTickets(undefined, 'false'),
    select: (data: TicketPiscine[]) => data.filter((t) => {
      const d = new Date(t.dateDebut);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }),
  });

  const createMutation = useMutation({
    mutationFn: piscineApi.createAccessoire,
    onSuccess: () => {
      message.success('Accessoire cree');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['accessoires-piscine'] });
    },
    onError: (e: unknown) => err(e),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof piscineApi.updateAccessoire>[1] }) =>
      piscineApi.updateAccessoire(id, data),
    onSuccess: () => {
      message.success('Accessoire modifie');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['accessoires-piscine'] });
    },
    onError: (e: unknown) => err(e),
  });

  const deleteMutation = useMutation({
    mutationFn: piscineApi.deleteAccessoire,
    onSuccess: () => {
      message.success('Accessoire desactive');
      queryClient.invalidateQueries({ queryKey: ['accessoires-piscine'] });
    },
    onError: (e: unknown) => err(e),
  });

  const txMutation = useMutation({
    mutationFn: piscineApi.createTransaction,
    onSuccess: (_, vars) => {
      const total = (vars.quantite || 1) * (vars.prixUnit || 0);
      const typeLabel = vars.type === 'RETOUR' ? 'Retour' : vars.type === 'LOCATION' ? 'Location' : 'Vente';
      setTxSuccess({ nom: selectedAcc?.nom || '', type: typeLabel, total });
      txForm.resetFields();
      setTxQte(1);
      setTxPrix(0);
      queryClient.invalidateQueries({ queryKey: ['accessoires-piscine'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-accessoire'] });
    },
    onError: (e: unknown) => err(e),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingAcc(null);
    form.resetFields();
  };

  const closeTxModal = () => {
    setTxModalOpen(false);
    setSelectedAcc(null);
    setTxSuccess(null);
    setTxQte(1);
    setTxPrix(0);
    txForm.resetFields();
  };

  const openEdit = (acc: AccessoirePiscine) => {
    setEditingAcc(acc);
    form.setFieldsValue(acc);
    setModalOpen(true);
  };

  const openTransaction = (acc: AccessoirePiscine, forceType?: 'VENTE' | 'LOCATION' | 'RETOUR') => {
    setSelectedAcc(acc);
    setTxSuccess(null);
    txForm.setFieldValue('accessoireId', acc.id);
    const defaultQte = 1;
    txForm.setFieldValue('quantite', defaultQte);
    let defaultType: string;
    let defaultPrix: number;
    if (forceType) {
      defaultType = forceType;
      defaultPrix = forceType === 'LOCATION' ? (acc.prixLocation ?? 0) : forceType === 'RETOUR' ? 0 : (acc.prixVente ?? 0);
    } else if (acc.type === 'VENTE') {
      defaultType = 'VENTE';
      defaultPrix = acc.prixVente ?? 0;
    } else if (acc.type === 'LOCATION') {
      defaultType = 'LOCATION';
      defaultPrix = acc.prixLocation ?? 0;
    } else {
      defaultType = 'VENTE';
      defaultPrix = acc.prixVente ?? 0;
    }
    txForm.setFieldValue('type', defaultType);
    txForm.setFieldValue('prixUnit', defaultPrix);
    setTxQte(defaultQte);
    setTxPrix(defaultPrix);
    setTxModalOpen(true);
  };

  const totalCA = transactions
    ?.filter((t) => t.type !== 'RETOUR')
    .reduce((sum, t) => sum + Number(t.total), 0) || 0;

  const stockBas = (accessoires || []).filter((a) => a.stock <= 2).length;

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      render: (nom: string, record: AccessoirePiscine) => (
        <div>
          <div className="font-medium">{nom}</div>
          {record.description && (
            <div className="text-xs text-slate-400">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={TYPE_COLORS[type]}>{TYPE_LABELS[type]}</Tag>
      ),
    },
    {
      title: 'Prix vente',
      dataIndex: 'prixVente',
      key: 'prixVente',
      render: (v: number | null) => v ? `${Number(v).toLocaleString()} F` : '-',
    },
    {
      title: 'Prix location',
      dataIndex: 'prixLocation',
      key: 'prixLocation',
      render: (v: number | null) => v ? `${Number(v).toLocaleString()} F` : '-',
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number) => (
        <Badge
          count={stock}
          showZero
          color={stock === 0 ? 'red' : stock <= 2 ? 'orange' : 'green'}
          overflowCount={999}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: AccessoirePiscine) => (
        <Space>
          <Button
            size="small"
            icon={<RollbackOutlined />}
            onClick={() => openTransaction(record, 'RETOUR')}
          >
            Retour
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Desactiver cet accessoire ?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const txColumns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
      width: 110,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag color={TX_COLORS[t]}>{t}</Tag>,
      width: 90,
    },
    { title: 'Accessoire', dataIndex: ['accessoire', 'nom'], key: 'accessoire' },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: TransactionAccessoire) =>
        r.client ? `${r.client.nom} ${r.client.prenom}` : '-',
    },
    { title: 'Qte', dataIndex: 'quantite', key: 'qte', width: 60 },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (v: number) => `${Number(v).toLocaleString()} F`,
    },
  ];

  return (
    <>
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card size="small">
            <Statistic title="Articles en stock" value={accessoires?.length || 0} prefix={<ToolOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Stock bas"
              value={stockBas}
              styles={{ content: { color: stockBas > 0 ? '#faad14' : '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Transactions" value={transactions?.length || 0} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="CA Total" value={totalCA} suffix="F" styles={{ content: { color: '#C9A84C' } }} />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'catalogue',
            label: 'Catalogue',
            children: (
              <>
                <div className="flex justify-end mb-3">
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                    Nouvel accessoire
                  </Button>
                </div>
                <Table
                  columns={columns}
                  dataSource={accessoires || []}
                  rowKey="id"
                  loading={isLoading}
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              </>
            ),
          },
          {
            key: 'historique',
            label: 'Historique des transactions',
            children: (
              <Table
                columns={txColumns}
                dataSource={transactions || []}
                rowKey="id"
                pagination={{ pageSize: 15 }}
                size="small"
              />
            ),
          },
        ]}
      />

      {/* Modal création/modification accessoire */}
      <Modal
        title={editingAcc ? 'Modifier accessoire' : 'Nouvel accessoire'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingAcc ? 'Enregistrer' : 'Creer'}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'VENTE', stock: 0 }}
          onFinish={(values) => {
            if (editingAcc) {
              updateMutation.mutate({ id: editingAcc.id, data: values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item name="nom" label="Nom" rules={[{ required: true, message: 'Nom requis' }]}>
            <Input placeholder="Ex: Ballon gonflable, Lunettes de natation..." />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'VENTE', label: 'Vente uniquement' },
              { value: 'LOCATION', label: 'Location uniquement' },
              { value: 'VENTE_ET_LOCATION', label: 'Vente et location' },
            ]} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="prixVente" label="Prix de vente (FCFA)">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="prixLocation" label="Prix de location (FCFA)">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="stock" label="Stock initial">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal transaction */}
      <Modal
        title={`Vente / Location : ${selectedAcc?.nom}`}
        open={txModalOpen}
        onCancel={closeTxModal}
        onOk={txSuccess ? closeTxModal : () => txForm.submit()}
        okText={txSuccess ? 'Fermer' : 'Enregistrer'}
        cancelButtonProps={txSuccess ? { style: { display: 'none' } } : {}}
        confirmLoading={txMutation.isPending}
      >
        {txSuccess ? (
          <Alert
            type="success"
            showIcon
            message="Transaction enregistree avec succes"
            description={
              <div className="mt-1 space-y-1 text-sm">
                <div><strong>Article :</strong> {txSuccess.nom}</div>
                <div><strong>Type :</strong> {txSuccess.type}</div>
                {txSuccess.type !== 'Retour' && (
                  <div><strong>Total encaisse :</strong> {txSuccess.total.toLocaleString()} FCFA</div>
                )}
              </div>
            }
          />
        ) : (
          <Form
            form={txForm}
            layout="vertical"
            onFinish={(values) => txMutation.mutate(values)}
          >
            <Form.Item name="accessoireId" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="type" label="Type d'operation" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'VENTE', label: 'Vente', disabled: selectedAcc?.type === 'LOCATION' },
                  { value: 'LOCATION', label: 'Location', disabled: selectedAcc?.type === 'VENTE' },
                  { value: 'RETOUR', label: 'Retour en stock' },
                ]}
                onChange={(val) => {
                  let prix = 0;
                  if (val === 'VENTE') prix = selectedAcc?.prixVente ?? 0;
                  if (val === 'LOCATION') prix = selectedAcc?.prixLocation ?? 0;
                  txForm.setFieldValue('prixUnit', prix);
                  setTxPrix(prix);
                }}
              />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="quantite" label="Quantite" rules={[{ required: true }]}>
                  <InputNumber
                    min={1}
                    max={selectedAcc?.stock || 999}
                    className="w-full"
                    onChange={(v) => setTxQte(v ?? 1)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="prixUnit" label="Prix unitaire (FCFA)" rules={[{ required: true }]}>
                  <InputNumber
                    min={0}
                    className="w-full"
                    onChange={(v) => setTxPrix(v ?? 0)}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Total en temps réel */}
            {txQte > 0 && txPrix > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-sm text-slate-600">Total a encaisser</span>
                <span className="font-semibold text-lg" style={{ color: '#C9A84C' }}>
                  {(txQte * txPrix).toLocaleString()} FCFA
                </span>
              </div>
            )}

            <Form.Item name="ticketPiscineId" label="Lier au ticket d'entree (optionnel)">
              <Select
                allowClear
                placeholder="Ticket du jour..."
                options={(ticketsJour || []).map((t: TicketPiscine) => ({
                  value: t.id,
                  label: t.code
                    ? `${t.code}${t.client ? ` — ${t.client.nom}` : ''}${t.emplacementNumero ? ` (${t.emplacementNumero})` : ''}`
                    : `Ticket ${t.type.replace(/_/g, ' ')}${t.client ? ` — ${t.client.nom}` : ''}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="clientId" label="Client (optionnel)">
              <Select
                showSearch
                allowClear
                placeholder="Passant anonyme si vide..."
                optionFilterProp="label"
                options={(clients || []).map((c: Client) => ({
                  value: c.id,
                  label: `${c.nom} ${c.prenom || ''}`.trim(),
                }))}
              />
            </Form.Item>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}
