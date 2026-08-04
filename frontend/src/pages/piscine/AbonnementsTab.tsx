import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Select, Input, InputNumber, DatePicker, Tag, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { piscineApi } from '../../api/piscine';
import { clientsApi } from '../../api/clients';
import type { AbonnementLoisir } from '../../api/piscine';

export default function AbonnementsTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: abonnements, isLoading } = useQuery({
    queryKey: ['abonnements-loisir'],
    queryFn: () => piscineApi.getAbonnements(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.findAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: piscineApi.createAbonnement,
    onSuccess: () => {
      message.success('Abonnement cree');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['abonnements-loisir'] });
      queryClient.invalidateQueries({ queryKey: ['piscine-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const resilierMutation = useMutation({
    mutationFn: piscineApi.resilierAbonnement,
    onSuccess: () => {
      message.success('Abonnement resilie');
      queryClient.invalidateQueries({ queryKey: ['abonnements-loisir'] });
      queryClient.invalidateQueries({ queryKey: ['piscine-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const columns = [
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: AbonnementLoisir) => `${r.client.nom} ${r.client.prenom}`,
    },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 120 },
    {
      title: 'Prix',
      dataIndex: 'prix',
      key: 'prix',
      width: 110,
      render: (p: number) => `${Number(p).toLocaleString()} FCFA`,
    },
    {
      title: 'Debut',
      dataIndex: 'dateDebut',
      key: 'debut',
      width: 100,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Fin',
      dataIndex: 'dateFin',
      key: 'fin',
      width: 100,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Statut',
      dataIndex: 'actif',
      key: 'statut',
      width: 90,
      render: (a: boolean) => <Tag color={a ? 'green' : 'red'}>{a ? 'Actif' : 'Resilie'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, r: AbonnementLoisir) =>
        r.actif && (
          <Button size="small" danger onClick={() => resilierMutation.mutate(r.id)}>
            Resilier
          </Button>
        ),
    },
  ];

  return (
    <>
      <div className="mb-3">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouvel abonnement
        </Button>
      </div>

      <Table dataSource={abonnements || []} columns={columns} rowKey="id" loading={isLoading} size="small" />

      <Modal
        title="Nouvel abonnement"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            createMutation.mutate({
              type: values.type,
              dateDebut: values.dates[0].format('YYYY-MM-DD'),
              dateFin: values.dates[1].format('YYYY-MM-DD'),
              prix: values.prix,
              clientId: values.clientId,
            });
          }}
        >
          <Form.Item name="clientId" label="Client" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={clients?.map((c: { id: string; nom: string; prenom: string }) => ({
                value: c.id,
                label: `${c.nom} ${c.prenom}`,
              })) || []}
            />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Input placeholder="Piscine, Salle de sport, Spa..." />
          </Form.Item>
          <Form.Item name="dates" label="Periode" rules={[{ required: true }]}>
            <DatePicker.RangePicker className="w-full" />
          </Form.Item>
          <Form.Item name="prix" label="Prix (FCFA)" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
