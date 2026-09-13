import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Form, Input, Select, InputNumber, Tag, Card, Row, Col, Statistic, App, Popconfirm, Tooltip, Skeleton } from 'antd';
import { PlusOutlined, HomeOutlined, CheckCircleOutlined, CloseCircleOutlined, ToolOutlined } from '@ant-design/icons';
import { hotelApi } from '../../api/hotel';
import type { Chambre } from '../../api/hotel';
import { useMsg } from '../../hooks/useMsg';
import { useAuthStore } from '../../store/auth';

const TYPE_COLORS: Record<string, string> = {
  STANDARD: 'gold',
  JUNIOR: 'green',
  JUNIOR_PLUS: 'purple',
  SENIOR: 'orange',
  STUDIO: 'cyan',
  APPARTEMENT: 'blue',
};

const STATUT_BG: Record<string, string> = {
  DISPONIBLE: 'border-green-400 bg-green-50',
  OCCUPEE: 'border-red-400 bg-red-50',
  MAINTENANCE: 'border-orange-400 bg-orange-50',
  RESERVEE: 'border-amber-400 bg-amber-50',
};

export default function ChambresTab() {
  const { message } = App.useApp();
  const { err } = useMsg();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
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
    onError: (e: unknown) => err(e),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Chambre> }) => hotelApi.updateChambre(id, data),
    onSuccess: () => {
      message.success('Chambre modifiee');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['chambres'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-stats'] });
    },
    onError: (e: unknown) => err(e),
  });

  const deleteMutation = useMutation({
    mutationFn: hotelApi.deleteChambre,
    onSuccess: () => {
      message.success('Chambre supprimee');
      queryClient.invalidateQueries({ queryKey: ['chambres'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-stats'] });
    },
    onError: (e: unknown) => err(e),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingChambre(null);
    form.resetFields();
  };

  const openEdit = (chambre: Chambre) => {
    setEditingChambre(chambre);
    form.setFieldsValue({
      ...chambre,
      prixSieste: chambre.prixSieste ?? undefined,
      prixJournee: chambre.prixJournee ?? undefined,
    });
    setModalOpen(true);
  };

  return (
    <>
      <Row gutter={16} className="mb-4">
        <Col span={5}>
          <Card size="small"><Statistic title="Total" value={stats?.total || 0} prefix={<HomeOutlined />} /></Card>
        </Col>
        <Col span={5}>
          <Card size="small"><Statistic title="Disponibles" value={stats?.disponibles || 0} prefix={<CheckCircleOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card>
        </Col>
        <Col span={5}>
          <Card size="small"><Statistic title="Occupees" value={stats?.occupees || 0} prefix={<CloseCircleOutlined />} styles={{ content: { color: '#ff4d4f' } }} /></Card>
        </Col>
        <Col span={5}>
          <Card size="small"><Statistic title="Maintenance" value={stats?.maintenance || 0} prefix={<ToolOutlined />} styles={{ content: { color: '#faad14' } }} /></Card>
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
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Nouvelle chambre
          </Button>
        )}
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
              <Tooltip title={[
                `${Number(chambre.prixNuit).toLocaleString()} FCFA/nuit`,
                chambre.prixSieste ? `${Number(chambre.prixSieste).toLocaleString()} FCFA/sieste` : null,
                chambre.prixJournee ? `${Number(chambre.prixJournee).toLocaleString()} FCFA/journee` : null,
              ].filter(Boolean).join(' · ')}>
                <Card
                  size="small"
                  className={`border-2 cursor-pointer transition-all hover:shadow-md ${STATUT_BG[chambre.statut] || ''}`}
                  onClick={() => openEdit(chambre)}
                >
                  <div className="text-center">
                    <div className="text-lg font-bold">{chambre.numero}</div>
                    <Tag color={TYPE_COLORS[chambre.type]} className="mt-1">{chambre.type}</Tag>
                    {chambre.description && (
                      <div className="text-xs text-slate-400 mt-1 leading-tight">{chambre.description}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">{chambre.capacite} pers.</div>
                    {chambre.statut === 'DISPONIBLE' && (
                      <Tooltip title="Mettre en maintenance">
                        <Button
                          type="link"
                          size="small"
                          icon={<ToolOutlined />}
                          className="mt-1 text-orange-400"
                          onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: chambre.id, data: { statut: 'MAINTENANCE' } }); }}
                        />
                      </Tooltip>
                    )}
                    {chambre.statut === 'MAINTENANCE' && (
                      <Tooltip title="Marquer disponible">
                        <Button
                          type="link"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          className="mt-1 text-green-500"
                          onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: chambre.id, data: { statut: 'DISPONIBLE' } }); }}
                        />
                      </Tooltip>
                    )}
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
          ...(isAdmin ? [
            <Popconfirm key="del" title="Supprimer cette chambre ?" onConfirm={() => { deleteMutation.mutate(editingChambre.id); closeModal(); }}>
              <Button danger>Supprimer</Button>
            </Popconfirm>,
          ] : []),
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
              { value: 'STANDARD', label: 'Standard' },
              { value: 'JUNIOR', label: 'Junior' },
              { value: 'JUNIOR_PLUS', label: 'Junior Plus' },
              { value: 'SENIOR', label: 'Senior' },
              { value: 'STUDIO', label: 'Studio' },
              { value: 'APPARTEMENT', label: 'Appartement' },
            ]} />
          </Form.Item>
          <Form.Item name="description" label="Description" extra="Ex: ventilée, climatisée, avec cuisine...">
            <Input placeholder="Optionnel" />
          </Form.Item>
          <Form.Item name="capacite" label="Nombre de personnes max" rules={[{ required: true }]}>
            <InputNumber min={1} max={10} className="w-full" />
          </Form.Item>
          {isAdmin && (
            <>
              <Form.Item name="prixNuit" label="Prix par nuit (FCFA)" rules={[{ required: !editingChambre }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
              <Form.Item name="prixSieste" label="Prix sieste (FCFA)" extra="Laisser vide si la chambre ne propose pas ce tarif">
                <InputNumber min={0} className="w-full" placeholder="Optionnel" />
              </Form.Item>
              <Form.Item name="prixJournee" label="Prix journee (FCFA)" extra="Laisser vide si la chambre ne propose pas ce tarif">
                <InputNumber min={0} className="w-full" placeholder="Optionnel" />
              </Form.Item>
            </>
          )}
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
