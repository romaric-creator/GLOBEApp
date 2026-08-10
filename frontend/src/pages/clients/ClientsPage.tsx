import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, Tag, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { clientsApi } from '../../api/clients';
import type { Client, CreateClientDto } from '../../api/clients';
import EmptyState from '../../components/EmptyState';
import { getErrorMessage } from '../../api/errors';

export default function ClientsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.findAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateClientDto) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success('Client cree');
      closeModal();
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateClientDto> }) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success('Client modifie');
      closeModal();
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success('Client supprime');
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const openCreate = () => {
    setEditingClient(null);
    form.resetFields();
    form.setFieldValue('type', 'PARTICULIER');
    setIsModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    form.setFieldsValue(client);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    form.resetFields();
  };

  const handleSubmit = (values: CreateClientDto) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'ENTREPRISE' ? 'gold' : 'green'}>
          {type === 'ENTREPRISE' ? 'Entreprise' : 'Particulier'}
        </Tag>
      ),
    },
    { title: 'Nom', dataIndex: 'nom', key: 'nom', sorter: (a: Client, b: Client) => a.nom.localeCompare(b.nom) },
    { title: 'Prenom', dataIndex: 'prenom', key: 'prenom' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Telephone', dataIndex: 'telephone', key: 'telephone' },
    { title: 'Fidelite', dataIndex: 'pointsFidelite', key: 'pointsFidelite' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Client) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Supprimer ce client ?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const [searchText, setSearchText] = useState('');

  const filteredClients = clients?.filter((c) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return c.nom.toLowerCase().includes(q) ||
      (c.prenom || '').toLowerCase().includes(q) ||
      (c.telephone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q);
  });

  return (
    <div id="tour-clients-page">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Gestion des Clients</h2>
        <div className="flex gap-3">
          <Input
            placeholder="Rechercher..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nouveau client
          </Button>
        </div>
      </div>

      {!isLoading && clients?.length === 0 ? (
        <EmptyState
          title="Aucun client"
          description="Ajoutez votre premier client pour commencer"
          actionLabel="Nouveau client"
          onAction={openCreate}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredClients}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10, showTotal: (total) => `${total} client(s)` }}
        />
      )}

      <Modal
        title={editingClient ? 'Modifier le client' : 'Nouveau client'}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ type: 'PARTICULIER' }}>
          <Form.Item name="type" label="Type de client">
            <Select>
              <Select.Option value="PARTICULIER">Particulier</Select.Option>
              <Select.Option value="ENTREPRISE">Entreprise</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="nom" label="Nom" rules={[{ required: true, message: 'Nom requis' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="prenom" label="Prenom">
            <Input />
          </Form.Item>
          <Form.Item name="raisonSociale" label="Raison sociale">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email invalide' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="telephone" label="Telephone">
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingClient ? 'Modifier' : 'Creer'}
              </Button>
              <Button onClick={closeModal}>Annuler</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
