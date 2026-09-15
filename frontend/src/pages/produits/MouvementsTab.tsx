import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, InputNumber, Select, Input, Tag, App, Dropdown } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { produitsApi } from '../../api/produits';
import type { CreateMouvementDto, Produit } from '../../api/produits';
import { useMsg } from '../../hooks/useMsg';
import { exportToExcel, exportToPDF } from '../../utils/export';

const typeColors: Record<string, string> = {
  ENTREE: 'green',
  SORTIE: 'red',
  AJUSTEMENT: 'orange',
  INVENTAIRE: 'gold',
};

export default function MouvementsTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { err } = useMsg();

  const { data: mouvements, isLoading } = useQuery({
    queryKey: ['mouvements'],
    queryFn: () => produitsApi.getMouvements().then((r) => r.data),
  });

  const { data: produits } = useQuery({
    queryKey: ['produits'],
    queryFn: () => produitsApi.findAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateMouvementDto) => produitsApi.createMouvement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mouvements'] });
      queryClient.invalidateQueries({ queryKey: ['produits'] });
      message.success('Mouvement enregistre');
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (e: unknown) => err(e),
  });

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (v: string) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color={typeColors[type]}>{type}</Tag>,
    },
    { title: 'Produit', dataIndex: ['produit', 'nom'], key: 'produit' },
    { title: 'Reference', dataIndex: ['produit', 'reference'], key: 'reference' },
    { title: 'Quantite', dataIndex: 'quantite', key: 'quantite' },
    { title: 'Motif', dataIndex: 'motif', key: 'motif' },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Mouvements de stock</h2>
        <div className="flex gap-2">
          <Dropdown menu={{
            items: [
              {
                key: 'excel',
                label: 'Exporter Excel',
                onClick: () => exportToExcel(
                  (mouvements || []).map((m) => ({
                    Date: new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    Type: m.type,
                    Produit: m.produit?.nom ?? '',
                    Reference: m.produit?.reference ?? '',
                    Quantite: m.quantite,
                    Motif: m.motif ?? '',
                  })),
                  'mouvements-stock',
                  'Mouvements de stock',
                ),
              },
              {
                key: 'pdf',
                label: 'Exporter PDF',
                onClick: () => exportToPDF(
                  [
                    { header: 'Date', dataKey: 'date' },
                    { header: 'Type', dataKey: 'type' },
                    { header: 'Produit', dataKey: 'produit' },
                    { header: 'Ref', dataKey: 'reference' },
                    { header: 'Quantite', dataKey: 'quantite' },
                    { header: 'Motif', dataKey: 'motif' },
                  ],
                  (mouvements || []).map((m) => ({
                    date: new Date(m.date).toLocaleDateString('fr-FR'),
                    type: m.type,
                    produit: m.produit?.nom ?? '',
                    reference: m.produit?.reference ?? '',
                    quantite: m.quantite,
                    motif: m.motif ?? '',
                  })) as Record<string, unknown>[],
                  'mouvements-stock',
                  'Historique des mouvements de stock',
                ),
              },
            ],
          }}>
            <Button icon={<DownloadOutlined />}>Exporter</Button>
          </Dropdown>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Nouveau mouvement
          </Button>
        </div>
      </div>
      <Table columns={columns} dataSource={mouvements} rowKey="id" loading={isLoading} pagination={{ pageSize: 15 }} />

      <Modal
        title="Nouveau mouvement de stock"
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="produitId" label="Produit" rules={[{ required: true, message: 'Produit requis' }]}>
            <Select placeholder="Choisir un produit" showSearch optionFilterProp="children">
              {produits?.filter((p: Produit) => p.actif).map((p: Produit) => (
                <Select.Option key={p.id} value={p.id}>{p.nom} ({p.reference})</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Type requis' }]}>
            <Select>
              <Select.Option value="ENTREE">Entree (reception)</Select.Option>
              <Select.Option value="SORTIE">Sortie (perte/casse)</Select.Option>
              <Select.Option value="AJUSTEMENT">Ajustement</Select.Option>
              <Select.Option value="INVENTAIRE">Inventaire</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="quantite" label="Quantite" rules={[{ required: true, message: 'Quantite requise' }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="motif" label="Motif">
            <Input.TextArea rows={2} placeholder="Raison du mouvement" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending} block>
              Enregistrer
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
