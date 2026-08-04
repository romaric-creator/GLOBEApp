import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tabs, Card, Row, Col, Statistic, Tag, DatePicker, App } from 'antd';
import { PlusOutlined, DollarOutlined } from '@ant-design/icons';
import { comptabiliteApi } from '../../api/comptabilite';
import type { Compte, Ecriture, CategorieCompta } from '../../api/comptabilite';

const TYPE_COMPTE_COLORS: Record<string, string> = {
  ACTIF: 'blue',
  PASSIF: 'red',
  CHARGE: 'orange',
  PRODUIT: 'green',
};

const TYPE_CATEGORIE_COLORS: Record<string, string> = {
  RECETTE: 'green',
  DEPENSE: 'red',
  TRANSFERT: 'blue',
};

export default function ComptabilitePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [compteModalOpen, setCompteModalOpen] = useState(false);
  const [ecritureModalOpen, setEcritureModalOpen] = useState(false);
  const [categorieModalOpen, setCategorieModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[string?, string?]>([undefined, undefined]);
  const [compteForm] = Form.useForm();
  const [ecritureForm] = Form.useForm();
  const [categorieForm] = Form.useForm();

  const { data: stats } = useQuery({
    queryKey: ['compta-stats'],
    queryFn: comptabiliteApi.getStats,
  });

  const { data: comptes } = useQuery({
    queryKey: ['comptes'],
    queryFn: comptabiliteApi.getComptes,
  });

  const { data: ecritures, isLoading: ecrituresLoading } = useQuery({
    queryKey: ['ecritures', dateRange],
    queryFn: () => comptabiliteApi.getEcritures(dateRange[0], dateRange[1]),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-compta'],
    queryFn: comptabiliteApi.getCategories,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['compta-stats'] });
    queryClient.invalidateQueries({ queryKey: ['comptes'] });
    queryClient.invalidateQueries({ queryKey: ['ecritures'] });
    queryClient.invalidateQueries({ queryKey: ['categories-compta'] });
  };

  const createCompteMutation = useMutation({
    mutationFn: comptabiliteApi.createCompte,
    onSuccess: () => { message.success('Compte cree'); setCompteModalOpen(false); compteForm.resetFields(); invalidateAll(); },
  });

  const createEcritureMutation = useMutation({
    mutationFn: comptabiliteApi.createEcriture,
    onSuccess: () => { message.success('Ecriture enregistree'); setEcritureModalOpen(false); ecritureForm.resetFields(); invalidateAll(); },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const createCategorieMutation = useMutation({
    mutationFn: comptabiliteApi.createCategorie,
    onSuccess: () => { message.success('Categorie creee'); setCategorieModalOpen(false); categorieForm.resetFields(); invalidateAll(); },
  });

  const comptesColumns = [
    { title: 'Nom', dataIndex: 'nom', key: 'nom' },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag color={TYPE_COMPTE_COLORS[t]}>{t}</Tag>,
    },
    {
      title: 'Solde',
      dataIndex: 'solde',
      key: 'solde',
      render: (s: number) => `${Number(s).toLocaleString()} FCFA`,
    },
  ];

  const ecrituresColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    { title: 'Libelle', dataIndex: 'libelle', key: 'libelle' },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      width: 120,
      render: (m: number) => `${Number(m).toLocaleString()} FCFA`,
    },
    {
      title: 'Debit',
      key: 'debit',
      render: (_: unknown, r: Ecriture) => r.compteDebit.nom,
    },
    {
      title: 'Credit',
      key: 'credit',
      render: (_: unknown, r: Ecriture) => r.compteCredit.nom,
    },
    {
      title: 'Categorie',
      key: 'categorie',
      render: (_: unknown, r: Ecriture) => (
        <Tag color={TYPE_CATEGORIE_COLORS[r.categorieCompta.type]}>{r.categorieCompta.nom}</Tag>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'ecritures',
      label: 'Ecritures',
      children: (
        <>
          <div className="mb-3 flex gap-3">
            <DatePicker.RangePicker
              onChange={(dates) => {
                if (dates) {
                  setDateRange([dates[0]?.format('YYYY-MM-DD'), dates[1]?.format('YYYY-MM-DD')]);
                } else {
                  setDateRange([undefined, undefined]);
                }
              }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEcritureModalOpen(true)}>
              Nouvelle ecriture
            </Button>
          </div>
          <Table dataSource={ecritures || []} columns={ecrituresColumns} rowKey="id" loading={ecrituresLoading} size="small" />
        </>
      ),
    },
    {
      key: 'comptes',
      label: 'Plan comptable',
      children: (
        <>
          <div className="mb-3">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCompteModalOpen(true)}>
              Nouveau compte
            </Button>
          </div>
          <Table dataSource={comptes || []} columns={comptesColumns} rowKey="id" size="small" />
        </>
      ),
    },
    {
      key: 'categories',
      label: 'Categories',
      children: (
        <>
          <div className="mb-3">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCategorieModalOpen(true)}>
              Nouvelle categorie
            </Button>
          </div>
          <Table
            dataSource={categories || []}
            columns={[
              { title: 'Nom', dataIndex: 'nom', key: 'nom' },
              {
                title: 'Type',
                dataIndex: 'type',
                key: 'type',
                render: (t: string) => <Tag color={TYPE_CATEGORIE_COLORS[t]}>{t}</Tag>,
              },
            ]}
            rowKey="id"
            size="small"
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Comptabilite</h2>

      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card><Statistic title="Recettes du mois" value={stats?.recettesMois || 0} suffix="FCFA" prefix={<DollarOutlined />} valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Depenses du mois" value={stats?.depensesMois || 0} suffix="FCFA" valueStyle={{ color: '#cf1322' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Solde general" value={stats?.soldeGeneral || 0} suffix="FCFA" /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Ecritures" value={stats?.nbEcritures || 0} /></Card>
        </Col>
      </Row>

      <Tabs items={tabItems} />

      <Modal
        title="Nouveau compte"
        open={compteModalOpen}
        onCancel={() => { setCompteModalOpen(false); compteForm.resetFields(); }}
        onOk={() => compteForm.submit()}
        confirmLoading={createCompteMutation.isPending}
      >
        <Form form={compteForm} layout="vertical" onFinish={(v) => createCompteMutation.mutate(v)}>
          <Form.Item name="nom" label="Nom du compte" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'ACTIF', label: 'Actif' },
              { value: 'PASSIF', label: 'Passif' },
              { value: 'CHARGE', label: 'Charge' },
              { value: 'PRODUIT', label: 'Produit' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Nouvelle ecriture comptable"
        open={ecritureModalOpen}
        onCancel={() => { setEcritureModalOpen(false); ecritureForm.resetFields(); }}
        onOk={() => ecritureForm.submit()}
        confirmLoading={createEcritureMutation.isPending}
        width={500}
      >
        <Form form={ecritureForm} layout="vertical" onFinish={(v) => createEcritureMutation.mutate(v)}>
          <Form.Item name="libelle" label="Libelle" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="montant" label="Montant (FCFA)" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="compteDebitId" label="Compte debite" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={comptes?.map((c: Compte) => ({ value: c.id, label: c.nom })) || []}
            />
          </Form.Item>
          <Form.Item name="compteCreditId" label="Compte credite" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={comptes?.map((c: Compte) => ({ value: c.id, label: c.nom })) || []}
            />
          </Form.Item>
          <Form.Item name="categorieComptaId" label="Categorie" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={categories?.map((c: CategorieCompta) => ({ value: c.id, label: c.nom })) || []}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Nouvelle categorie"
        open={categorieModalOpen}
        onCancel={() => { setCategorieModalOpen(false); categorieForm.resetFields(); }}
        onOk={() => categorieForm.submit()}
        confirmLoading={createCategorieMutation.isPending}
      >
        <Form form={categorieForm} layout="vertical" onFinish={(v) => createCategorieMutation.mutate(v)}>
          <Form.Item name="nom" label="Nom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'RECETTE', label: 'Recette' },
              { value: 'DEPENSE', label: 'Depense' },
              { value: 'TRANSFERT', label: 'Transfert' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
