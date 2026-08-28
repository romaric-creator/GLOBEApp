import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Tag, Button, Modal, Form, InputNumber, Select, Input, Descriptions, App, Space } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { hotelApi } from '../../api/hotel';
import { caisseApi, MOYEN_OPTIONS } from '../../api/caisse';

interface Facture {
  id: string;
  numero: string;
  montantTotal: number;
  montantPaye: number;
  payee: boolean;
  createdAt: string;
  reservation: {
    client: { nom: string; prenom: string };
    chambre: { numero: string };
    dateArrivee: string;
    dateDepart: string;
  };
}


export default function FacturesTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [trancheFacture, setTrancheFacture] = useState<Facture | null>(null);
  const [trancheForm] = Form.useForm();

  const { data: factures, isLoading } = useQuery({
    queryKey: ['hotel-factures'],
    queryFn: () => hotelApi.getFactures(),
  });

  const { data: tranches, refetch: refetchTranches } = useQuery({
    queryKey: ['tranches-facture', trancheFacture?.id],
    queryFn: () => caisseApi.getTranches(trancheFacture!.id),
    enabled: !!trancheFacture,
  });

  const trancheMutation = useMutation({
    mutationFn: (data: { montant: number; moyen: string; notes?: string }) =>
      caisseApi.enregistrerTranche(trancheFacture!.id, data),
    onSuccess: () => {
      message.success('Tranche enregistree');
      trancheForm.resetFields();
      refetchTranches();
      qc.invalidateQueries({ queryKey: ['hotel-factures'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const columns = [
    { title: 'N° Facture', dataIndex: 'numero', key: 'numero', width: 160 },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: Facture) => `${r.reservation.client.nom} ${r.reservation.client.prenom}`,
    },
    {
      title: 'Chambre',
      key: 'chambre',
      width: 90,
      render: (_: unknown, r: Facture) => r.reservation.chambre.numero,
    },
    {
      title: 'Total',
      dataIndex: 'montantTotal',
      key: 'total',
      width: 130,
      render: (m: number) => `${Number(m).toLocaleString()} FCFA`,
    },
    {
      title: 'Paye',
      dataIndex: 'montantPaye',
      key: 'paye',
      width: 130,
      render: (m: number) => <span className="text-green-600">{Number(m).toLocaleString()} FCFA</span>,
    },
    {
      title: 'Reste',
      key: 'reste',
      width: 130,
      render: (_: unknown, r: Facture) => {
        const reste = Number(r.montantTotal) - Number(r.montantPaye);
        return reste > 0 ? <span className="text-red-500">{reste.toLocaleString()} FCFA</span> : <Tag color="green">Soldee</Tag>;
      },
    },
    {
      title: 'Statut',
      dataIndex: 'payee',
      key: 'statut',
      width: 100,
      render: (p: boolean) => <Tag color={p ? 'green' : 'orange'}>{p ? 'Payee' : 'En cours'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, r: Facture) => (
        <Space>
          {!r.payee && (
            <Button size="small" icon={<DollarOutlined />} onClick={() => setTrancheFacture(r)}>
              Payer
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        dataSource={factures || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 15 }}
      />

      <Modal
        title={`Paiement par tranches — ${trancheFacture?.numero || ''}`}
        open={!!trancheFacture}
        onCancel={() => { setTrancheFacture(null); trancheForm.resetFields(); }}
        footer={null}
        width={600}
      >
        {trancheFacture && (
          <>
            <Descriptions size="small" bordered className="mb-4" column={2}>
              <Descriptions.Item label="Client">{trancheFacture.reservation.client.nom} {trancheFacture.reservation.client.prenom}</Descriptions.Item>
              <Descriptions.Item label="Chambre">{trancheFacture.reservation.chambre.numero}</Descriptions.Item>
              <Descriptions.Item label="Total">{Number(trancheFacture.montantTotal).toLocaleString()} FCFA</Descriptions.Item>
              <Descriptions.Item label="Deja paye"><span className="text-green-600">{Number(trancheFacture.montantPaye).toLocaleString()} FCFA</span></Descriptions.Item>
              <Descriptions.Item label="Reste a payer" span={2}>
                <span className="font-semibold text-red-500">
                  {(Number(trancheFacture.montantTotal) - Number(trancheFacture.montantPaye)).toLocaleString()} FCFA
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Table
              dataSource={tranches?.tranches || []}
              columns={[
                { title: 'Ref', dataIndex: 'reference', key: 'ref', width: 140 },
                { title: 'Montant', dataIndex: 'montant', key: 'montant', render: (m: number) => `${Number(m).toLocaleString()} FCFA` },
                { title: 'Moyen', dataIndex: 'moyen', key: 'moyen', render: (m: string) => <Tag>{m}</Tag> },
                { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (d: string) => new Date(d).toLocaleDateString('fr-FR') },
                { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (n: string | null) => n || '-' },
              ]}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'Aucun paiement enregistre' }}
              className="mb-4"
            />

            <Form
              form={trancheForm}
              layout="inline"
              className="gap-2"
              onFinish={(v) => trancheMutation.mutate({ montant: v.montant, moyen: v.moyen, notes: v.notes || undefined })}
            >
              <Form.Item name="montant" rules={[{ required: true, message: 'Requis' }]}>
                <InputNumber placeholder="Montant" min={1} style={{ width: 130 }} />
              </Form.Item>
              <Form.Item name="moyen" initialValue="ESPECES" rules={[{ required: true }]}>
                <Select options={MOYEN_OPTIONS} style={{ width: 140 }} />
              </Form.Item>
              <Form.Item name="notes">
                <Input placeholder="Notes (optionnel)" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={trancheMutation.isPending}>
                  Enregistrer tranche
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </>
  );
}
