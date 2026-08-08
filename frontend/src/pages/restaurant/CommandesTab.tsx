import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, Select, InputNumber, Input,
  Tag, Space, App, Popconfirm, Card, Row, Col, Statistic,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, CoffeeOutlined, DollarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { restaurantApi } from '../../api/restaurant';
import type { Commande } from '../../api/restaurant';
import { produitsApi } from '../../api/produits';
import type { Produit } from '../../api/produits';
import { useAuthStore } from '../../store/auth';

const STATUT_COLORS: Record<string, string> = {
  EN_PREPARATION: 'blue',
  TERMINEE: 'green',
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

  const { data: produits } = useQuery({
    queryKey: ['produits'],
    queryFn: () => produitsApi.findAll().then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['restaurant-stats'],
    queryFn: restaurantApi.getStats,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['commandes-resto'] });
    queryClient.invalidateQueries({ queryKey: ['restaurant-stats'] });
    queryClient.invalidateQueries({ queryKey: ['produits'] });
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

  const terminerMutation = useMutation({
    mutationFn: (id: string) => restaurantApi.terminer(id),
    onSuccess: () => { message.success('Commande terminee'); invalidateAll(); },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const annulerMutation = useMutation({
    mutationFn: (id: string) => restaurantApi.annuler(id),
    onSuccess: () => { message.success('Commande annulee'); invalidateAll(); },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const produitOptions = (produits || [])
    .filter((p: Produit) => p.actif)
    .map((p: Produit) => ({
      value: p.id,
      label: `${p.nom} (${p.categorie.nom})`,
      prixVente: p.prixVente,
      stock: p.stockActuel,
      unite: p.unite,
    }));

  const columns = [
    { title: 'N°', dataIndex: 'numero', key: 'numero', width: 160 },
    {
      title: 'Table',
      dataIndex: 'tableReference',
      key: 'table',
      width: 100,
      render: (t: string | null) => t || <span className="text-slate-400">-</span>,
    },
    {
      title: 'Articles',
      key: 'articles',
      render: (_: unknown, r: Commande) => (
        <div className="flex flex-wrap gap-1">
          {r.lignes.map((l) => (
            <Tag key={l.id} color="blue" className="text-xs">
              {l.quantite}x {l.produit.nom}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      render: (t: number) => `${Number(t).toLocaleString()} FCFA`,
    },
    {
      title: 'Heure',
      dataIndex: 'createdAt',
      key: 'heure',
      width: 80,
      render: (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 140,
      render: (s: string) => <Tag color={STATUT_COLORS[s]}>{s.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 240,
      render: (_: unknown, r: Commande) => (
        <Space size="small">
          {r.statut === 'EN_PREPARATION' && (
            <>
              <Button
                size="small"
                type="primary"
                onClick={() => terminerMutation.mutate(r.id)}
                loading={terminerMutation.isPending}
              >
                Terminer
              </Button>
              <Popconfirm title="Annuler cette commande ?" onConfirm={() => annulerMutation.mutate(r.id)}>
                <Button size="small" danger>Annuler</Button>
              </Popconfirm>
            </>
          )}
          {r.statut === 'TERMINEE' && (
            r.paiement
              ? <Tag color="default">Encaissee</Tag>
              : <Tag color="orange">A encaisser</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="En preparation"
              value={stats?.commandesEnPreparation || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Aujourd'hui" value={stats?.commandesAujourdHui || 0} prefix={<CoffeeOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="CA du jour"
              value={stats?.caJour || 0}
              suffix="FCFA"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="mb-3 flex gap-3">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouvelle commande
        </Button>
        <Select
          placeholder="Filtrer par statut"
          allowClear
          style={{ width: 200 }}
          onChange={(v) => setFilterStatut(v || undefined)}
          options={[
            { value: 'EN_PREPARATION', label: 'En preparation' },
            { value: 'TERMINEE', label: 'Terminee' },
            { value: 'ANNULEE', label: 'Annulee' },
          ]}
        />
      </div>

      <Table
        dataSource={commandes || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 15 }}
      />

      <Modal
        title="Nouvelle commande"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        width={580}
        okText="Valider"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (!user) return;
            createMutation.mutate({
              serveurId: user.id,
              tableReference: values.tableReference || undefined,
              notes: values.notes || undefined,
              lignes: values.lignes.map((l: { produitId: string; quantite: number; notes?: string }) => ({
                produitId: l.produitId,
                quantite: l.quantite,
                notes: l.notes || undefined,
              })),
            });
          }}
        >
          <Form.Item name="tableReference" label="Reference table (optionnel)">
            <Input placeholder="Ex: Table 5, Terrasse A..." />
          </Form.Item>

          <Form.Item name="notes" label="Notes (optionnel)">
            <Input placeholder="Instructions speciales..." />
          </Form.Item>

          <label className="text-sm font-medium mb-2 block">Produits</label>
          <Form.List name="lignes" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} className="flex gap-2 mb-2">
                    <Form.Item {...rest} name={[name, 'produitId']} rules={[{ required: true, message: 'Requis' }]} className="flex-1 mb-0">
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Choisir un produit"
                        options={produitOptions}
                        optionRender={(opt) => (
                          <div className="flex justify-between">
                            <span>{opt.data.label}</span>
                            <span className="text-slate-400 text-xs ml-2">
                              {Number(opt.data.prixVente).toLocaleString()} F
                              {' '}<Tag color={opt.data.stock > 0 ? 'green' : 'red'} className="text-xs ml-1">
                                stock: {opt.data.stock}
                              </Tag>
                            </span>
                          </div>
                        )}
                      />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'quantite']} initialValue={1} className="mb-0" style={{ width: 80 }}>
                      <InputNumber min={1} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                    )}
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Ajouter un produit
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
}
