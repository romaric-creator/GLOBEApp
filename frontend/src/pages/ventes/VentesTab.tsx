import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Tag, Button, Space, Modal, Descriptions, Popconfirm, App, Input } from 'antd';
import { EyeOutlined, PrinterOutlined, StopOutlined, RollbackOutlined } from '@ant-design/icons';
import { ventesApi } from '../../api/ventes';
import type { Vente } from '../../api/ventes';

const statutColors: Record<string, string> = {
  EN_COURS: 'processing',
  VALIDEE: 'success',
  ANNULEE: 'error',
  REMBOURSEE: 'warning',
};

const modeLabels: Record<string, string> = {
  ESPECES: 'Especes',
  CARTE: 'Carte',
  VIREMENT: 'Virement',
  CREDIT: 'Credit',
  MIXTE: 'Mixte',
};

export default function VentesTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [detailVente, setDetailVente] = useState<Vente | null>(null);
  const [avoirModal, setAvoirModal] = useState<string | null>(null);
  const [avoirMotif, setAvoirMotif] = useState('');
  const [avoirMontant, setAvoirMontant] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['ventes', page],
    queryFn: () => ventesApi.getAll(page),
  });

  const annulerMutation = useMutation({
    mutationFn: ventesApi.annuler,
    onSuccess: () => {
      message.success('Vente annulee');
      queryClient.invalidateQueries({ queryKey: ['ventes'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const ticketMutation = useMutation({
    mutationFn: ventesApi.genererTicket,
    onSuccess: () => message.success('Ticket genere'),
  });

  const avoirMutation = useMutation({
    mutationFn: ventesApi.createAvoir,
    onSuccess: () => {
      message.success('Avoir cree');
      setAvoirModal(null);
      queryClient.invalidateQueries({ queryKey: ['ventes'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const columns = [
    { title: 'N°', dataIndex: 'numero', key: 'numero', width: 150 },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: Vente) => r.client ? `${r.client.nom} ${r.client.prenom || ''}` : '-',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      render: (t: number) => `${Number(t).toLocaleString()} FCFA`,
    },
    {
      title: 'Paiement',
      dataIndex: 'modePaiement',
      key: 'mode',
      width: 100,
      render: (m: string) => modeLabels[m] || m,
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 110,
      render: (s: string) => <Tag color={statutColors[s]}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Vente) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailVente(record)} />
          <Button size="small" icon={<PrinterOutlined />} onClick={() => ticketMutation.mutate(record.id)} />
          {record.statut === 'VALIDEE' && (
            <>
              <Button size="small" icon={<RollbackOutlined />} onClick={() => { setAvoirModal(record.id); setAvoirMontant(Number(record.total)); }} />
              <Popconfirm title="Annuler cette vente ?" onConfirm={() => annulerMutation.mutate(record.id)}>
                <Button size="small" danger icon={<StopOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        dataSource={data?.data || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          total: data?.total || 0,
          pageSize: 20,
          onChange: setPage,
        }}
      />

      <Modal
        title={`Detail vente ${detailVente?.numero || ''}`}
        open={!!detailVente}
        onCancel={() => setDetailVente(null)}
        footer={null}
        width={600}
      >
        {detailVente && (
          <>
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Date">{new Date(detailVente.date).toLocaleString('fr-FR')}</Descriptions.Item>
              <Descriptions.Item label="Statut"><Tag color={statutColors[detailVente.statut]}>{detailVente.statut}</Tag></Descriptions.Item>
              <Descriptions.Item label="Mode">{modeLabels[detailVente.modePaiement]}</Descriptions.Item>
              <Descriptions.Item label="Client">{detailVente.client ? `${detailVente.client.nom} ${detailVente.client.prenom || ''}` : '-'}</Descriptions.Item>
            </Descriptions>
            <Table
              dataSource={detailVente.lignes}
              rowKey="id"
              size="small"
              pagination={false}
              className="mt-3"
              columns={[
                { title: 'Produit', dataIndex: ['produit', 'nom'], key: 'nom' },
                { title: 'Qte', dataIndex: 'quantite', key: 'qte', width: 60 },
                { title: 'P.U.', dataIndex: 'prixUnitaire', key: 'pu', width: 80, render: (v: number) => `${Number(v)} FCFA` },
                { title: 'Total', dataIndex: 'totalLigne', key: 'tl', width: 100, render: (v: number) => `${Number(v)} FCFA` },
              ]}
            />
            <div className="text-right mt-3 text-lg font-bold">
              Total: {Number(detailVente.total).toLocaleString()} FCFA
            </div>
          </>
        )}
      </Modal>

      <Modal
        title="Creer un avoir"
        open={!!avoirModal}
        onCancel={() => setAvoirModal(null)}
        onOk={() => avoirModal && avoirMutation.mutate({ venteId: avoirModal, motif: avoirMotif, montant: avoirMontant })}
        confirmLoading={avoirMutation.isPending}
      >
        <Space direction="vertical" className="w-full">
          <div>
            <label>Motif</label>
            <Input value={avoirMotif} onChange={(e) => setAvoirMotif(e.target.value)} placeholder="Raison de l'avoir..." />
          </div>
          <div>
            <label>Montant (FCFA)</label>
            <Input type="number" value={avoirMontant} onChange={(e) => setAvoirMontant(Number(e.target.value))} />
          </div>
        </Space>
      </Modal>
    </>
  );
}
