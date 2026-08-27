import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Button, Modal, Form, InputNumber, Select, Input, Table, Tag,
  Row, Col, Statistic, App, Empty, Descriptions, Popconfirm, Skeleton,
} from 'antd';
import {
  UnlockOutlined, LockOutlined, DollarOutlined, ShoppingOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { caisseApi, MOYEN_OPTIONS } from '../../api/caisse';
import type { Caisse, SessionCaisse, Paiement } from '../../api/caisse';
import { restaurantApi } from '../../api/restaurant';
import type { Commande } from '../../api/restaurant';
import { getErrorMessage } from '../../api/errors';

export default function CaisseRestaurantPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [ouvrirModalOpen, setOuvrirModalOpen] = useState(false);
  const [fermerModalOpen, setFermerModalOpen] = useState(false);
  const [encaisserModal, setEncaisserModal] = useState<Commande | null>(null);
  const [fondInitialForm] = Form.useForm();
  const [fermerForm] = Form.useForm();
  const [encaisserForm] = Form.useForm();

  const { data: caisses, isLoading: caisseLoading } = useQuery({
    queryKey: ['caisses'],
    queryFn: caisseApi.getCaisses,
  });

  const caisse = caisses?.find((c: Caisse) => c.type === 'RESTAURANT_BAR');

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session-active-resto', caisse?.id],
    queryFn: () => caisseApi.getSessionActive(caisse!.id),
    enabled: !!caisse,
    refetchInterval: 15_000,
  });

  const { data: commandesTerminees } = useQuery({
    queryKey: ['commandes-terminee'],
    queryFn: () => restaurantApi.getCommandes('TERMINEE'),
    enabled: !!session,
    refetchInterval: 15_000,
  });

  const commandesAEncaisser = (commandesTerminees || []).filter((c: Commande) => !c.paiement);

  const totalEncaisse = ((session as SessionCaisse)?.paiements || []).reduce(
    (s: number, p: Paiement) => s + Number(p.montant),
    0,
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['session-active-resto'] });
    queryClient.invalidateQueries({ queryKey: ['commandes-terminee'] });
    queryClient.invalidateQueries({ queryKey: ['caisses'] });
  };

  const ouvrirMutation = useMutation({
    mutationFn: (fondInitial: number) => caisseApi.ouvrirSession(caisse!.id, fondInitial),
    onSuccess: () => { message.success('Caisse ouverte'); setOuvrirModalOpen(false); fondInitialForm.resetFields(); invalidate(); },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const fermerMutation = useMutation({
    mutationFn: ({ totalReel, notes }: { totalReel: number; notes?: string }) =>
      caisseApi.fermerSession((session as SessionCaisse).id, totalReel, notes),
    onSuccess: () => { message.success('Caisse cloturee'); setFermerModalOpen(false); fermerForm.resetFields(); invalidate(); },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const encaisserMutation = useMutation({
    mutationFn: (data: { commandeId: string; montant: number; moyen: string }) =>
      caisseApi.encaisserRestaurant({ ...data, sessionId: (session as SessionCaisse).id }),
    onSuccess: () => { message.success('Paiement enregistre'); setEncaisserModal(null); encaisserForm.resetFields(); invalidate(); },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const loading = caisseLoading || sessionLoading;

  if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (!caisse) return <div className="p-8 text-center">Aucune caisse Restaurant/Bar configuree.</div>;

  const paiementsColumns = [
    { title: 'Reference', dataIndex: 'reference', key: 'ref', width: 160 },
    { title: 'Montant', dataIndex: 'montant', key: 'montant', render: (m: number) => `${Number(m).toLocaleString()} FCFA` },
    { title: 'Moyen', dataIndex: 'moyen', key: 'moyen', render: (m: string) => <Tag>{m}</Tag> },
    {
      title: 'Heure',
      dataIndex: 'createdAt',
      key: 'heure',
      render: (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    },
  ];

  const commandesColumns = [
    { title: 'N°', dataIndex: 'numero', key: 'numero', width: 160 },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (t: number) => `${Number(t).toLocaleString()} FCFA` },
    {
      title: 'Heure',
      dataIndex: 'createdAt',
      key: 'heure',
      render: (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, r: Commande) => (
        <Button
          type="primary"
          size="small"
          icon={<DollarOutlined />}
          onClick={() => { setEncaisserModal(r); encaisserForm.setFieldsValue({ montant: Number(r.total), moyen: 'ESPECES' }); }}
        >
          Encaisser
        </Button>
      ),
    },
  ];

  return (
    <div id="tour-caisse-resto-page">
      <div id="tour-caisse-resto-header" className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold m-0">Caisse Restaurant / Bar</h2>
          <p className="text-slate-500 text-sm m-0">
            {caisse.nom}
            {session && (
              <span className="ml-3 text-slate-400">
                Ouverte depuis {new Date((session as SessionCaisse).ouvertureAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        {session ? (
          <Popconfirm
            title="Cloturer la caisse ?"
            description="Vous allez saisir le montant reel et generer le rapport de cloture."
            icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            onConfirm={() => setFermerModalOpen(true)}
            okText="Continuer"
            okButtonProps={{ danger: true }}
            cancelText="Annuler"
          >
            <Button danger icon={<LockOutlined />}>Cloturer la caisse</Button>
          </Popconfirm>
        ) : (
          <Button type="primary" icon={<UnlockOutlined />} onClick={() => setOuvrirModalOpen(true)}>
            Ouvrir la caisse
          </Button>
        )}
      </div>

      {!session ? (
        <Empty description="La caisse est fermee. Ouvrez une session pour commencer." />
      ) : (
        <>
          <Row gutter={16} className="mb-6">
            <Col span={8}>
              <Card size="small">
                <Statistic title="Fond initial" value={Number((session as SessionCaisse).fondInitial)} suffix="FCFA" />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Total encaisse"
                  value={totalEncaisse}
                  suffix="FCFA"
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="A encaisser"
                  value={commandesAEncaisser.length}
                  prefix={<ShoppingOutlined />}
                  valueStyle={{ color: commandesAEncaisser.length > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Commandes a encaisser" className="mb-4" size="small">
            {commandesAEncaisser.length === 0 ? (
              <Empty description="Aucune commande en attente d'encaissement" />
            ) : (
              <Table
                dataSource={commandesAEncaisser}
                columns={commandesColumns}
                rowKey="id"
                size="small"
                pagination={false}
              />
            )}
          </Card>

          <Card title="Paiements de la session" size="small">
            <Table
              dataSource={(session as SessionCaisse).paiements || []}
              columns={paiementsColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </>
      )}

      {/* Modal ouverture */}
      <Modal
        title="Ouvrir la caisse"
        open={ouvrirModalOpen}
        onCancel={() => { setOuvrirModalOpen(false); fondInitialForm.resetFields(); }}
        onOk={() => fondInitialForm.submit()}
        confirmLoading={ouvrirMutation.isPending}
        okText="Ouvrir"
      >
        <Form form={fondInitialForm} layout="vertical" onFinish={(v) => ouvrirMutation.mutate(v.fondInitial ?? 0)}>
          <Form.Item name="fondInitial" label="Fond initial (FCFA)" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal cloture */}
      <Modal
        title="Cloturer la caisse"
        open={fermerModalOpen}
        onCancel={() => { setFermerModalOpen(false); fermerForm.resetFields(); }}
        onOk={() => fermerForm.submit()}
        confirmLoading={fermerMutation.isPending}
        okText="Cloturer"
      >
        <Descriptions size="small" className="mb-4">
          <Descriptions.Item label="Total theorique">{(Number((session as SessionCaisse)?.fondInitial || 0) + totalEncaisse).toLocaleString()} FCFA</Descriptions.Item>
        </Descriptions>
        <Form form={fermerForm} layout="vertical" onFinish={(v) => fermerMutation.mutate({ totalReel: v.totalReel, notes: v.notes })}>
          <Form.Item name="totalReel" label="Montant reel en caisse (FCFA)" rules={[{ required: true, message: 'Requis' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes (optionnel)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal encaissement */}
      <Modal
        title={`Encaisser commande ${encaisserModal?.numero}`}
        open={!!encaisserModal}
        onCancel={() => { setEncaisserModal(null); encaisserForm.resetFields(); }}
        onOk={() => encaisserForm.submit()}
        confirmLoading={encaisserMutation.isPending}
        okText="Encaisser"
      >
        {encaisserModal && (
          <Descriptions size="small" className="mb-4" column={2} bordered>
            <Descriptions.Item label="Heure">{new Date(encaisserModal.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Descriptions.Item>
            <Descriptions.Item label="Articles" span={2}>
              <div className="flex flex-wrap gap-1">
                {encaisserModal.lignes.map((l) => (
                  <Tag key={l.id} color="gold">{l.quantite}x {l.produit.nom}</Tag>
                ))}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Total" span={2}>
              <span className="font-semibold text-base">{Number(encaisserModal.total).toLocaleString()} FCFA</span>
            </Descriptions.Item>
          </Descriptions>
        )}
        <Form
          form={encaisserForm}
          layout="vertical"
          onFinish={(v) => {
            if (!encaisserModal) return;
            encaisserMutation.mutate({ commandeId: encaisserModal.id, montant: v.montant, moyen: v.moyen });
          }}
        >
          <Form.Item name="montant" label="Montant recu (FCFA)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="moyen" label="Moyen de paiement" initialValue="ESPECES" rules={[{ required: true }]}>
            <Select options={MOYEN_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
