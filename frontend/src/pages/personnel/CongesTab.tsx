import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Select, DatePicker, Input, Tag, Space, App } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { personnelApi } from '../../api/personnel';
import type { Conge } from '../../api/personnel';

const statutColors: Record<string, string> = {
  EN_ATTENTE: 'processing',
  APPROUVE: 'success',
  REFUSE: 'error',
  ANNULE: 'default',
};

const typeLabels: Record<string, string> = {
  ANNUEL: 'Annuel',
  MALADIE: 'Maladie',
  SANS_SOLDE: 'Sans solde',
  MATERNITE: 'Maternite',
  EXCEPTIONNEL: 'Exceptionnel',
};

export default function CongesTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: employes } = useQuery({
    queryKey: ['employes'],
    queryFn: personnelApi.getEmployes,
  });

  const { data: conges, isLoading } = useQuery({
    queryKey: ['conges'],
    queryFn: () => personnelApi.getConges(),
  });

  const createMutation = useMutation({
    mutationFn: personnelApi.createConge,
    onSuccess: () => {
      message.success('Demande de conge creee');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['conges'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const approuverMutation = useMutation({
    mutationFn: personnelApi.approuverConge,
    onSuccess: () => {
      message.success('Conge approuve');
      queryClient.invalidateQueries({ queryKey: ['conges'] });
    },
  });

  const refuserMutation = useMutation({
    mutationFn: personnelApi.refuserConge,
    onSuccess: () => {
      message.success('Conge refuse');
      queryClient.invalidateQueries({ queryKey: ['conges'] });
    },
  });

  const columns = [
    {
      title: 'Employe',
      key: 'employe',
      render: (_: unknown, r: Conge) => `${r.employe.nom} ${r.employe.prenom}`,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t: string) => typeLabels[t] || t,
    },
    {
      title: 'Du',
      dataIndex: 'dateDebut',
      key: 'debut',
      width: 110,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Au',
      dataIndex: 'dateFin',
      key: 'fin',
      width: 110,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    { title: 'Motif', dataIndex: 'motif', key: 'motif', render: (m: string | null) => m || '-' },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 110,
      render: (s: string) => <Tag color={statutColors[s]}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Conge) =>
        record.statut === 'EN_ATTENTE' ? (
          <Space>
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => approuverMutation.mutate(record.id)} />
            <Button size="small" danger icon={<CloseOutlined />} onClick={() => refuserMutation.mutate(record.id)} />
          </Space>
        ) : null,
    },
  ];

  return (
    <>
      <div className="mb-3">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouvelle demande
        </Button>
      </div>

      <Table
        dataSource={conges || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
      />

      <Modal
        title="Demande de conge"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            createMutation.mutate({
              employeId: values.employeId,
              type: values.type,
              dateDebut: values.dates[0].format('YYYY-MM-DD'),
              dateFin: values.dates[1].format('YYYY-MM-DD'),
              motif: values.motif,
            });
          }}
        >
          <Form.Item name="employeId" label="Employe" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={employes?.filter((e) => e.actif).map((e) => ({
                value: e.id,
                label: `${e.matricule} - ${e.nom} ${e.prenom}`,
              })) || []}
            />
          </Form.Item>
          <Form.Item name="type" label="Type de conge" rules={[{ required: true }]}>
            <Select options={[
              { value: 'ANNUEL', label: 'Annuel' },
              { value: 'MALADIE', label: 'Maladie' },
              { value: 'SANS_SOLDE', label: 'Sans solde' },
              { value: 'MATERNITE', label: 'Maternite' },
              { value: 'EXCEPTIONNEL', label: 'Exceptionnel' },
            ]} />
          </Form.Item>
          <Form.Item name="dates" label="Periode" rules={[{ required: true }]}>
            <DatePicker.RangePicker className="w-full" />
          </Form.Item>
          <Form.Item name="motif" label="Motif">
            <Input.TextArea rows={2} placeholder="Raison du conge (optionnel)" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
