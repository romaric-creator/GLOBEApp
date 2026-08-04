import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, App } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { produitsApi } from '../../api/produits';
import type { Categorie } from '../../api/produits';

export default function CategoriesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => produitsApi.getCategories().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { nom: string; description?: string }) => produitsApi.createCategorie(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success('Categorie creee');
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error('Erreur lors de la creation'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => produitsApi.deleteCategorie(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success('Categorie supprimee');
    },
    onError: () => message.error('Impossible de supprimer (contient des produits)'),
  });

  const columns = [
    { title: 'Nom', dataIndex: 'nom', key: 'nom' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Produits',
      key: 'count',
      render: (_: unknown, record: Categorie) => record._count?.produits ?? 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Categorie) => (
        <Popconfirm title="Supprimer cette categorie ?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Categories</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Nouvelle categorie
        </Button>
      </div>
      <Table columns={columns} dataSource={categories} rowKey="id" loading={isLoading} pagination={false} />

      <Modal
        title="Nouvelle categorie"
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="nom" label="Nom" rules={[{ required: true, message: 'Nom requis' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Creer</Button>
              <Button onClick={() => { setIsModalOpen(false); form.resetFields(); }}>Annuler</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
