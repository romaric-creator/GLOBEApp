import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Select, InputNumber, Card, Space, Tag, App, Divider, Row, Col, Statistic } from 'antd';
import { PlusOutlined, DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { ventesApi } from '../../api/ventes';
import { produitsApi } from '../../api/produits';
import type { CreateLigneDto } from '../../api/ventes';
import type { Produit } from '../../api/produits';

interface LignePanier {
  produit: Produit;
  quantite: number;
  prixUnitaire: number;
  remise: number;
}

export default function NouvelleVenteTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [selectedProduit, setSelectedProduit] = useState<string | null>(null);
  const [quantite, setQuantite] = useState(1);
  const [modePaiement, setModePaiement] = useState('ESPECES');
  const [clientId, setClientId] = useState<string | null>(null);
  const [remiseGlobale, setRemiseGlobale] = useState(0);

  const { data: produitsRes } = useQuery({
    queryKey: ['produits'],
    queryFn: () => produitsApi.findAll(),
  });
  const produits = produitsRes?.data;

  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      return res.json();
    },
  });

  const createVente = useMutation({
    mutationFn: ventesApi.create,
    onSuccess: (vente) => {
      message.success(`Vente ${vente.numero} creee avec succes`);
      setPanier([]);
      setRemiseGlobale(0);
      setClientId(null);
      queryClient.invalidateQueries({ queryKey: ['ventes'] });
      queryClient.invalidateQueries({ queryKey: ['produits'] });
      queryClient.invalidateQueries({ queryKey: ['caisse-etat'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur lors de la creation');
    },
  });

  const ajouterAuPanier = () => {
    if (!selectedProduit) return;
    const produit = produits?.find((p: Produit) => p.id === selectedProduit);
    if (!produit) return;

    const existing = panier.find((l) => l.produit.id === selectedProduit);
    if (existing) {
      setPanier(panier.map((l) =>
        l.produit.id === selectedProduit
          ? { ...l, quantite: l.quantite + quantite }
          : l,
      ));
    } else {
      setPanier([...panier, {
        produit,
        quantite,
        prixUnitaire: Number(produit.prixVente),
        remise: 0,
      }]);
    }
    setSelectedProduit(null);
    setQuantite(1);
  };

  const supprimerDuPanier = (produitId: string) => {
    setPanier(panier.filter((l) => l.produit.id !== produitId));
  };

  const modifierQuantite = (produitId: string, qty: number) => {
    setPanier(panier.map((l) =>
      l.produit.id === produitId ? { ...l, quantite: qty } : l,
    ));
  };

  const sousTotal = panier.reduce((sum, l) => sum + l.quantite * l.prixUnitaire - l.remise, 0);
  const total = sousTotal - remiseGlobale;

  const validerVente = () => {
    if (panier.length === 0) {
      message.warning('Le panier est vide');
      return;
    }
    const lignes: CreateLigneDto[] = panier.map((l) => ({
      produitId: l.produit.id,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      remise: l.remise,
    }));

    createVente.mutate({
      modePaiement,
      clientId: clientId || undefined,
      remise: remiseGlobale,
      lignes,
    });
  };

  const columns = [
    { title: 'Produit', dataIndex: ['produit', 'nom'], key: 'nom' },
    { title: 'Ref', dataIndex: ['produit', 'reference'], key: 'ref', width: 100 },
    {
      title: 'Qte',
      key: 'quantite',
      width: 100,
      render: (_: unknown, record: LignePanier) => (
        <InputNumber
          min={1}
          max={record.produit.stockActuel}
          value={record.quantite}
          onChange={(v) => v && modifierQuantite(record.produit.id, v)}
          size="small"
        />
      ),
    },
    {
      title: 'P.U.',
      key: 'prix',
      width: 100,
      render: (_: unknown, record: LignePanier) => `${record.prixUnitaire} DA`,
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      render: (_: unknown, record: LignePanier) =>
        `${record.quantite * record.prixUnitaire - record.remise} DA`,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: unknown, record: LignePanier) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => supprimerDuPanier(record.produit.id)}
        />
      ),
    },
  ];

  return (
    <Row gutter={16}>
      <Col span={16}>
        <Card title="Panier" size="small">
          <Space className="mb-3">
            <Select
              showSearch
              placeholder="Rechercher un produit..."
              style={{ width: 300 }}
              value={selectedProduit}
              onChange={setSelectedProduit}
              optionFilterProp="label"
              options={produits?.filter((p: Produit) => p.actif && p.stockActuel > 0).map((p: Produit) => ({
                value: p.id,
                label: `${p.reference} - ${p.nom} (stock: ${p.stockActuel})`,
              })) || []}
            />
            <InputNumber min={1} value={quantite} onChange={(v) => setQuantite(v || 1)} />
            <Button type="primary" icon={<PlusOutlined />} onClick={ajouterAuPanier} disabled={!selectedProduit}>
              Ajouter
            </Button>
          </Space>

          <Table
            dataSource={panier}
            columns={columns}
            rowKey={(r) => r.produit.id}
            pagination={false}
            size="small"
          />
        </Card>
      </Col>

      <Col span={8}>
        <Card title="Reglement" size="small">
          <Space direction="vertical" className="w-full" size="middle">
            <div>
              <label className="text-sm text-gray-500">Client (optionnel)</label>
              <Select
                showSearch
                allowClear
                placeholder="Client..."
                className="w-full"
                value={clientId}
                onChange={setClientId}
                optionFilterProp="label"
                options={clients?.map((c: { id: string; nom: string; prenom?: string }) => ({
                  value: c.id,
                  label: `${c.nom} ${c.prenom || ''}`,
                })) || []}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Mode de paiement</label>
              <Select
                className="w-full"
                value={modePaiement}
                onChange={setModePaiement}
                options={[
                  { value: 'ESPECES', label: 'Especes' },
                  { value: 'CARTE', label: 'Carte' },
                  { value: 'VIREMENT', label: 'Virement' },
                  { value: 'CREDIT', label: 'Credit' },
                  { value: 'MIXTE', label: 'Mixte' },
                ]}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Remise globale (DA)</label>
              <InputNumber
                className="w-full"
                min={0}
                max={sousTotal}
                value={remiseGlobale}
                onChange={(v) => setRemiseGlobale(v || 0)}
              />
            </div>

            <Divider />

            <Statistic title="Sous-total" value={sousTotal} suffix="DA" />
            {remiseGlobale > 0 && (
              <Tag color="orange">Remise: -{remiseGlobale} DA</Tag>
            )}
            <Statistic
              title="TOTAL"
              value={total}
              suffix="DA"
              valueStyle={{ color: '#1677ff', fontWeight: 'bold', fontSize: 28 }}
            />

            <Button
              type="primary"
              size="large"
              block
              icon={<ShoppingCartOutlined />}
              onClick={validerVente}
              loading={createVente.isPending}
              disabled={panier.length === 0}
            >
              Valider la vente
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );
}
