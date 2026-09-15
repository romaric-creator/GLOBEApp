import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Tag, Button, Modal, Form, InputNumber, Select, Input, Descriptions, App, Space, Dropdown } from 'antd';
import { DollarOutlined, HistoryOutlined, DownloadOutlined } from '@ant-design/icons';
import { hotelApi } from '../../api/hotel';
import type { FactureSejour } from '../../api/hotel';
import { caisseApi, MOYEN_OPTIONS } from '../../api/caisse';
import { useMsg } from '../../hooks/useMsg';
import { exportToExcel, exportToPDF } from '../../utils/export';


export default function FactureSejoursTab() {
  const { message } = App.useApp();
  const { err } = useMsg();
  const qc = useQueryClient();
  const [trancheFactureSejour, setTrancheFactureSejour] = useState<FactureSejour | null>(null);
  const [trancheForm] = Form.useForm();

  const { data: factures, isLoading } = useQuery({
    queryKey: ['hotel-factures'],
    queryFn: () => hotelApi.getFactures(),
  });

  const { data: tranches, refetch: refetchTranches } = useQuery({
    queryKey: ['tranches-facture', trancheFactureSejour?.id],
    queryFn: () => caisseApi.getTranches(trancheFactureSejour!.id),
    enabled: !!trancheFactureSejour,
  });

  const trancheMutation = useMutation({
    mutationFn: (data: { montant: number; moyen: string; notes?: string }) =>
      caisseApi.enregistrerTranche(trancheFactureSejour!.id, data),
    onSuccess: () => {
      message.success('Tranche enregistree');
      trancheForm.resetFields();
      refetchTranches();
      qc.invalidateQueries({ queryKey: ['hotel-factures'] });
    },
    onError: (e: unknown) => err(e),
  });

  const columns = [
    { title: 'N° FactureSejour', dataIndex: 'numero', key: 'numero', width: 160 },
    {
      title: 'Client',
      key: 'client',
      render: (_: unknown, r: FactureSejour) => `${r.reservation.client.nom} ${r.reservation.client.prenom}`,
    },
    {
      title: 'Chambre',
      key: 'chambre',
      width: 90,
      render: (_: unknown, r: FactureSejour) => r.reservation.chambre.numero,
    },
    {
      title: 'Total',
      dataIndex: 'total',
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
      dataIndex: 'reste',
      key: 'reste',
      width: 130,
      render: (r: number) => Number(r) > 0
        ? <span className="text-red-500">{Number(r).toLocaleString()} FCFA</span>
        : <Tag color="green">Soldee</Tag>,
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
      width: 200,
      render: (_: unknown, r: FactureSejour) => (
        <Space>
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => setTrancheFactureSejour(r)}
          >
            Historique
          </Button>
          {!r.payee && (
            <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => setTrancheFactureSejour(r)}>
              Payer
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end mb-3">
        <Dropdown menu={{
          items: [
            {
              key: 'excel',
              label: 'Exporter Excel',
              onClick: () => exportToExcel(
                (factures || []).map((f) => ({
                  'N° Facture': f.numero,
                  Client: `${f.reservation.client.nom} ${f.reservation.client.prenom}`,
                  Chambre: f.reservation.chambre.numero,
                  'Total (FCFA)': Number(f.total),
                  'Paye (FCFA)': Number(f.montantPaye),
                  'Reste (FCFA)': Number(f.reste),
                  Statut: f.payee ? 'Payee' : 'En cours',
                })),
                'factures-hotel',
                'Factures Hotel',
              ),
            },
            {
              key: 'pdf',
              label: 'Exporter PDF',
              onClick: () => exportToPDF(
                [
                  { header: 'N° Facture', dataKey: 'numero' },
                  { header: 'Client', dataKey: 'client' },
                  { header: 'Chambre', dataKey: 'chambre' },
                  { header: 'Total', dataKey: 'total' },
                  { header: 'Paye', dataKey: 'paye' },
                  { header: 'Reste', dataKey: 'reste' },
                  { header: 'Statut', dataKey: 'statut' },
                ],
                (factures || []).map((f) => ({
                  numero: f.numero,
                  client: `${f.reservation.client.nom} ${f.reservation.client.prenom}`,
                  chambre: f.reservation.chambre.numero,
                  total: `${Number(f.total).toLocaleString()} FCFA`,
                  paye: `${Number(f.montantPaye).toLocaleString()} FCFA`,
                  reste: `${Number(f.reste).toLocaleString()} FCFA`,
                  statut: f.payee ? 'Payee' : 'En cours',
                })) as Record<string, unknown>[],
                'factures-hotel',
                'Factures de sejour Hotel',
              ),
            },
          ],
        }}>
          <Button icon={<DownloadOutlined />}>Exporter</Button>
        </Dropdown>
      </div>
      <Table
        dataSource={factures || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 15 }}
      />

      <Modal
        title={trancheFactureSejour?.payee
          ? `Historique des paiements — ${trancheFactureSejour?.numero || ''}`
          : `Paiement par tranches — ${trancheFactureSejour?.numero || ''}`}
        open={!!trancheFactureSejour}
        onCancel={() => { setTrancheFactureSejour(null); trancheForm.resetFields(); }}
        footer={null}
        width={600}
      >
        {trancheFactureSejour && (
          <>
            <Descriptions size="small" bordered className="mb-4" column={2}>
              <Descriptions.Item label="Client">{trancheFactureSejour.reservation.client.nom} {trancheFactureSejour.reservation.client.prenom}</Descriptions.Item>
              <Descriptions.Item label="Chambre">{trancheFactureSejour.reservation.chambre.numero}</Descriptions.Item>
              <Descriptions.Item label="Total">{Number(trancheFactureSejour.total).toLocaleString()} FCFA</Descriptions.Item>
              <Descriptions.Item label="Deja paye"><span className="text-green-600">{Number(trancheFactureSejour.montantPaye).toLocaleString()} FCFA</span></Descriptions.Item>
              <Descriptions.Item label="Reste a payer" span={2}>
                <span className="font-semibold text-red-500">
                  {Number(trancheFactureSejour.reste).toLocaleString()} FCFA
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

            {!trancheFactureSejour.payee && (
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
            )}
          </>
        )}
      </Modal>
    </>
  );
}
