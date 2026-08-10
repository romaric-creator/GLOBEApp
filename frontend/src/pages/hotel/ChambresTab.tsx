import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Form, Input, Select, InputNumber, Tag, Card, Row, Col, Statistic, App, Popconfirm, Tooltip, Skeleton } from 'antd';
import { PlusOutlined, HomeOutlined, CheckCircleOutlined, CloseCircleOutlined, ToolOutlined } from '@ant-design/icons';
import { hotelApi } from '../../api/hotel';
import type { Chambre } from '../../api/hotel';

const TYPE_COLORS: Record<string, string> = {
  SIMPLE: 'gold',
  DOUBLE: 'green',
  SUITE: 'purple',
  VIP: 'orange',
};

const STATUT_BG: Record<string, string> = {
  DISPONIBLE: 'border-green-400 bg-green-50',
  OCCUPEE: 'border-red-400 bg-red-50',
  MAINTENANCE: 'border-orange-400 bg-orange-50',
  RESERVEE: 'border-amber-400 bg-amber-50',
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
      queryClient.invalidateQueries({ queryKey: ['hotel-stats'] });
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

  return (
    <>
      <Row gutter={16} className="mb-4">
        <Col span={5}>
          <Card size="small"><Statistic title="Total" value={stats?.total || 0} prefix={<HomeOutlined />} /></Card>
        </Col>
        <Col span={5}>
          <Card size="small"><Statistic title="Disponibles" value={stats?.disponibles || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={5}>
          <Card size="small"><Statistic title="Occupees" value={stats?.occupees || 0} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
        <Col span={5}>
          <Card size="small"><Statistic title="Maintenance" value={stats?.maintenance || 0} prefix={<ToolOutlined />} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col span={4}>
          <Card size="small"><Statistic title="Taux" value={stats?.tauxOccupation || 0} suffix="%" /></Card>
        </Col>
      </Row>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> Disponible</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Occupee</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Reservee</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Maintenance</span>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouvelle chambre
        </Button>
      </div>

      {isLoading ? (
        <Row gutter={[12, 12]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Col key={i} xs={12} sm={8} md={6} lg={4}>
              <Card size="small"><Skeleton active title={{ width: '60%' }} paragraph={{ rows: 1 }} /></Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Row gutter={[12, 12]}>
          {(chambres || []).map((chambre) => (
            <Col key={chambre.id} xs={12} sm={8} md={6} lg={4}>
              <Tooltip title={`${Number(chambre.prixNuit).toLocaleString()} FCFA/nuit`}>
                <Card
                  size="small"
                  className={`border-2 cursor-pointer transition-all hover:shadow-md ${STATUT_BG[chambre.statut] || ''}`}
                  onClick={() => openEdit(chambre)}
                >
                  <div className="text-center">
                    <div className="text-lg font-bold">{chambre.numero}</div>
                    <Tag color={TYPE_COLORS[chambre.type]} className="mt-1">{chambre.type}</Tag>
                    <div className="text-xs text-slate-500 mt-1">{chambre.capacite} pers.</div>
                  </div>
                </Card>
              </Tooltip>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={editingChambre ? `Chambre ${editingChambre.numero}` : 'Nouvelle chambre'}
        open={modalOpen}
        onCancel={closeModal}
        footer={editingChambre ? [
          <Popconfirm key="del" title="Supprimer cette chambre ?" onConfirm={() => { deleteMutation.mutate(editingChambre.id); closeModal(); }}>
            <Button danger>Supprimer</Button>
          </Popconfirm>,
          <Button key="cancel" onClick={closeModal}>Annuler</Button>,
          <Button key="ok" type="primary" onClick={() => form.submit()} loading={updateMutation.isPending}>Enregistrer</Button>,
        ] : undefined}
        onOk={editingChambre ? undefined : () => form.submit()}
        confirmLoading={createMutation.isPending}
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
          {editingChambre && (
            <Form.Item name="statut" label="Statut">
              <Select options={[
                { value: 'DISPONIBLE', label: 'Disponible' },
                { value: 'MAINTENANCE', label: 'Maintenance' },
              ]} />
            </Form.Item>
          )}
          <Form.Item name="etage" label="Etage">
            <InputNumber className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
