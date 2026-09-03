import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Row, Col, Statistic, Tabs, Table, Button, Modal, Form,
  Input, InputNumber, Select, DatePicker, Popconfirm, Tag, App, Progress,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined,
  BankOutlined, DollarOutlined, BarChartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { comptabiliteApi } from '../../api/comptabilite';
import type { Depense, MoisHistorique } from '../../api/comptabilite';
import { getErrorMessage } from '../../api/errors';

const CENTRES = [
  { value: 'HOTEL', label: 'Hotel', color: 'gold' },
  { value: 'RESTAURANT', label: 'Restaurant', color: 'orange' },
  { value: 'PISCINE', label: 'Piscine', color: 'cyan' },
  { value: 'SALLE_FETE', label: 'Salle des fetes', color: 'purple' },
  { value: 'GENERAL', label: 'General', color: 'default' },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function fmtFull(n: number) {
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

// Graphique en barres SVG simple pour l'historique mensuel
function BarChart({ data }: { data: MoisHistorique[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.recettes, d.depenses)), 1);
  const W = 700, H = 160, PAD = 36, barW = 14, gap = 8;
  const slotW = (W - PAD * 2) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', height: 'auto' }}>
      {/* Grille */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD + (1 - t) * H;
        return (
          <g key={t}>
            <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="#f0f0f0" strokeWidth={1} />
            <text x={PAD - 4} y={y + 4} fontSize={9} fill="#aaa" textAnchor="end">{fmt(maxVal * t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = PAD + i * slotW + slotW / 2;
        const hRec = (d.recettes / maxVal) * H;
        const hDep = (d.depenses / maxVal) * H;
        return (
          <g key={d.label}>
            <rect x={cx - barW - gap / 2} y={PAD + H - hRec} width={barW} height={hRec} fill="#52c41a" rx={2} opacity={0.85}>
              <title>Recettes {d.label}: {fmtFull(d.recettes)}</title>
            </rect>
            <rect x={cx + gap / 2} y={PAD + H - hDep} width={barW} height={hDep} fill="#ff4d4f" rx={2} opacity={0.85}>
              <title>Dépenses {d.label}: {fmtFull(d.depenses)}</title>
            </rect>
            <text x={cx} y={PAD + H + 14} fontSize={8.5} fill="#888" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
      {/* Légende */}
      <rect x={PAD} y={4} width={10} height={8} fill="#52c41a" rx={1} />
      <text x={PAD + 13} y={12} fontSize={9} fill="#555">Recettes</text>
      <rect x={PAD + 65} y={4} width={10} height={8} fill="#ff4d4f" rx={1} />
      <text x={PAD + 78} y={12} fontSize={9} fill="#555">Depenses</text>
    </svg>
  );
}

export default function ComptabilitePage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [mois, setMois] = useState<string | undefined>(undefined);
  const [depenseModal, setDepenseModal] = useState(false);
  const [filtreDepense, setFiltreDepense] = useState<{ dateDebut?: string; dateFin?: string; centre?: string }>({});
  const [filtreRecettes, setFiltreRecettes] = useState<{ dateDebut?: string; dateFin?: string }>({});
  const [form] = Form.useForm();

  const { data: tb, isLoading: tbLoading } = useQuery({
    queryKey: ['compta-tb', mois],
    queryFn: () => comptabiliteApi.getTableauBord(mois),
  });

  const { data: historique } = useQuery({
    queryKey: ['compta-historique'],
    queryFn: comptabiliteApi.getHistoriqueMensuel,
  });

  const { data: tresorerie } = useQuery({
    queryKey: ['compta-tresorerie'],
    queryFn: comptabiliteApi.getTresorerie,
  });

  const { data: depenses, isLoading: depLoading } = useQuery({
    queryKey: ['depenses', filtreDepense],
    queryFn: () => comptabiliteApi.getDepenses(filtreDepense),
  });

  const { data: recettes, isLoading: recLoading } = useQuery({
    queryKey: ['recettes-detail', filtreRecettes],
    queryFn: () => comptabiliteApi.getRecettes(filtreRecettes),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['compta-tb'] });
    qc.invalidateQueries({ queryKey: ['compta-historique'] });
    qc.invalidateQueries({ queryKey: ['compta-tresorerie'] });
    qc.invalidateQueries({ queryKey: ['depenses'] });
    qc.invalidateQueries({ queryKey: ['recettes-detail'] });
  };

  const createMutation = useMutation({
    mutationFn: comptabiliteApi.createDepense,
    onSuccess: () => {
      message.success('Dépense enregistrée');
      setDepenseModal(false);
      form.resetFields();
      invalidate();
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: comptabiliteApi.deleteDepense,
    onSuccess: () => { message.success('Supprimé'); invalidate(); },
  });

  const tb_recettes = tb?.recettes;
  const tb_depenses = tb?.depenses;
  const resultat = tb?.resultat ?? 0;
  const totalRec = tb_recettes?.total ?? 0;
  const totalDep = tb_depenses?.total ?? 0;

  // Calcul parts recettes pour barres de progression
  const recettesRows = [
    { label: 'Hotel', value: tb_recettes?.hotel ?? 0, color: '#C9A84C' },
    { label: 'Restaurant', value: tb_recettes?.restaurant ?? 0, color: '#fa8c16' },
    { label: 'Piscine', value: tb_recettes?.piscine ?? 0, color: '#13c2c2' },
    { label: 'Salle des fetes', value: tb_recettes?.salle ?? 0, color: '#722ed1' },
  ];

  const depensesRows = CENTRES.map((c) => ({
    ...c,
    value: tb_depenses?.[c.value as keyof typeof tb_depenses] as number ?? 0,
  }));

  const depensesColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    { title: 'Libellé', dataIndex: 'libelle', key: 'libelle' },
    {
      title: 'Centre',
      dataIndex: 'centre',
      key: 'centre',
      width: 130,
      render: (c: string) => {
        const found = CENTRES.find((x) => x.value === c);
        return <Tag color={found?.color ?? 'default'}>{found?.label ?? c}</Tag>;
      },
    },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      width: 140,
      render: (m: number) => <span className="font-medium text-red-500">{fmtFull(m)}</span>,
    },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (n: string | null) => n ?? '-' },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: unknown, r: Depense) => (
        <Popconfirm title="Supprimer cette dépense ?" onConfirm={() => deleteMutation.mutate(r.id)}>
          <Button type="link" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const tabs = [
    {
      key: 'vue-ensemble',
      label: <span><BarChartOutlined /> Vue d'ensemble</span>,
      children: (
        <div className="space-y-5">
          {/* Sélecteur de mois */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Période :</span>
            <DatePicker
              picker="month"
              format="MMMM YYYY"
              placeholder="Mois courant"
              onChange={(d) => setMois(d ? d.format('YYYY-MM') : undefined)}
              allowClear
            />
          </div>

          {/* KPIs */}
          <Row gutter={16}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Recettes du mois"
                  value={totalRec}
                  suffix="FCFA"
                  loading={tbLoading}
                  styles={{ content: { color: '#3f8600' } }}
                  prefix={<ArrowUpOutlined />}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Dépenses du mois"
                  value={totalDep}
                  suffix="FCFA"
                  loading={tbLoading}
                  styles={{ content: { color: '#cf1322' } }}
                  prefix={<ArrowDownOutlined />}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Résultat net"
                  value={Math.abs(resultat)}
                  suffix="FCFA"
                  loading={tbLoading}
                  styles={{ content: { color: resultat >= 0 ? '#3f8600' : '#cf1322' } }}
                  prefix={resultat >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  formatter={(v) => `${resultat < 0 ? '-' : '+'}${Number(v).toLocaleString('fr-FR')}`}
                />
              </Card>
            </Col>
          </Row>

          {/* Répartition recettes + dépenses */}
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Recettes par module" size="small">
                <div className="space-y-3">
                  {recettesRows.map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{r.label}</span>
                        <span className="font-medium">{fmtFull(r.value)}</span>
                      </div>
                      <Progress
                        percent={totalRec > 0 ? Math.round((r.value / totalRec) * 100) : 0}
                        strokeColor={r.color}
                        size="small"
                        showInfo={false}
                      />
                    </div>
                  ))}
                  {totalRec === 0 && <p className="text-slate-400 text-sm text-center py-2">Aucune recette encaissée ce mois</p>}
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Dépenses par centre" size="small">
                <div className="space-y-3">
                  {depensesRows.filter((d) => d.value > 0).map((d) => (
                    <div key={d.value}>
                      <div className="flex justify-between text-sm mb-1">
                        <Tag color={d.color} className="m-0">{d.label}</Tag>
                        <span className="font-medium text-red-500">{fmtFull(d.value)}</span>
                      </div>
                      <Progress
                        percent={totalDep > 0 ? Math.round((d.value / totalDep) * 100) : 0}
                        strokeColor="#ff4d4f"
                        size="small"
                        showInfo={false}
                      />
                    </div>
                  ))}
                  {totalDep === 0 && <p className="text-slate-400 text-sm text-center py-2">Aucune dépense saisie ce mois</p>}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Graphique 12 mois */}
          <Card title="Évolution sur 12 mois" size="small">
            {historique && historique.length > 0
              ? <BarChart data={historique} />
              : <p className="text-slate-400 text-sm text-center py-4">Données insuffisantes</p>}
          </Card>
        </div>
      ),
    },
    {
      key: 'tresorerie',
      label: <span><BankOutlined /> Trésorerie</span>,
      children: (
        <div className="space-y-4">
          <Card size="small">
            <Statistic
              title="Trésorerie totale (caisses ouvertes)"
              value={tresorerie?.total ?? 0}
              suffix="FCFA"
              prefix={<DollarOutlined />}
              styles={{ content: { color: '#C9A84C', fontSize: 24 } }}
              formatter={(v) => Number(v).toLocaleString('fr-FR')}
            />
          </Card>

          <Row gutter={16}>
            {(tresorerie?.caisses ?? []).map((c) => (
              <Col span={12} key={c.nom}>
                <Card size="small" title={c.nom}>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fond initial</span>
                      <span>{fmtFull(c.fondInitial)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Encaissé</span>
                      <span className="text-green-600 font-medium">+{fmtFull(c.totalEncaisse)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="font-medium">Total en caisse</span>
                      <span className="font-semibold" style={{ color: '#C9A84C' }}>{fmtFull(c.total)}</span>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
            {(!tresorerie?.caisses || tresorerie.caisses.length === 0) && (
              <Col span={24}>
                <p className="text-slate-400 text-sm text-center py-4">Aucune caisse ouverte en ce moment</p>
              </Col>
            )}
          </Row>
        </div>
      ),
    },
    {
      key: 'recettes',
      label: <span><ArrowUpOutlined /> Recettes</span>,
      children: (() => {
        interface RecItem { key: string; source: string; montant: number; detail: string; moyen: string; date: string; }
        const items: RecItem[] = [];
        if (recettes) {
          (recettes.hotel || []).forEach((p: any) => items.push({
            key: p.id,
            source: 'Hotel',
            montant: Number(p.montant),
            detail: p.factureSejour?.reservation
              ? `${p.factureSejour.reservation.client?.nom || ''} — Ch. ${p.factureSejour.reservation.chambre?.numero || ''}`
              : p.reference,
            moyen: p.moyen,
            date: p.createdAt,
          }));
          (recettes.restaurant || []).forEach((p: any) => items.push({
            key: p.id,
            source: 'Restaurant',
            montant: Number(p.montant),
            detail: p.commandeTable?.numero || p.reference,
            moyen: p.moyen,
            date: p.createdAt,
          }));
          (recettes.piscine || []).forEach((t: any) => items.push({
            key: t.id,
            source: 'Piscine',
            montant: Number(t.prix),
            detail: t.client ? `${t.client.nom} ${t.client.prenom || ''}` : 'Anonyme',
            moyen: '-',
            date: t.createdAt,
          }));
          (recettes.salle || []).forEach((r: any) => items.push({
            key: r.id,
            source: 'Salle',
            montant: Number(r.montant),
            detail: `${r.client?.nom || ''} — ${r.type?.nom || ''}`,
            moyen: '-',
            date: r.dateEvent,
          }));
        }
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totalRecettes = items.reduce((s, r) => s + r.montant, 0);

        return (
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <DatePicker.RangePicker
                onChange={(dates) => {
                  if (dates) {
                    setFiltreRecettes({ dateDebut: dates[0]?.format('YYYY-MM-DD'), dateFin: dates[1]?.format('YYYY-MM-DD') });
                  } else {
                    setFiltreRecettes({});
                  }
                }}
              />
            </div>
            <Table
              dataSource={items}
              rowKey="key"
              loading={recLoading}
              size="small"
              pagination={{ pageSize: 20, showTotal: (t) => `${t} recette(s)` }}
              columns={[
                { title: 'Date', dataIndex: 'date', key: 'date', width: 100, render: (d: string) => new Date(d).toLocaleDateString('fr-FR') },
                { title: 'Source', dataIndex: 'source', key: 'source', width: 110, render: (s: string) => {
                  const colors: Record<string, string> = { Hotel: 'gold', Restaurant: 'orange', Piscine: 'cyan', Salle: 'purple' };
                  return <Tag color={colors[s]}>{s}</Tag>;
                }},
                { title: 'Détail', dataIndex: 'detail', key: 'detail' },
                { title: 'Moyen', dataIndex: 'moyen', key: 'moyen', width: 120, render: (m: string) => m !== '-' ? <Tag>{m}</Tag> : '-' },
                { title: 'Montant', dataIndex: 'montant', key: 'montant', width: 140, render: (m: number) => <span className="font-medium text-green-600">{fmtFull(m)}</span> },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}><span className="font-medium">Total</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={4}><span className="font-semibold text-green-600">{fmtFull(totalRecettes)}</span></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </div>
        );
      })(),
    },
    {
      key: 'depenses',
      label: <span><ArrowDownOutlined /> Dépenses</span>,
      children: (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <DatePicker.RangePicker
              onChange={(dates) => {
                if (dates) {
                  setFiltreDepense((prev) => ({
                    ...prev,
                    dateDebut: dates[0]?.format('YYYY-MM-DD'),
                    dateFin: dates[1]?.format('YYYY-MM-DD'),
                  }));
                } else {
                  setFiltreDepense((prev) => ({ ...prev, dateDebut: undefined, dateFin: undefined }));
                }
              }}
            />
            <Select
              placeholder="Tous les centres"
              allowClear
              style={{ width: 180 }}
              options={[{ value: '', label: 'Tous les centres' }, ...CENTRES.map((c) => ({ value: c.value, label: c.label }))]}
              onChange={(v) => setFiltreDepense((prev) => ({ ...prev, centre: v || undefined }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDepenseModal(true)}>
              Nouvelle dépense
            </Button>
          </div>

          <Table
            dataSource={depenses ?? []}
            columns={depensesColumns}
            rowKey="id"
            loading={depLoading}
            size="small"
            pagination={{ pageSize: 15, showTotal: (t) => `${t} dépense(s)` }}
            summary={(rows) => {
              const total = rows.reduce((s, r) => s + Number(r.montant), 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <span className="font-medium">Total</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <span className="font-semibold text-red-500">{fmtFull(total)}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} colSpan={2} />
                </Table.Summary.Row>
              );
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div id="tour-comptabilite-page">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold m-0">Comptabilité</h2>
          <p className="text-slate-400 text-sm m-0">Gestion financiere : recettes reelles par paiement, saisie des depenses, tresorerie en temps reel — Les KPIs agrégés sont dans Rapports</p>
        </div>
      </div>

      <Tabs id="tour-comptabilite-tabs" items={tabs} />

      {/* Modal nouvelle dépense */}
      <Modal
        title="Enregistrer une dépense"
        open={depenseModal}
        onCancel={() => { setDepenseModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Enregistrer"
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="libelle" label="Libellé" rules={[{ required: true, message: 'Requis' }]}>
            <Input placeholder="Ex: Achat boissons bar, Salaire agent..." />
          </Form.Item>
          <Form.Item name="montant" label="Montant (FCFA)" rules={[{ required: true, message: 'Requis' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="centre" label="Centre de coût" initialValue="GENERAL">
                <Select options={CENTRES.map((c) => ({ value: c.value, label: c.label }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label="Date" getValueProps={(v) => ({ value: v ? dayjs(v) : dayjs() })}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes (optionnel)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
