import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber,
  Tag, Space, App, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { restaurantApi } from '../../api/restaurant';
import type { ArticleMenu } from '../../api/restaurant';

const CAT_COLORS: Record<string, string> = {
  BOISSON: 'blue',
  PLAT: 'orange',
  DESSERT: 'purple',
  AUTRE: 'default',
};

const CAT_LABELS: Record<string, string> = {
  BOISSON: 'Boisson',
  PLAT: 'Plat',
  DESSERT: 'Dessert',
  AUTRE: 'Autre',
};

export default function MenuTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleMenu | null>(null);
  const [form] = Form.useForm();

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles-menu'],
    queryFn: () => restaurantApi.getArticles(),
  });

  const createMutation = useMutation({
    mutationFn: restaurantApi.createArticle,
    onSuccess: () => {
      message.success('Article cree');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['articles-menu'] });
    },
    onError: () => message.error('Erreur lors de la creation'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof restaurantApi.updateArticle>[1] }) =>
      restaurantApi.updateArticle(id, data),
    onSuccess: () => {
      message.success('Article modifie');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['articles-menu'] });
    },
    onError: () => message.error('Erreur lors de la modification'),
  });

  const deleteMutation = useMutation({
    mutationFn: restaurantApi.deleteArticle,
    onSuccess: () => {
      message.success('Article desactive');
      queryClient.invalidateQueries({ queryKey: ['articles-menu'] });
    },
    onError: () => message.error('Erreur'),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingArticle(null);
    form.resetFields();
  };

  const openEdit = (a: ArticleMenu) => {
    setEditingArticle(a);
    form.setFieldsValue(a);
    setModalOpen(true);
  };

  const grouped = Object.entries(
    (articles || []).reduce((acc: Record<string, ArticleMenu[]>, a) => {
      if (!acc[a.categorie]) acc[a.categorie] = [];
      acc[a.categorie].push(a);
      return acc;
    }, {})
  );

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      render: (nom: string, record: ArticleMenu) => (
        <div>
          <div className="font-medium">{nom}</div>
          {record.description && <div className="text-xs text-slate-400">{record.description}</div>}
        </div>
      ),
    },
    {
      title: 'Categorie',
      dataIndex: 'categorie',
      key: 'categorie',
      width: 120,
      render: (cat: string) => <Tag color={CAT_COLORS[cat]}>{CAT_LABELS[cat]}</Tag>,
    },
    {
      title: 'Prix',
      dataIndex: 'prix',
      key: 'prix',
      width: 130,
      render: (p: number) => `${Number(p).toLocaleString()} FCFA`,
      sorter: (a: ArticleMenu, b: ArticleMenu) => Number(a.prix) - Number(b.prix),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: ArticleMenu) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Supprimer cet article ?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouvel article
        </Button>
      </div>

      {grouped.length === 0 && !isLoading ? (
        <div className="text-center py-8 text-slate-400">
          Aucun article dans le menu. Ajoutez vos boissons et plats.
        </div>
      ) : (
        grouped.map(([categorie, items]) => (
          <div key={categorie} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Tag color={CAT_COLORS[categorie]} className="text-sm px-3 py-0.5">
                {CAT_LABELS[categorie]} ({items.length})
              </Tag>
            </div>
            <Table
              columns={columns}
              dataSource={items}
              rowKey="id"
              loading={isLoading}
              pagination={false}
              size="small"
              showHeader={categorie === grouped[0][0]}
            />
          </div>
        ))
      )}

      <Modal
        title={editingArticle ? 'Modifier article' : 'Nouvel article du menu'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingArticle ? 'Enregistrer' : 'Creer'}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ categorie: 'BOISSON' }}
          onFinish={(values) => {
            if (editingArticle) {
              updateMutation.mutate({ id: editingArticle.id, data: values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item name="nom" label="Nom" rules={[{ required: true, message: 'Nom requis' }]}>
            <Input placeholder="Ex: Biere locale, Poulet braise, Coca-Cola..." />
          </Form.Item>
          <Form.Item name="categorie" label="Categorie" rules={[{ required: true }]}>
            <Select options={[
              { value: 'BOISSON', label: 'Boisson' },
              { value: 'PLAT', label: 'Plat' },
              { value: 'DESSERT', label: 'Dessert' },
              { value: 'AUTRE', label: 'Autre' },
            ]} />
          </Form.Item>
          <Form.Item name="prix" label="Prix (FCFA)" rules={[{ required: true, message: 'Prix requis' }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="description" label="Description (optionnel)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
