import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Space, Tag, Popconfirm, App } from 'antd';
import { PlusOutlined, EditOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { personnelApi } from '../../api/personnel';
import type { Employe, CreateEmployeDto } from '../../api/personnel';

const contratColors: Record<string, string> = {
  CDI: 'green',
  CDD: 'blue',
  STAGE: 'orange',
  FREELANCE: 'purple',
};

export default function EmployesTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data: employes, isLoading } = useQuery({
    queryKey: ['employes'],
    queryFn: personnelApi.getEmployes,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateEmployeDto) =>
      editingId ? personnelApi.updateEmploye(editingId, dto) : personnelApi.createEmploye(dto),
    onSuccess: () => {
      message.success(editingId ? 'Employe modifie' : 'Employe cree');
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['employes'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: personnelApi.toggleEmploye,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employes'] });
    },
  });

  const openEdit = (employe: Employe) => {
    setEditingId(employe.id);
    form.setFieldsValue(employe);
    setModalOpen(true);
  };

  const columns = [
    { title: 'Matricule', dataIndex: 'matricule', key: 'matricule', width: 100 },
    { title: 'Nom', dataIndex: 'nom', key: 'nom' },
    { title: 'Prenom', dataIndex: 'prenom', key: 'prenom' },
    { title: 'Poste', dataIndex: 'poste', key: 'poste' },
    {
      title: 'Salaire',
      dataIndex: 'salaire',
      key: 'salaire',
      width: 120,
      render: (v: number) => `${Number(v).toLocaleString()} FCFA`,
    },
    {
      title: 'Contrat',
      dataIndex: 'typeContrat',
      key: 'contrat',
      width: 90,
      render: (t: string) => <Tag color={contratColors[t]}>{t}</Tag>,
    },
    {
      title: 'Statut',
      dataIndex: 'actif',
      key: 'actif',
      width: 80,
      render: (a: boolean) => <Tag color={a ? 'green' : 'red'}>{a ? 'Actif' : 'Inactif'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Employe) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title={record.actif ? 'Desactiver cet employe ?' : 'Reactiver cet employe ?'}
            onConfirm={() => toggleMutation.mutate(record.id)}
          >
            <Button size="small" icon={<UserSwitchOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}>
          Nouvel employe
        </Button>
      </div>

      <Table
        dataSource={employes || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
      />

      <Modal
        title={editingId ? 'Modifier employe' : 'Nouvel employe'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="matricule" label="Matricule" rules={[{ required: !editingId }]}>
            <Input disabled={!!editingId} placeholder="EMP-009" />
          </Form.Item>
          <Form.Item name="nom" label="Nom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="prenom" label="Prenom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="poste" label="Poste" rules={[{ required: true }]}>
            <Input placeholder="Receptionniste, Cuisinier..." />
          </Form.Item>
          <Form.Item name="salaire" label="Salaire (FCFA)" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item name="typeContrat" label="Type de contrat" rules={[{ required: true }]}>
            <Select options={[
              { value: 'CDI', label: 'CDI' },
              { value: 'CDD', label: 'CDD' },
              { value: 'STAGE', label: 'Stage' },
              { value: 'FREELANCE', label: 'Freelance' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
