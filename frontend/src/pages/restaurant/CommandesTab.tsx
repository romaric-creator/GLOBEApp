import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Select, InputNumber, Input, Tag, Space, App } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { restaurantApi } from '../../api/restaurant';
import { produitsApi } from '../../api/produits';
import type { Commande } from '../../api/restaurant';
import { useAuthStore } from '../../store/auth';

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: 'orange',
  EN_PREPARATION: 'blue',
  PRETE: 'cyan',
  SERVIE: 'green',
  PAYEE: 'default',
  ANNULEE: 'red',
};

export default function CommandesTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const { data: commandes, isLoading } = useQuery({
    queryKey: ['commandes-resto', filterStatut],
    queryFn: () => restaurantApi.getCommandes(filterStatut),
  });

  const { data: tables } = useQuery({
    queryKey: ['tables-resto'],
    queryFn: restaurantApi.getTables,
  });

  const { data: produits } = useQuery({
    queryKey: ['produits'],
    queryFn: () => produitsApi.findAll().then((r) => r.data),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['commandes-resto'] });
    queryClient.invalidateQueries({ queryKey: ['tables-resto'] });
    queryClient.invalidateQueries({ queryKey: ['restaurant-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: restaurantApi.createCommande,
    onSuccess: () => {
      message.success('Commande creee');
      setModalOpen(false);
      form.resetFields();
      invalidateAll();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const statutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: string }) =>
      restaurantApi.changerStatut(id, statut),
    onSuccess: () => {
      message.success('Statut mis a jour');
      invalidateAll();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const getNextActions = (statut: string): { label: string; next: string; color?: string }[] => {
    switch (statut) {
      case 'EN_ATTENTE':
        return [
          { label: 'Preparer', next: 'EN_PREPARATION' },
          { label: 'Annuler', next: 'ANNULEE', color: 'danger' },
        ];
      case 'EN_PREPARATION':
        return [
          { label: 'Prete', next: 'PRETE' },
          { label: 'Annuler', next: 'ANNULEE', color: 'danger' },
        ];
      case 'PRETE':
        return [{ label: 'Servir', next: 'SERVIE' }];
      case 'SERVIE':
        return [{ label: 'Encaisser', next: 'PAYEE' }];
      default:
        return [];
    }
  };

  const columns = [
    { title: 'N°', dataIndex: 'numero', key: 'numero', width: 130 },
    {
      title: 'Table',
      key: 'table',
      width: 90,
      render: (_: unknown, r: Commande) => `T${r.table.numero}`,
    },
    {
      title: 'Serveur',
      key: 'serveur',
      render: (_: unknown, r: Commande) => `${r.serveur.prenom} ${r.serveur.nom}`,
    },
    {
      title: 'Articles',
      key: 'articles',
      render: (_: unknown, r: Commande) =>
        r.lignes.map((l) => `${l.quantite}x ${l.produit.nom}`).join(', '),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 110,
      render: (t: number) => `${Number(t).toLocaleString()} FCFA`,
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 120,
      render: (s: string) => <Tag color={STATUT_COLORS[s]}>{s.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, r: Commande) => (
        <Space size="small">
          {getNextActions(r.statut).map((a) => (
            <Button
              key={a.next}
              size="small"
              type={a.color === 'danger' ? 'default' : 'primary'}
              danger={a.color === 'danger'}
              onClick={() => statutMutation.mutate({ id: r.id, statut: a.next })}
            >
              {a.label}
            </Button>
          ))}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex gap-3">
        <Select
          placeholder="Filtrer par statut"
          allowClear
          style={{ width: 180 }}
          onChange={(v) => setFilterStatut(v || undefined)}
          options={[
            { value: 'EN_ATTENTE', label: 'En attente' },
            { value: 'EN_PREPARATION', label: 'En preparation' },
            { value: 'PRETE', label: 'Prete' },
            { value: 'SERVIE', label: 'Servie' },
            { value: 'PAYEE', label: 'Payee' },
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouvelle commande
        </Button>
      </div>

      <Table dataSource={commandes || []} columns={columns} rowKey="id" loading={isLoading} size="small" />

      <Modal
        title="Nouvelle commande"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            createMutation.mutate({
              tableId: values.tableId,
              serveurId: user?.id || '',
              notes: values.notes || undefined,
              lignes: values.lignes.map((l: { produitId: string; quantite: number; notes?: string }) => ({
                produitId: l.produitId,
                quantite: l.quantite,
                notes: l.notes || undefined,
              })),
            });
          }}
        >
          <Form.Item name="tableId" label="Table" rules={[{ required: true }]}>
            <Select
              options={(tables || [])
                .filter((t) => t.statut === 'LIBRE' || t.statut === 'OCCUPEE')
                .map((t) => ({
                  value: t.id,
                  label: `Table ${t.numero}${t.zone ? ` (${t.zone})` : ''} - ${t.statut}`,
                }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notes commande">
            <Input placeholder="Instructions speciales..." />
          </Form.Item>

          <Form.List name="lignes" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} className="flex gap-2 mb-2">
                    <Form.Item {...rest} name={[name, 'produitId']} rules={[{ required: true }]} className="flex-1 mb-0">
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Produit"
                        options={(produits || []).map((p: { id: string; nom: string; prixVente: number }) => ({
                          value: p.id,
                          label: `${p.nom} - ${Number(p.prixVente).toLocaleString()} FCFA`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'quantite']} initialValue={1} className="mb-0" style={{ width: 80 }}>
                      <InputNumber min={1} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      />
                    )}
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Ajouter un article
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
}
