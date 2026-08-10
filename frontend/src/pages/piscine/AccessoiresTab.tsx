import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber,
  Tag, Card, Row, Col, Statistic, App, Popconfirm, Space, Tabs, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ShoppingCartOutlined, ToolOutlined,
} from '@ant-design/icons';
import { piscineApi } from '../../api/piscine';
import { clientsApi } from '../../api/clients';
import type { AccessoirePiscine, TransactionAccessoire } from '../../api/piscine';
import type { Client } from '../../api/clients';
import { getErrorMessage } from '../../api/errors';

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
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<AccessoirePiscine | null>(null);
  const [selectedAcc, setSelectedAcc] = useState<AccessoirePiscine | null>(null);
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

  const createMutation = useMutation({
    mutationFn: piscineApi.createAccessoire,
    onSuccess: () => {
      message.success('Accessoire cree');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['accessoires-piscine'] });
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof piscineApi.updateAccessoire>[1] }) =>
      piscineApi.updateAccessoire(id, data),
    onSuccess: () => {
      message.success('Accessoire modifie');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['accessoires-piscine'] });
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: piscineApi.deleteAccessoire,
    onSuccess: () => {
      message.success('Accessoire desactive');
      queryClient.invalidateQueries({ queryKey: ['accessoires-piscine'] });
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const txMutation = useMutation({
    mutationFn: piscineApi.createTransaction,
    onSuccess: () => {
      message.success('Transaction enregistree');
      closeTxModal();
      queryClient.invalidateQueries({ queryKey: ['accessoires-piscine'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-accessoire'] });
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingAcc(null);
    form.resetFields();
  };

  const closeTxModal = () => {
    setTxModalOpen(false);
    setSelectedAcc(null);
    txForm.resetFields();
  };

  const openEdit = (acc: AccessoirePiscine) => {
    setEditingAcc(acc);
    form.setFieldsValue(acc);
    setModalOpen(true);
  };

  const openTransaction = (acc: AccessoirePiscine) => {
    setSelectedAcc(acc);
    txForm.setFieldValue('accessoireId', acc.id);
    txForm.setFieldValue('quantite', 1);
    if (acc.type === 'VENTE') {
      txForm.setFieldValue('type', 'VENTE');
      txForm.setFieldValue('prixUnit', acc.prixVente);
    } else if (acc.type === 'LOCATION') {
      txForm.setFieldValue('type', 'LOCATION');
      txForm.setFieldValue('prixUnit', acc.prixLocation);
    } else {
      txForm.setFieldValue('type', 'VENTE');
      txForm.setFieldValue('prixUnit', acc.prixVente);
    }
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
            type="primary"
            size="small"
            icon={<ShoppingCartOutlined />}
            onClick={() => openTransaction(record)}
            disabled={record.stock === 0}
          >
            Vendre/Louer
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
              valueStyle={{ color: stockBas > 0 ? '#faad14' : '#52c41a' }}
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
            <Statistic title="CA Total" value={totalCA} suffix="F" valueStyle={{ color: '#C9A84C' }} />
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
        title={`Vente / Location — ${selectedAcc?.nom}`}
        open={txModalOpen}
        onCancel={closeTxModal}
        onOk={() => txForm.submit()}
        confirmLoading={txMutation.isPending}
        okText="Enregistrer"
      >
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
                if (val === 'VENTE') txForm.setFieldValue('prixUnit', selectedAcc?.prixVente);
                if (val === 'LOCATION') txForm.setFieldValue('prixUnit', selectedAcc?.prixLocation);
                if (val === 'RETOUR') txForm.setFieldValue('prixUnit', 0);
              }}
            />
          </Form.Item>
          <Form.Item name="quantite" label="Quantite" rules={[{ required: true }]}>
            <InputNumber min={1} max={selectedAcc?.stock || 999} className="w-full" />
          </Form.Item>
          <Form.Item name="prixUnit" label="Prix unitaire (FCFA)" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="clientId" label="Client (optionnel)">
            <Select
              showSearch
              allowClear
              placeholder="Selectionner un client..."
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
      </Modal>
    </>
  );
}
