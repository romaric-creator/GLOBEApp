import { Spin, Alert } from 'antd';
import {
  HomeOutlined, CoffeeOutlined, WarningOutlined,
  LogoutOutlined, ReloadOutlined, RiseOutlined, FallOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hotelApi } from '../api/hotel';
import { rapportsApi } from '../api/rapports';
import type { CA7JoursItem } from '../api/rapports';
import { restaurantApi } from '../api/restaurant';
import { caisseApi } from '../api/caisse';
import { produitsApi } from '../api/produits';
import { useAuthStore } from '../store/auth';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

// --- Périodes disponibles ---
const PERIODES = [
  { key: 'jour', label: "Auj." },
  { key: 'semaine', label: "7 jours" },
  { key: 'mois', label: "Ce mois" },
  { key: 'annee', label: "Année" },
] as const;
type PeriodeKey = typeof PERIODES[number]['key'];

function getPeriodeDates(p: PeriodeKey): { debut: string; fin: string; label: string; debutComp: string; finComp: string } {
  const today = dayjs();
  switch (p) {
    case 'jour':
      return {
        debut: today.format('YYYY-MM-DD'),
        fin: today.format('YYYY-MM-DD'),
        label: "aujourd'hui",
        debutComp: today.subtract(1, 'day').format('YYYY-MM-DD'),
        finComp: today.subtract(1, 'day').format('YYYY-MM-DD'),
      };
    case 'semaine':
      return {
        debut: today.subtract(6, 'day').format('YYYY-MM-DD'),
        fin: today.format('YYYY-MM-DD'),
        label: "7 derniers jours",
        debutComp: today.subtract(13, 'day').format('YYYY-MM-DD'),
        finComp: today.subtract(7, 'day').format('YYYY-MM-DD'),
      };
    case 'mois':
      return {
        debut: today.startOf('month').format('YYYY-MM-DD'),
        fin: today.format('YYYY-MM-DD'),
        label: today.format('MMMM YYYY'),
        debutComp: today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
        finComp: today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
      };
    case 'annee':
      return {
        debut: today.startOf('year').format('YYYY-MM-DD'),
        fin: today.format('YYYY-MM-DD'),
        label: today.format('YYYY'),
        debutComp: today.subtract(1, 'year').startOf('year').format('YYYY-MM-DD'),
        finComp: today.subtract(1, 'year').endOf('year').format('YYYY-MM-DD'),
      };
  }
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function CAChart({ data, labelFmt }: { data: CA7JoursItem[]; labelFmt: (d: string) => string }) {
  if (!data || data.length < 2) return null;
  const W = 320; const H = 80;
  const PL = 36; const PR = 8; const PT = 8; const PB = 18;
  const max = Math.max(...data.map((d) => d.total), 1);
  const xStep = (W - PL - PR) / (data.length - 1);
  const toX = (i: number) => PL + i * xStep;
  const toY = (v: number) => PT + (H - PT - PB) * (1 - v / max);
  const pts = data.map((d, i) => `${toX(i)},${toY(d.total)}`).join(' ');
  const fmtY = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v);
  // Affiche seulement un label sur N pour éviter la surcharge
  const step = data.length > 14 ? Math.ceil(data.length / 7) : 1;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {[0, 0.5, 1].map((r) => {
        const y = toY(max * r);
        return (
          <g key={r}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f3f4f6" strokeWidth={1} />
            <text x={PL - 4} y={y + 3} textAnchor="end" fontSize={7} fill="#9ca3af">{fmtY(max * r)}</text>
          </g>
        );
      })}
      {data.map((d, i) => i % step === 0 && (
        <text key={d.date} x={toX(i)} y={H - 2} textAnchor="middle" fontSize={7} fill="#9ca3af">
          {labelFmt(d.date)}
        </text>
      ))}
      <polyline points={pts} fill="none" stroke="#C9A84C" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={d.date} cx={toX(i)} cy={toY(d.total)} r={2.5} fill="#C9A84C" />
      ))}
    </svg>
  );
}

function Trend({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color: up ? '#16a34a' : '#dc2626',
      display: 'inline-flex', alignItems: 'center', gap: 2,
    }}>
      {up ? <RiseOutlined /> : <FallOutlined />}{up ? '+' : ''}{pct}% vs {label}
    </span>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      padding: '16px 18px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</p>;
}

function PeriodeTabs({ value, onChange }: { value: PeriodeKey; onChange: (k: PeriodeKey) => void }) {
  return (
    <div style={{
      display: 'flex',
      background: '#f3f4f6',
      borderRadius: 8,
      padding: 3,
      gap: 2,
    }}>
      {PERIODES.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          style={{
            flex: 1,
            height: 28,
            border: 'none',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            background: value === p.key ? '#fff' : 'transparent',
            color: value === p.key ? '#111827' : '#6b7280',
            boxShadow: value === p.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [periode, setPeriode] = useState<PeriodeKey>('mois');
  const periodeInfo = getPeriodeDates(periode);
  const compLabel = periode === 'jour' ? 'hier' : periode === 'semaine' ? '7j préc.' : periode === 'mois' ? 'mois préc.' : "l'an dernier";

  const { data: hotelStats, isLoading: loadHotel } = useQuery({ queryKey: ['hotel-stats'], queryFn: hotelApi.getStats, refetchInterval: 30_000 });
  const { data: ca, isLoading: loadCa } = useQuery({
    queryKey: ['ca', periodeInfo.debut, periodeInfo.fin],
    queryFn: () => rapportsApi.getChiffreAffaires(periodeInfo.debut, periodeInfo.fin),
    refetchInterval: 60_000,
  });
  const { data: caComp } = useQuery({
    queryKey: ['ca-comp', periodeInfo.debutComp, periodeInfo.finComp],
    queryFn: () => rapportsApi.getChiffreAffaires(periodeInfo.debutComp, periodeInfo.finComp),
  });
  const annee = dayjs().year();
  const chartQuery = useQuery({
    queryKey: ['ca-chart', periode, periodeInfo.debut, periodeInfo.fin],
    queryFn: () => {
      if (periode === 'annee') return rapportsApi.getCAParMois(annee);
      if (periode === 'jour') return rapportsApi.getCAParJour(periodeInfo.debut, periodeInfo.fin);
      if (periode === 'semaine') return rapportsApi.getCA7Jours();
      return rapportsApi.getCAParJour(periodeInfo.debut, periodeInfo.fin);
    },
    refetchInterval: 120_000,
  });
  const { data: restoStats } = useQuery({ queryKey: ['resto-stats'], queryFn: restaurantApi.getStats, refetchInterval: 30_000 });
  const { data: caisses } = useQuery({ queryKey: ['caisses'], queryFn: caisseApi.getCaisses, refetchInterval: 30_000 });
  const { data: produits } = useQuery({ queryKey: ['produits'], queryFn: produitsApi.findAll, refetchInterval: 120_000 });

  const loading = loadHotel || loadCa;
  const alertesProduits = produits?.filter((p) => p.actif && p.stockActuel <= p.seuilAlerte) ?? [];
  const hotelOuverte = caisses?.find((c) => c.type === 'HOTEL')?.sessions?.some((s) => s.statut === 'OUVERTE');
  const restoOuverte = caisses?.find((c) => c.type === 'RESTAURANT_BAR')?.sessions?.some((s) => s.statut === 'OUVERTE');
  const taux = hotelStats?.tauxOccupation ?? 0;
  const lastUpdated = dayjs().format('HH:mm');

  return (
    <div style={{ background: '#f9fafb', minHeight: '100dvh', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 18px',
        paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="GLOBE" style={{ height: 32, width: 'auto', borderRadius: 6 }} />
          <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>{user?.prenom} {user?.nom}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#d1d5db' }}>màj {lastUpdated}</span>
          <button
            onClick={() => qc.invalidateQueries()}
            style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 34, height: 34, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
          >
            <ReloadOutlined />
          </button>
          <button
            onClick={logout}
            style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 34, height: 34, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
          >
            <LogoutOutlined />
          </button>
        </div>
      </div>

      <Spin spinning={loading}>
        <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Date + période */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>
              {dayjs().format('dddd D MMMM YYYY')}
            </p>
          </div>

          {/* Sélecteur de période */}
          <PeriodeTabs value={periode} onChange={setPeriode} />

          {/* CA principal */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Label>Chiffre d'affaires — {periodeInfo.label}</Label>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 30, fontWeight: 700, color: '#111827', letterSpacing: -1, lineHeight: 1 }}>
              {(ca?.total ?? 0).toLocaleString()}
              <span style={{ fontSize: 14, fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>FCFA</span>
            </p>
            <div style={{ marginTop: 6 }}>
              <Trend current={ca?.total ?? 0} previous={caComp?.total ?? 0} label={compLabel} />
            </div>
            <div style={{ height: 1, background: '#f3f4f6', margin: '14px 0 12px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Hôtel', value: ca?.hotel ?? 0 },
                { label: 'Restaurant', value: ca?.restaurant ?? 0 },
                { label: 'Piscine', value: ca?.piscine ?? 0 },
                { label: 'Salle de fête', value: ca?.salle_fete ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: '#f9fafb',
                  borderRadius: 8,
                  padding: '10px 12px',
                  border: '1px solid #f3f4f6',
                }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{fmt(value)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9ca3af' }}>{label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Graphique évolution — masqué pour vue journalière (1 seul point) */}
          {periode !== 'jour' && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Label>
                  {periode === 'annee' ? `Évolution mensuelle ${annee}` :
                   periode === 'semaine' ? "7 derniers jours" :
                   `Évolution — ${periodeInfo.label}`}
                </Label>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>
                  {periode === 'annee'
                    ? `Jan – ${dayjs().format('MMM')} ${annee}`
                    : `${dayjs(periodeInfo.debut).format('DD/MM')} – ${dayjs(periodeInfo.fin).format('DD/MM')}`}
                </span>
              </div>
              {chartQuery.isLoading && (
                <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spin size="small" />
                </div>
              )}
              {chartQuery.isError && (
                <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
                  Impossible de charger le graphique
                </p>
              )}
              {!chartQuery.isLoading && !chartQuery.isError && chartQuery.data && chartQuery.data.length > 1 && (
                <>
                  <CAChart
                    data={chartQuery.data}
                    labelFmt={(d) => periode === 'annee' ? dayjs(d).format('MMM') : dayjs(d).format('DD/MM')}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: '#C9A84C' }} />
                    <span style={{ fontSize: 10, color: '#6b7280' }}>
                      CA / {periode === 'annee' ? 'mois' : 'jour'}
                    </span>
                    <div style={{ marginLeft: 'auto' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>
                        {fmt(chartQuery.data.reduce((s, d) => s + d.total, 0))} FCFA
                      </span>
                    </div>
                  </div>
                </>
              )}
              {!chartQuery.isLoading && !chartQuery.isError && (!chartQuery.data || chartQuery.data.length <= 1) && (
                <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
                  Pas encore assez de données sur cette période
                </p>
              )}
            </Card>
          )}

          {/* Répartition CA */}
          {ca && ca.total > 0 && (
            <Card>
              <Label>Répartition — {periodeInfo.label}</Label>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Hôtel', value: ca.hotel },
                  { label: 'Restaurant', value: ca.restaurant },
                  { label: 'Piscine', value: ca.piscine },
                  { label: 'Salle de fête', value: ca.salle_fete },
                ].map(({ label, value }) => {
                  const pct = ca.total > 0 ? Math.round((value / ca.total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#374151' }}>{label}</span>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{value.toLocaleString()} F &middot; {pct}%</span>
                      </div>
                      <div style={{ height: 4, background: '#f3f4f6', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#C9A84C', borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Occupation hôtel */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Label><HomeOutlined style={{ marginRight: 4 }} />Occupation hôtel</Label>
                <p style={{ margin: '3px 0 0', fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: -0.5 }}>{taux}%</p>
              </div>
              <div style={{
                width: 48, height: 48,
                borderRadius: '50%',
                background: `conic-gradient(#C9A84C ${taux * 3.6}deg, #f3f4f6 0)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#374151' }}>{taux}%</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginTop: 12 }}>
              {[
                { label: 'Occupées', count: hotelStats?.occupees ?? 0, color: '#16a34a' },
                { label: 'Libres', count: hotelStats?.disponibles ?? 0, color: '#374151' },
                { label: 'Réservées', count: hotelStats?.reservees ?? 0, color: '#d97706' },
                { label: 'Maint.', count: hotelStats?.maintenance ?? 0, color: '#dc2626' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: '1px solid #f3f4f6' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color }}>{count}</p>
                  <p style={{ margin: 0, fontSize: 9, color: '#9ca3af', lineHeight: 1.3 }}>{label}</p>
                </div>
              ))}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#9ca3af' }}>
              {hotelStats?.reservationsEnCours ?? 0} séjours en cours · {hotelStats?.reservationsAVenir ?? 0} à venir
            </p>
          </Card>

          {/* Restaurant */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Label><CoffeeOutlined style={{ marginRight: 4 }} />Restaurant — aujourd'hui</Label>
                <p style={{ margin: '3px 0 0', fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: -0.5 }}>
                  {(restoStats?.caJour ?? 0).toLocaleString()}
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>FCFA</span>
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 0, marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
              <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #f3f4f6' }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{restoStats?.commandesAujourdHui ?? 0}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9ca3af' }}>commandes</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #f3f4f6' }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#d97706' }}>{restoStats?.commandesEnPreparation ?? 0}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9ca3af' }}>en prép.</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                  {restoStats && restoStats.commandesAujourdHui > 0
                    ? fmt(Math.round(restoStats.caJour / restoStats.commandesAujourdHui))
                    : 0}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9ca3af' }}>ticket moy.</p>
              </div>
            </div>
          </Card>

          {/* Caisses */}
          <Card>
            <Label>État des caisses</Label>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {[
                { label: 'Hôtel', open: hotelOuverte },
                { label: 'Restaurant', open: restoOuverte },
              ].map(({ label, open }) => (
                <div key={label} style={{
                  flex: 1,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#fafafa',
                }}>
                  {open
                    ? <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                    : <CloseCircleOutlined style={{ color: '#d1d5db', fontSize: 16 }} />}
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 10, color: open ? '#16a34a' : '#9ca3af' }}>{open ? 'Ouverte' : 'Fermée'}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Alertes stock */}
          {alertesProduits.length > 0 && (
            <div style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}>
              <div style={{
                background: '#fffbeb',
                borderBottom: '1px solid #e5e7eb',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <WarningOutlined style={{ color: '#d97706', fontSize: 14 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                  {alertesProduits.length} produit{alertesProduits.length > 1 ? 's' : ''} en alerte de stock
                </span>
              </div>
              <div style={{ padding: '4px 0' }}>
                {alertesProduits.slice(0, 5).map((p, i) => {
                  const pct = p.seuilAlerte > 0 ? Math.min(100, Math.round((p.stockActuel / p.seuilAlerte) * 100)) : 0;
                  return (
                    <div key={p.nom} style={{
                      padding: '10px 14px',
                      borderBottom: i < Math.min(alertesProduits.length, 5) - 1 ? '1px solid #f9fafb' : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{p.nom}</span>
                        <span style={{ fontSize: 12, color: p.stockActuel === 0 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                          {p.stockActuel} / {p.seuilAlerte} {p.unite}
                        </span>
                      </div>
                      <div style={{ height: 4, background: '#f3f4f6', borderRadius: 99 }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: p.stockActuel === 0 ? '#ef4444' : '#f59e0b',
                          borderRadius: 99,
                        }} />
                      </div>
                    </div>
                  );
                })}
                {alertesProduits.length > 5 && (
                  <p style={{ margin: 0, padding: '8px 14px', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
                    +{alertesProduits.length - 5} autres produits en alerte
                  </p>
                )}
              </div>
            </div>
          )}

          {(hotelStats?.maintenance ?? 0) > 0 && (
            <Alert
              type="error"
              showIcon
              message={`${hotelStats?.maintenance} chambre(s) en maintenance`}
              style={{ borderRadius: 10 }}
            />
          )}

        </div>
      </Spin>
    </div>
  );
}
