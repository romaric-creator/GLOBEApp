import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsg } from '../../hooks/useMsg';
import {
  Card, Button, Modal, Form, Input, InputNumber, Select, Table, Tag,
  Row, Col, Statistic, Space, App, Empty, Descriptions, Popconfirm, Skeleton, Collapse,
} from 'antd';
import {
  UnlockOutlined, LockOutlined, DollarOutlined, HomeOutlined, ExclamationCircleOutlined,
  WalletOutlined, PrinterOutlined, HistoryOutlined, EyeOutlined,
} from '@ant-design/icons';
import { caisseApi, ticketsApi, MOYEN_OPTIONS } from '../../api/caisse';
import type { Caisse, SessionCaisse, Paiement } from '../../api/caisse';
import { hotelApi } from '../../api/hotel';
import type { FactureSejour } from '../../api/hotel';
import { useAuthStore } from '../../store/auth';

export default function CaisseHotelPage() {
  const { message } = App.useApp();
  const { err } = useMsg();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const [ouvrirModalOpen, setOuvrirModalOpen] = useState(false);
  const [fermerModalOpen, setFermerModalOpen] = useState(false);
  const [encaisserModal, setEncaisserModal] = useState<FactureSejour | null>(null);
  const [mouvementModalOpen, setMouvementModalOpen] = useState(false);
  const [trancheFacture, setTrancheFacture] = useState<FactureSejour | null>(null);
  const [closedSessionId, setClosedSessionId] = useState<string | null>(null);
  const [histModalOpen, setHistModalOpen] = useState(false);
  const [histPage, setHistPage] = useState(1);
  const [fondInitialForm] = Form.useForm();
  const [fermerForm] = Form.useForm();
  const [encaisserForm] = Form.useForm();
  const [mouvementForm] = Form.useForm();
  const [trancheForm] = Form.useForm();
  const [montantRecu, setMontantRecu] = useState(0);
  const [moyenEnc, setMoyenEnc] = useState('ESPECES');

  const { data: caisses, isLoading: caisseLoading } = useQuery({
    queryKey: ['caisses'],
    queryFn: caisseApi.getCaisses,
  });

  const caisse = caisses?.find((c: Caisse) => c.type === 'HOTEL');

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session-active-hotel', caisse?.id],
    queryFn: () => caisseApi.getSessionActive(caisse!.id),
    enabled: !!caisse,
    refetchInterval: 15_000,
  });

  const { data: factures } = useQuery({
    queryKey: ['factures-hotel'],
    queryFn: () => hotelApi.getFactures(),
    enabled: !!session,
    refetchInterval: 15_000,
  });

  const { data: mouvements } = useQuery({
    queryKey: ['mouvements-caisse', (session as SessionCaisse)?.id],
    queryFn: () => caisseApi.getMouvements((session as SessionCaisse).id),
    enabled: !!session,
  });

  const facturesImpayees = (factures || []).filter((f: FactureSejour) => !f.payee);
  const facturesReglees = (factures || []).filter((f: FactureSejour) => f.payee);

  const totalEncaissePaiements = ((session as SessionCaisse)?.paiements || []).reduce(
    (s: number, p: Paiement) => s + Number(p.montant),
    0,
  );
  const totalEncaisse = totalEncaissePaiements + ((session as SessionCaisse)?.totalTranches ?? 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['session-active-hotel'] });
    queryClient.invalidateQueries({ queryKey: ['factures-hotel'] });
    queryClient.invalidateQueries({ queryKey: ['caisses'] });
    queryClient.invalidateQueries({ queryKey: ['mouvements-caisse'] });
  };

  const ouvrirMutation = useMutation({
    mutationFn: (fondInitial: number) => caisseApi.ouvrirSession(caisse!.id, fondInitial),
    onSuccess: () => { setClosedSessionId(null); message.success('Caisse ouverte'); setOuvrirModalOpen(false); fondInitialForm.resetFields(); invalidate(); },
    onError: (e: unknown) => err(e),
  });

  const fermerMutation = useMutation({
    mutationFn: ({ totalReel, notes, motifEcart }: { totalReel: number; notes?: string; motifEcart?: string }) =>
      caisseApi.fermerSession((session as SessionCaisse).id, totalReel, notes, motifEcart),
    onSuccess: () => {
      setClosedSessionId((session as SessionCaisse)?.id ?? null);
      message.success('Caisse cloturee');
      setFermerModalOpen(false);
      fermerForm.resetFields();
      invalidate();
    },
    onError: (e: unknown) => err(e),
  });

  const encaisserMutation = useMutation({
    mutationFn: (data: { factureId: string; montant: number; moyen: string }) =>
      caisseApi.encaisserHotel({ ...data, sessionId: (session as SessionCaisse).id }),
    onSuccess: () => { message.success('Paiement enregistre'); setEncaisserModal(null); encaisserForm.resetFields(); invalidate(); },
    onError: (e: unknown) => err(e),
  });

  const mouvementMutation = useMutation({
    mutationFn: (data: { type: string; montant: number; motif: string }) =>
      caisseApi.ajouterMouvement((session as SessionCaisse).id, data),
    onSuccess: () => {
      message.success('Mouvement enregistre');
      setMouvementModalOpen(false);
      mouvementForm.resetFields();
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['mouvements-caisse'] });
    },
    onError: (e: unknown) => err(e),
  });

  const { data: histData, isLoading: histLoading } = useQuery({
    queryKey: ['caisse-hist-hotel', caisse?.id, histPage],
    queryFn: () => caisseApi.getHistorique(caisse!.id, histPage),
    enabled: histModalOpen && !!caisse,
  });

  const { data: trancheData, refetch: refetchTranches } = useQuery({
    queryKey: ['tranches-facture', trancheFacture?.id],
    queryFn: () => caisseApi.getTranches(trancheFacture!.id),
    enabled: !!trancheFacture,
    retry: false,
  });

  const trancheMutation = useMutation({
    mutationFn: (data: { montant: number; moyen: string; notes?: string }) =>
      caisseApi.enregistrerTranche(trancheFacture!.id, data),
    onSuccess: () => {
      message.success('Tranche enregistree');
      trancheForm.resetFields();
      refetchTranches();
      invalidate();
    },
    onError: (e: unknown) => err(e),
  });

  const loading = caisseLoading || sessionLoading;

  if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (!caisse) return <div className="p-8 text-center">Aucune caisse Hotel configuree.</div>;

  const facturesColumns = [
    { title: 'N° Facture', dataIndex: 'numero', key: 'numero', width: 140 },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: FactureSejour) => `${r.reservation.client.nom} ${r.reservation.client.prenom}`,
    },
    { title: 'Chambre', key: 'chambre', render: (_: unknown, r: FactureSejour) => r.reservation.chambre.numero, width: 80 },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (t: number) => `${Number(t).toLocaleString()} FCFA` },
    {
      title: 'Reste',
      dataIndex: 'reste',
      key: 'reste',
      render: (r: number) => <span className="text-orange-600 font-medium">{Number(r).toLocaleString()} FCFA</span>,
    },
    {
      title: 'Paye',
      key: 'paye',
      width: 120,
      render: (_: unknown, r: FactureSejour) => `${Number(r.montantPaye).toLocaleString()} FCFA`,
    },
    {
      title: 'Actions',
      key: 'action',
      width: 200,
      render: (_: unknown, r: FactureSejour) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<DollarOutlined />}
            onClick={() => { setEncaisserModal(r); encaisserForm.setFieldsValue({ montant: Number(r.reste), moyen: 'ESPECES' }); setMontantRecu(0); setMoyenEnc('ESPECES'); }}
          >
            Encaisser
          </Button>
          <Button
            size="small"
            icon={<WalletOutlined />}
            onClick={() => setTrancheFacture(r)}
          >
            Tranches
          </Button>
        </Space>
      ),
    },
  ];

  const facturesRegleesColumns = [
    { title: 'N° Facture', dataIndex: 'numero', key: 'numero', width: 140 },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: FactureSejour) => `${r.reservation.client.nom} ${r.reservation.client.prenom}`,
    },
    { title: 'Chambre', key: 'chambre', render: (_: unknown, r: FactureSejour) => r.reservation.chambre.numero, width: 80 },
    { title: 'Total regle', dataIndex: 'total', key: 'total', render: (t: number) => <span className="text-green-600 font-medium">{Number(t).toLocaleString()} FCFA</span> },
    {
      title: 'Actions',
      key: 'action',
      width: 140,
      render: (_: unknown, r: FactureSejour) => (
        <Button
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => setTrancheFacture(r)}
        >
          Voir paiements
        </Button>
      ),
    },
  ];

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

  if (caisseLoading || !caisse) return <Skeleton active />;

  return (
    <div id="tour-caisse-hotel-page">
      <div id="tour-caisse-hotel-header" className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold m-0">Caisse Hotel</h2>
          <p className="text-slate-500 text-sm m-0">
            {caisse.nom}
            {session && (
              <span className="ml-3 text-slate-400">
                Ouverte depuis {new Date((session as SessionCaisse).ouvertureAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <Space>
          <Button icon={<HistoryOutlined />} onClick={() => { setHistPage(1); setHistModalOpen(true); }}>
            Historique
          </Button>
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
        </Space>
      </div>

      {!session ? (
        <div className="text-center">
          <Empty description="La caisse est fermee. Ouvrez une session pour commencer." />
          {closedSessionId && (
            <Space className="mt-4">
              <Button
                icon={<PrinterOutlined />}
                onClick={async () => {
                  try { await ticketsApi.imprimerCloture(closedSessionId); message.success('Rapport envoyé'); }
                  catch { message.error('Erreur lors de l\'impression'); }
                }}
              >
                Imprimer rapport de cloture
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={async () => {
                  try { await ticketsApi.apercevoirCloture(closedSessionId); }
                  catch { message.error('Erreur apercu'); }
                }}
              >
                Apercu
              </Button>
            </Space>
          )}
        </div>
      ) : (
        <>
          <Row gutter={16} className="mb-6">
            <Col span={6}>
              <Card size="small">
                <Statistic title="Fond initial" value={Number((session as SessionCaisse).fondInitial)} suffix="FCFA" prefix={<HomeOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="Total encaisse"
                  value={totalEncaisse}
                  suffix="FCFA"
                  styles={{ content: { color: '#3f8600' } }}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Factures impayees" value={facturesImpayees.length} styles={{ content: { color: '#cf1322' } }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Solde en caisse" value={Number((session as SessionCaisse).fondInitial) + totalEncaisse} suffix="FCFA" styles={{ content: { color: '#C9A84C' } }} />
              </Card>
            </Col>
          </Row>

          <Card title="Factures a encaisser" className="mb-4" size="small">
            {facturesImpayees.length === 0 ? (
              <Empty description="Aucune facture en attente de paiement" />
            ) : (
              <Table
                dataSource={facturesImpayees}
                columns={facturesColumns}
                rowKey="id"
                size="small"
                pagination={false}
              />
            )}
          </Card>

          {facturesReglees.length > 0 && (
            <Collapse
              className="mb-4"
              ghost
              items={[{
                key: 'reglees',
                label: <span className="font-medium text-sm">Factures reglees ({facturesReglees.length})</span>,
                children: (
                  <Table
                    dataSource={facturesReglees}
                    columns={facturesRegleesColumns}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 5 }}
                  />
                ),
              }]}
            />
          )}

          <Card title="Paiements de la session" size="small" className="mb-4">
            <Table
              dataSource={(session as SessionCaisse).paiements || []}
              columns={paiementsColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </Card>

          <Card
            title="Mouvements de caisse"
            size="small"
            extra={
              <Button type="primary" size="small" icon={<WalletOutlined />} onClick={() => setMouvementModalOpen(true)}>
                Nouveau mouvement
              </Button>
            }
          >
            {(!mouvements || mouvements.length === 0) ? (
              <Empty description="Aucun mouvement pour cette session" />
            ) : (
              <Table
                dataSource={mouvements}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: 'Type', dataIndex: 'type', key: 'type', width: 120,
                    render: (t: string) => {
                      const colors: Record<string, string> = { APPORT: 'green', RETRAIT: 'orange', DEPENSE: 'red' };
                      return <Tag color={colors[t] || 'default'}>{t}</Tag>;
                    },
                  },
                  { title: 'Montant', dataIndex: 'montant', key: 'montant', render: (m: number) => `${Number(m).toLocaleString()} FCFA` },
                  { title: 'Motif', dataIndex: 'motif', key: 'motif' },
                  { title: 'Heure', dataIndex: 'createdAt', key: 'heure', width: 80, render: (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) },
                ]}
              />
            )}
          </Card>
        </>
      )}

      {/* Modal ouverture */}
      <Modal
        title="Ouvrir la caisse Hotel"
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
        title="Cloturer la caisse Hotel"
        open={fermerModalOpen}
        onCancel={() => { setFermerModalOpen(false); fermerForm.resetFields(); }}
        onOk={() => fermerForm.submit()}
        confirmLoading={fermerMutation.isPending}
        okText="Cloturer"
      >
        <Descriptions size="small" className="mb-4">
          <Descriptions.Item label="Total theorique">
            {(Number((session as SessionCaisse)?.fondInitial || 0) + totalEncaisse).toLocaleString()} FCFA
          </Descriptions.Item>
        </Descriptions>
        <Form form={fermerForm} layout="vertical" onFinish={(v) => fermerMutation.mutate({ totalReel: v.totalReel, notes: v.notes, motifEcart: v.motifEcart })}>
          <Form.Item name="totalReel" label="Montant reel en caisse (FCFA)" rules={[{ required: true, message: 'Requis' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.totalReel !== cur.totalReel}>
            {({ getFieldValue }) => {
              const totalTheorique = Number((session as SessionCaisse)?.fondInitial || 0) + totalEncaisse;
              const ecart = (getFieldValue('totalReel') ?? 0) - totalTheorique;
              return Math.abs(ecart) > 0 ? (
                <Form.Item
                  name="motifEcart"
                  label={`Motif de l'ecart (${ecart > 0 ? '+' : ''}${ecart.toLocaleString()} FCFA)`}
                  rules={[{ required: true, message: 'Justifiez l\'ecart constate' }]}
                >
                  <Input.TextArea rows={2} placeholder="Expliquez la difference entre le montant theorique et le montant reel" />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>
          <Form.Item name="notes" label="Notes (optionnel)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal encaissement facture */}
      <Modal
        title={`Encaisser facture ${encaisserModal?.numero}`}
        open={!!encaisserModal}
        onCancel={() => { setEncaisserModal(null); encaisserForm.resetFields(); setMontantRecu(0); setMoyenEnc('ESPECES'); }}
        onOk={() => encaisserForm.submit()}
        confirmLoading={encaisserMutation.isPending}
        okText="Encaisser"
      >
        {encaisserModal && (
          <Descriptions size="small" className="mb-4" column={2}>
            <Descriptions.Item label="Client">{encaisserModal.reservation.client.nom} {encaisserModal.reservation.client.prenom}</Descriptions.Item>
            <Descriptions.Item label="Chambre">{encaisserModal.reservation.chambre.numero}</Descriptions.Item>
            <Descriptions.Item label="Total">{Number(encaisserModal.total).toLocaleString()} FCFA</Descriptions.Item>
            <Descriptions.Item label="Reste">{Number(encaisserModal.reste).toLocaleString()} FCFA</Descriptions.Item>
          </Descriptions>
        )}
        <Form
          form={encaisserForm}
          layout="vertical"
          onFinish={(v) => {
            if (!encaisserModal) return;
            encaisserMutation.mutate({ factureId: encaisserModal.id, montant: v.montant, moyen: v.moyen });
          }}
        >
          <Form.Item name="montant" label="Montant a encaisser (FCFA)" rules={[{ required: true }, { type: 'number', min: 1, message: 'Le montant doit etre superieur a 0' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="moyen" label="Moyen de paiement" initialValue="ESPECES" rules={[{ required: true }]}>
            <Select options={MOYEN_OPTIONS} onChange={(v) => { setMoyenEnc(v); setMontantRecu(0); }} />
          </Form.Item>
          {moyenEnc === 'ESPECES' && (
            <>
              <Form.Item label="Recu du client (FCFA)">
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  value={montantRecu}
                  onChange={(v) => setMontantRecu(Number(v) || 0)}
                />
              </Form.Item>
              {montantRecu > 0 && encaisserModal && (() => {
                const rendu = montantRecu - Number(encaisserModal.reste);
                return rendu >= 0
                  ? <div className="text-green-600 font-semibold text-base mb-2">Rendu : {rendu.toLocaleString()} FCFA</div>
                  : <div className="text-red-500 font-semibold text-base mb-2">Insuffisant : {Math.abs(rendu).toLocaleString()} FCFA</div>;
              })()}
            </>
          )}
        </Form>
      </Modal>

      {/* Modal mouvement de caisse */}
      <Modal
        title="Nouveau mouvement de caisse"
        open={mouvementModalOpen}
        onCancel={() => { setMouvementModalOpen(false); mouvementForm.resetFields(); }}
        onOk={() => mouvementForm.submit()}
        confirmLoading={mouvementMutation.isPending}
        okText="Enregistrer"
      >
        <Form form={mouvementForm} layout="vertical" onFinish={(v) => mouvementMutation.mutate(v)}>
          <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Selectionnez le type' }]}>
            <Select
              options={[
                { value: 'APPORT', label: 'Apport (entree de fonds)' },
                ...(hasPermission('caisse', 'sortie') ? [
                  { value: 'RETRAIT', label: 'Retrait' },
                  { value: 'DEPENSE', label: 'Depense cash' },
                ] : []),
              ]}
            />
          </Form.Item>
          <Form.Item name="montant" label="Montant (FCFA)" rules={[{ required: true, message: 'Montant requis' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="motif" label="Motif" rules={[{ required: true, message: 'Motif requis' }]}>
            <Input.TextArea rows={2} placeholder="Raison du mouvement" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal tranches de paiement */}
      <Modal
        title={`Tranches de paiement — Facture ${trancheFacture?.numero || ''}`}
        open={!!trancheFacture}
        onCancel={() => { setTrancheFacture(null); trancheForm.resetFields(); }}
        footer={null}
        width={600}
      >
        {trancheFacture && (
          <>
            <Descriptions size="small" className="mb-4" column={2}>
              <Descriptions.Item label="Client">{trancheFacture.reservation.client.nom} {trancheFacture.reservation.client.prenom}</Descriptions.Item>
              <Descriptions.Item label="Chambre">{trancheFacture.reservation.chambre.numero}</Descriptions.Item>
              <Descriptions.Item label="Total">{Number(trancheFacture.total).toLocaleString()} FCFA</Descriptions.Item>
              <Descriptions.Item label="Deja paye">
                <span className="text-green-600 font-medium">{Number(trancheData?.montantPaye ?? trancheFacture.montantPaye).toLocaleString()} FCFA</span>
              </Descriptions.Item>
              <Descriptions.Item label="Reste">
                <span className="text-orange-600 font-medium">{Number(trancheData?.reste ?? trancheFacture.reste).toLocaleString()} FCFA</span>
              </Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={(trancheData?.payee ?? trancheFacture.payee) ? 'green' : 'orange'}>
                  {(trancheData?.payee ?? trancheFacture.payee) ? 'Soldee' : 'En cours'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <h4 className="text-sm font-medium mb-2">Historique des paiements</h4>
            {trancheData?.tranches?.length > 0 ? (
              <Table
                dataSource={trancheData.tranches}
                rowKey="id"
                size="small"
                pagination={false}
                className="mb-4"
                columns={[
                  { title: 'Ref', dataIndex: 'reference', key: 'ref', width: 130 },
                  { title: 'Montant', dataIndex: 'montant', key: 'montant', render: (m: number) => `${Number(m).toLocaleString()} FCFA` },
                  { title: 'Moyen', dataIndex: 'moyen', key: 'moyen', render: (m: string) => <Tag>{m}</Tag> },
                  { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
                  { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (n: string | null) => n || '—' },
                ]}
              />
            ) : (
              <Empty description="Aucun paiement enregistre pour l'instant" image={Empty.PRESENTED_IMAGE_SIMPLE} className="mb-4" />
            )}

            {!(trancheData?.payee ?? trancheFacture.payee) && Number(trancheData?.reste ?? trancheFacture.reste) > 0 && (
              <>
                <h4 className="text-sm font-medium mb-2">Ajouter une tranche</h4>
                <Form form={trancheForm} layout="inline" onFinish={(v) => trancheMutation.mutate(v)} className="gap-2">
                  <Form.Item name="montant" rules={[{ required: true, message: 'Requis' }]}>
                    <InputNumber min={1} placeholder="Montant" style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item name="moyen" initialValue="ESPECES" rules={[{ required: true }]}>
                    <Select options={MOYEN_OPTIONS} style={{ width: 140 }} />
                  </Form.Item>
                  <Form.Item name="notes">
                    <Input placeholder="Notes (optionnel)" style={{ width: 140 }} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={trancheMutation.isPending}>
                      Payer
                    </Button>
                  </Form.Item>
                </Form>
              </>
            )}
          </>
        )}
      </Modal>
      <Modal
        title="Historique des sessions — Caisse Hotel"
        open={histModalOpen}
        onCancel={() => setHistModalOpen(false)}
        footer={null}
        width={860}
      >
        <Table
          dataSource={histData?.data || []}
          rowKey="id"
          loading={histLoading}
          size="small"
          pagination={{
            current: histPage,
            pageSize: 20,
            total: histData?.total || 0,
            onChange: (p) => setHistPage(p),
            showTotal: (t) => `${t} sessions`,
          }}
          columns={[
            {
              title: 'Ouverture',
              dataIndex: 'ouvertureAt',
              key: 'ouv',
              width: 150,
              render: (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            },
            {
              title: 'Fermeture',
              dataIndex: 'fermetureAt',
              key: 'ferm',
              width: 150,
              render: (d: string | null) => d
                ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : <Tag color="green">En cours</Tag>,
            },
            {
              title: 'Caissier',
              key: 'user',
              width: 140,
              render: (_: unknown, r: SessionCaisse) => r.user ? `${r.user.nom} ${r.user.prenom}` : '—',
            },
            {
              title: 'Statut',
              dataIndex: 'statut',
              key: 'statut',
              width: 90,
              render: (s: string) => <Tag color={s === 'OUVERTE' ? 'green' : 'default'}>{s}</Tag>,
            },
            {
              title: 'Fond initial',
              dataIndex: 'fondInitial',
              key: 'fond',
              width: 120,
              render: (v: number) => `${Number(v).toLocaleString()} FCFA`,
            },
            {
              title: 'Total theorique',
              dataIndex: 'totalTheorique',
              key: 'theo',
              width: 130,
              render: (v: number) => `${Number(v).toLocaleString()} FCFA`,
            },
            {
              title: 'Ecart',
              dataIndex: 'ecart',
              key: 'ecart',
              width: 110,
              render: (v: number) => (
                <span style={{ color: Number(v) === 0 ? undefined : Number(v) > 0 ? '#52c41a' : '#ff4d4f' }}>
                  {Number(v) > 0 ? '+' : ''}{Number(v).toLocaleString()} FCFA
                </span>
              ),
            },
            {
              title: 'Paiements',
              key: 'nb',
              width: 90,
              render: (_: unknown, r: SessionCaisse) => r._count?.paiements ?? '—',
            },
          ]}
        />
      </Modal>
    </div>
  );
}
