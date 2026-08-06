import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, Select, InputNumber, Input,
  Tag, Space, App, Popconfirm, Card, Row, Col, Statistic,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, CoffeeOutlined, DollarOutlined } from '@ant-design/icons';
import { restaurantApi } from '../../api/restaurant';
import type { Commande, ArticleMenu } from '../../api/restaurant';
import { useAuthStore } from '../../store/auth';

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: 'orange',
  EN_PREPARATION: 'blue',
  PRETE: 'cyan',
  SERVIE: 'green',
  PAYEE: 'default',
  ANNULEE: 'red',
};

const CAT_COLORS: Record<string, string> = {
  BOISSON: 'blue',
  PLAT: 'orange',
  DESSERT: 'purple',
  AUTRE: 'default',
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

  const { data: articles } = useQuery({
    queryKey: ['articles-menu'],
    queryFn: () => restaurantApi.getArticles(),
  });

  const { data: stats } = useQuery({
    queryKey: ['restaurant-stats'],
    queryFn: restaurantApi.getStats,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['commandes-resto'] });
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

  const getNextActions = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE': return [
        { label: 'Preparer', next: 'EN_PREPARATION', type: 'primary' as const },
        { label: 'Annuler', next: 'ANNULEE', danger: true },
      ];
      case 'EN_PREPARATION': return [
        { label: 'Prete', next: 'PRETE', type: 'primary' as const },
        { label: 'Annuler', next: 'ANNULEE', danger: true },
      ];
      case 'PRETE': return [{ label: 'Servir', next: 'SERVIE', type: 'primary' as const }];
      case 'SERVIE': return [{ label: 'Encaisser', next: 'PAYEE', type: 'primary' as const }];
      default: return [];
    }
  };

  const articleOptions = (articles || []).map((a: ArticleMenu) => ({
    value: a.id,
    label: a.nom,
    prix: a.prix,
    categorie: a.categorie,
  }));

  const columns = [
    { title: 'N°', dataIndex: 'numero', key: 'numero', width: 130 },
    {
      title: 'Articles',
      key: 'articles',
      render: (_: unknown, r: Commande) => (
        <div className="flex flex-wrap gap-1">
          {r.lignes.map((l) => (
            <Tag key={l.id} color={CAT_COLORS[l.article.categorie]} className="text-xs">
              {l.quantite}× {l.article.nom}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
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
      width: 130,
      render: (s: string) => <Tag color={STATUT_COLORS[s]}>{s.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, r: Commande) => (
        <Space size="small">
          {getNextActions(r.statut).map((a) =>
            a.danger ? (
              <Popconfirm key={a.next} title="Annuler cette commande ?" onConfirm={() => statutMutation.mutate({ id: r.id, statut: a.next })}>
                <Button size="small" danger>{a.label}</Button>
              </Popconfirm>
            ) : (
              <Button key={a.next} size="small" type={a.type}
                onClick={() => statutMutation.mutate({ id: r.id, statut: a.next })}>
                {a.label}
              </Button>
            )
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
            <Statistic title="En cours" value={stats?.commandesEnCours || 0} prefix={<CoffeeOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Aujourd'hui" value={stats?.commandesAujourdHui || 0} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="CA du jour" value={stats?.caJour || 0} suffix="FCFA" prefix={<DollarOutlined />} valueStyle={{ color: '#3f8600' }} />
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
      </div>

      <Table dataSource={commandes || []} columns={columns} rowKey="id" loading={isLoading} size="small"
        pagination={{ pageSize: 15 }} />

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
              notes: values.notes || undefined,
              lignes: values.lignes.map((l: { articleId: string; quantite: number; notes?: string }) => ({
                articleId: l.articleId,
                quantite: l.quantite,
                notes: l.notes || undefined,
              })),
            });
          }}
        >
          <Form.Item name="notes" label="Notes (optionnel)">
            <Input placeholder="Instructions speciales..." />
          </Form.Item>

          <label className="text-sm font-medium mb-2 block">Articles</label>
          <Form.List name="lignes" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} className="flex gap-2 mb-2">
                    <Form.Item {...rest} name={[name, 'articleId']} rules={[{ required: true, message: 'Requis' }]} className="flex-1 mb-0">
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Choisir un article"
                        options={articleOptions}
                        optionRender={(opt) => (
                          <div className="flex justify-between">
                            <span>{opt.data.label}</span>
                            <span className="text-slate-400 text-xs ml-2">
                              <Tag color={CAT_COLORS[opt.data.categorie]} className="text-xs">{opt.data.categorie}</Tag>
                              {Number(opt.data.prix).toLocaleString()} F
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
