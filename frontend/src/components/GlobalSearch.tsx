import { useState, useEffect, useMemo } from 'react';
import { Modal, Input, Tag, Typography } from 'antd';
import {
  SearchOutlined,
  TeamOutlined,
  ShoppingOutlined,
  HomeOutlined,
  CoffeeOutlined,
  BankOutlined,
  UserOutlined,
  CalendarOutlined,
  DashboardOutlined,
  AccountBookOutlined,
  BarChartOutlined,
  CloudOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../api/clients';
import { produitsApi } from '../api/produits';
import type { Client } from '../api/clients';
import type { Produit } from '../api/produits';

interface SearchItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  path: string;
  category: string;
  color: string;
}

const PAGES: SearchItem[] = [
  { id: 'p-dash', title: 'Dashboard', description: 'Tableau de bord', icon: <DashboardOutlined />, path: '/dashboard', category: 'Pages', color: 'gold' },
  { id: 'p-clients', title: 'Clients', description: 'Gestion des clients', icon: <TeamOutlined />, path: '/clients', category: 'Pages', color: 'gold' },
  { id: 'p-produits', title: 'Produits & Stock', description: 'Catalogue et inventaire', icon: <ShoppingOutlined />, path: '/produits', category: 'Pages', color: 'gold' },
  { id: 'p-caisse-hotel', title: 'Caisse Hotel', description: 'Encaissement factures hotel', icon: <BankOutlined />, path: '/caisse-hotel', category: 'Pages', color: 'gold' },
  { id: 'p-caisse-resto', title: 'Caisse Restaurant', description: 'Encaissement commandes', icon: <BankOutlined />, path: '/caisse-restaurant', category: 'Pages', color: 'gold' },
  { id: 'p-hotel', title: 'Hotel', description: 'Chambres et reservations', icon: <HomeOutlined />, path: '/hotel', category: 'Pages', color: 'gold' },
  { id: 'p-resto', title: 'Bar & Restaurant', description: 'Commandes restaurant', icon: <CoffeeOutlined />, path: '/restaurant', category: 'Pages', color: 'gold' },
  { id: 'p-personnel', title: 'Personnel', description: 'Employes et pointage', icon: <UserOutlined />, path: '/personnel', category: 'Pages', color: 'gold' },
  { id: 'p-piscine', title: 'Piscine', description: 'Tickets et abonnements', icon: <SafetyCertificateOutlined />, path: '/piscine', category: 'Pages', color: 'gold' },
  { id: 'p-salle', title: 'Salle de fete', description: 'Reservations', icon: <CalendarOutlined />, path: '/salle-fete', category: 'Pages', color: 'gold' },
  { id: 'p-compta', title: 'Comptabilite', description: 'Ecritures comptables', icon: <AccountBookOutlined />, path: '/comptabilite', category: 'Pages', color: 'gold' },
  { id: 'p-rapports', title: 'Rapports', description: 'Statistiques', icon: <BarChartOutlined />, path: '/rapports', category: 'Pages', color: 'gold' },
  { id: 'p-backup', title: 'Sauvegarde', description: 'Backup & restauration', icon: <CloudOutlined />, path: '/sauvegarde', category: 'Pages', color: 'gold' },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.findAll().then((r) => r.data),
    enabled: open,
  });

  const { data: produits } = useQuery({
    queryKey: ['produits'],
    queryFn: () => produitsApi.findAll().then((r) => r.data),
    enabled: open,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const allItems = useMemo(() => {
    const items: SearchItem[] = [...PAGES];

    if (clients) {
      clients.slice(0, 50).forEach((c: Client) => {
        items.push({
          id: `c-${c.id}`,
          title: `${c.nom} ${c.prenom || ''}`.trim(),
          description: c.telephone || c.email || undefined,
          icon: <TeamOutlined />,
          path: '/clients',
          category: 'Clients',
          color: 'green',
        });
      });
    }

    if (produits) {
      produits.filter((p: Produit) => p.actif).slice(0, 50).forEach((p: Produit) => {
        items.push({
          id: `pr-${p.id}`,
          title: p.nom,
          description: `${p.reference} - Stock: ${p.stockActuel} ${p.unite}`,
          icon: <ShoppingOutlined />,
          path: '/produits',
          category: 'Produits',
          color: p.stockActuel <= p.seuilAlerte ? 'red' : 'cyan',
        });
      });
    }

    return items;
  }, [clients, produits]);

  const filtered = useMemo(() => {
    if (!search.trim()) return PAGES;
    const q = search.toLowerCase();
    return allItems
      .filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [search, allItems]);

  const handleSelect = (item: SearchItem) => {
    setOpen(false);
    setSearch('');
    navigate(item.path);
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-400 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all"
      >
        <SearchOutlined />
        <span>Rechercher...</span>
        <kbd className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">Ctrl+K</kbd>
      </div>

      <Modal
        open={open}
        onCancel={() => { setOpen(false); setSearch(''); }}
        footer={null}
        closable={false}
        width={560}
        styles={{ body: { padding: 0 } }}
        className="search-modal"
      >
        <div className="p-3 border-b border-slate-100">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Rechercher un client, produit, page..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="borderless"
            size="large"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length > 0) {
                handleSelect(filtered[0]);
              }
              if (e.key === 'Escape') {
                setOpen(false);
                setSearch('');
              }
            }}
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <SearchOutlined className="text-2xl mb-2" />
              <p>Aucun resultat</p>
            </div>
          ) : (
            <div>
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors border-b last:border-b-0"
                  onClick={() => handleSelect(item)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="text-lg text-slate-500">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <Typography.Text strong ellipsis>{item.title}</Typography.Text>
                      {item.description && (
                        <Typography.Text type="secondary" className="block text-xs" ellipsis>
                          {item.description}
                        </Typography.Text>
                      )}
                    </div>
                    <Tag color={item.color} className="text-xs">{item.category}</Tag>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
