import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Tag, Card, Row, Col, Statistic, App, Popconfirm } from 'antd';
import { PlusOutlined, HomeOutlined, CheckCircleOutlined, CloseCircleOutlined, ToolOutlined } from '@ant-design/icons';
import { hotelApi } from '../../api/hotel';
import type { Chambre } from '../../api/hotel';

const TYPE_COLORS: Record<string, string> = {
  SIMPLE: 'blue',
  DOUBLE: 'green',
  SUITE: 'purple',
  VIP: 'gold',
};

const STATUT_COLORS: Record<string, string> = {
  DISPONIBLE: 'green',
  OCCUPEE: 'red',
  MAINTENANCE: 'orange',
  RESERVEE: 'blue',
};

export default function ChambresTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChambre, setEditingChambre] = useState<Chambre | null>(null);
  const [form] = Form.useForm();

  const { data: chambres, isLoading } = useQuery({
    queryKey: ['chambres'],
    queryFn: hotelApi.getChambres,
  });

  const { data: stats } = useQuery({
    queryKey: ['hotel-stats'],
    queryFn: hotelApi.getStats,
  });

  const createMutation = useMutation({
    mutationFn: hotelApi.createChambre,
    onSuccess: () => {
      message.success('Chambre creee');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['chambres'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Chambre> }) => hotelApi.updateChambre(id, data),
    onSuccess: () => {
      message.success('Chambre modifiee');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['chambres'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: hotelApi.deleteChambre,
    onSuccess: () => {
      message.success('Chambre supprimee');
      queryClient.invalidateQueries({ queryKey: ['chambres'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingChambre(null);
    form.resetFields();
  };

  const openEdit = (chambre: Chambre) => {
    setEditingChambre(chambre);
    form.setFieldsValue(chambre);
    setModalOpen(true);
  };

  const columns = [
    { title: 'Numero', dataIndex: 'numero', key: 'numero', width: 80 },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t: string) => <Tag color={TYPE_COLORS[t]}>{t}</Tag>,
    },
    { title: 'Capacite', dataIndex: 'capacite', key: 'capacite', width: 80, render: (c: number) => `${c} pers.` },
    { title: 'Prix/nuit', dataIndex: 'prixNuit', key: 'prix', width: 120, render: (p: number) => `${Number(p).toLocaleString()} FCFA` },
    { title: 'Etage', dataIndex: 'etage', key: 'etage', width: 70, render: (e: number | null) => e ?? '-' },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 110,
      render: (s: string) => <Tag color={STATUT_COLORS[s]}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: unknown, r: Chambre) => (
        <div className="flex gap-1">
          <Button size="small" onClick={() => openEdit(r)}>Modifier</Button>
          <Popconfirm title="Supprimer cette chambre ?" onConfirm={() => deleteMutation.mutate(r.id)}>
            <Button size="small" danger>Suppr.</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} className="mb-4">
        <Col span={5}>
          <Card><Statistic title="Total chambres" value={stats?.total || 0} prefix={<HomeOutlined />} /></Card>
        </Col>
        <Col span={5}>
          <Card><Statistic title="Disponibles" value={stats?.disponibles || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={5}>
          <Card><Statistic title="Occupees" value={stats?.occupees || 0} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
        <Col span={5}>
          <Card><Statistic title="Maintenance" value={stats?.maintenance || 0} prefix={<ToolOutlined />} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="Taux occup." value={stats?.tauxOccupation || 0} suffix="%" /></Card>
        </Col>
      </Row>

      <div className="mb-3">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouvelle chambre
        </Button>
      </div>

      <Table dataSource={chambres || []} columns={columns} rowKey="id" loading={isLoading} size="small" />

      <Modal
        title={editingChambre ? 'Modifier la chambre' : 'Nouvelle chambre'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editingChambre) {
              updateMutation.mutate({ id: editingChambre.id, data: values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          {!editingChambre && (
            <Form.Item name="numero" label="Numero" rules={[{ required: true }]}>
              <Input placeholder="101" />
            </Form.Item>
          )}
          <Form.Item name="type" label="Categorie" rules={[{ required: true }]}>
            <Select options={[
              { value: 'SIMPLE', label: 'Simple' },
              { value: 'DOUBLE', label: 'Double' },
              { value: 'SUITE', label: 'Suite' },
              { value: 'VIP', label: 'VIP' },
            ]} />
          </Form.Item>
          <Form.Item name="capacite" label="Nombre de personnes max" rules={[{ required: true }]}>
            <InputNumber min={1} max={10} className="w-full" />
          </Form.Item>
          <Form.Item name="prixNuit" label="Prix par nuit (FCFA)" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="etage" label="Etage">
            <InputNumber className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
