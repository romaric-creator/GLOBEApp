import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMsg } from '../../hooks/useMsg';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Popconfirm,
  Tag,
  App,
  Tabs,
  Segmented,
  Card,
  Statistic,
  Row,
  Col,
  Dropdown,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  CoffeeOutlined,
  ShoppingOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { exportToExcel, exportToPDF } from '../../utils/export';
import { useAuthStore } from '../../store/auth';
import { produitsApi } from "../../api/produits";
import type { Produit, CreateProduitDto } from "../../api/produits";
import CategoriesTab from "./CategoriesTab";
import MouvementsTab from "./MouvementsTab";
import BoissonsGrid from "./BoissonsGrid";

export default function ProduitsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [searchText, setSearchText] = useState('');
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { err } = useMsg();

  const { data: produits, isLoading } = useQuery({
    queryKey: ["produits"],
    queryFn: () => produitsApi.findAll().then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => produitsApi.getCategories().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProduitDto) => produitsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      message.success("Produit créé");
      closeModal();
    },
    onError: (e: unknown) => err(e),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateProduitDto>;
    }) => produitsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      message.success("Produit modifié");
      closeModal();
    },
    onError: (e: unknown) => err(e),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => produitsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      message.success("Produit désactivé");
    },
  });

  const openCreate = () => {
    setEditingProduit(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEdit = (produit: Produit) => {
    setEditingProduit(produit);
    form.setFieldsValue(produit);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduit(null);
    form.resetFields();
  };

  const handleSubmit = (values: CreateProduitDto) => {
    if (editingProduit) {
      updateMutation.mutate({ id: editingProduit.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const { activeProduits, boissonsSubCatIds, restaurantSubCatIds } = useMemo(() => {
    const active = produits?.filter((p) => p.actif) || [];
    const bParentId = categories?.find(
      (c) => c.nom.toLowerCase() === 'boissons' && !c.parentId
    )?.id;
    const rParentId = categories?.find(
      (c) => c.nom.toLowerCase() === 'restaurant' && !c.parentId
    )?.id;
    const bSubIds = new Set(
      categories?.filter((c) => c.parentId === bParentId).map((c) => c.id) || []
    );
    const rSubIds = new Set(
      categories?.filter((c) => c.parentId === rParentId).map((c) => c.id) || []
    );
    return { activeProduits: active, boissonsSubCatIds: bSubIds, restaurantSubCatIds: rSubIds };
  }, [produits, categories]);

  const produitsBoissons = activeProduits.filter((p) => boissonsSubCatIds.has(p.categorieId));
  const produitsRestaurant = activeProduits.filter((p) => restaurantSubCatIds.has(p.categorieId));
  const alerteCount = activeProduits.filter(p => p.stockActuel <= p.seuilAlerte).length;

  const applyFilters = (list: Produit[]) => {
    let result = list;
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter((p) => p.nom.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q));
    }
    if (filterCatId) {
      result = result.filter((p) => p.categorieId === filterCatId);
    }
    return result;
  };

  const columns = [
    { title: "Réf.", dataIndex: "reference", key: "reference", width: 100 },
    {
      title: "Nom",
      dataIndex: "nom",
      key: "nom",
      sorter: (a: Produit, b: Produit) => a.nom.localeCompare(b.nom),
    },
    {
      title: "Catégorie",
      dataIndex: ["categorie", "nom"],
      key: "categorie",
      width: 160,
      render: (val: string) => <Tag>{val}</Tag>,
    },
    {
      title: "Prix vente",
      dataIndex: "prixVente",
      key: "prixVente",
      width: 120,
      sorter: (a: Produit, b: Produit) => Number(a.prixVente) - Number(b.prixVente),
      render: (v: number) => <span className="font-medium">{Number(v).toLocaleString()} F</span>,
    },
    {
      title: "Stock",
      key: "stock",
      width: 120,
      render: (_: unknown, record: Produit) => (
        record.stockActuel <= record.seuilAlerte ? (
          <Tag color="red" icon={<WarningOutlined />}>
            {record.stockActuel} {record.unite}
          </Tag>
        ) : (
          <Tag color="green">
            {record.stockActuel} {record.unite}
          </Tag>
        )
      ),
    },
    ...(isAdmin ? [{
      title: "",
      key: "actions",
      width: 80,
      render: (_: unknown, record: Produit) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title="Désactiver ce produit ?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  const filterBar = (subCatIds: Set<string>) => (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      <Input
        placeholder="Rechercher..."
        prefix={<SearchOutlined className="text-gray-400" />}
        allowClear
        style={{ width: 220 }}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
      <Select
        allowClear
        placeholder="Catégorie"
        style={{ width: 200 }}
        value={filterCatId}
        onChange={(val) => setFilterCatId(val || null)}
      >
        {categories?.filter((c) => subCatIds.has(c.id)).map((cat) => (
          <Select.Option key={cat.id} value={cat.id}>
            {cat.nom}
          </Select.Option>
        ))}
      </Select>
      <div className="ml-auto flex items-center gap-3">
        <Segmented
          value={viewMode}
          onChange={(val) => setViewMode(val as 'table' | 'grid')}
          options={[
            { value: 'grid', icon: <AppstoreOutlined /> },
            { value: 'table', icon: <UnorderedListOutlined /> },
          ]}
        />
        <Dropdown
          menu={{
            items: [
              {
                key: 'excel',
                label: 'Exporter Excel',
                onClick: () => exportToExcel(
                  (activeProduits).map((p) => ({
                    Nom: p.nom,
                    Categorie: p.categorie?.nom ?? '',
                    'Stock actuel': p.stockActuel,
                    'Seuil alerte': p.seuilAlerte,
                    'Prix vente': p.prixVente,
                    Unite: p.unite ?? '',
                  })),
                  'liste-produits',
                  'Produits',
                ),
              },
              {
                key: 'pdf',
                label: 'Exporter PDF',
                onClick: () => exportToPDF(
                  [
                    { header: 'Nom', dataKey: 'nom' },
                    { header: 'Categorie', dataKey: 'categorie' },
                    { header: 'Stock', dataKey: 'stockActuel' },
                    { header: 'Seuil alerte', dataKey: 'seuilAlerte' },
                    { header: 'Prix vente', dataKey: 'prixVente' },
                    { header: 'Unite', dataKey: 'unite' },
                  ],
                  activeProduits.map((p) => ({
                    ...p,
                    categorie: p.categorie?.nom ?? '',
                    unite: p.unite ?? '',
                  })) as Record<string, unknown>[],
                  'liste-produits',
                  'Liste des produits et stocks',
                ),
              },
            ],
          }}
        >
          <Button icon={<DownloadOutlined />}>Exporter</Button>
        </Dropdown>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nouveau
          </Button>
        )}
      </div>
    </div>
  );

  const renderProductList = (list: Produit[], _subCatIds: Set<string>, showGrid: boolean) => {
    const filtered = applyFilters(list);
    if (viewMode === 'table' || !showGrid) {
      return (
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{ pageSize: 15, showTotal: (total) => `${total} produit(s)`, showSizeChanger: true }}
        />
      );
    }
    return (
      <BoissonsGrid
        produits={filtered}
        categories={categories || []}
        loading={isLoading}
        onEdit={isAdmin ? openEdit : undefined}
      />
    );
  };

  const groupedCategories = useMemo(() => {
    if (!categories) return [];
    const parents = categories.filter((c) => !c.parentId);
    return parents.map((parent) => ({
      label: parent.nom,
      options: categories
        .filter((c) => c.parentId === parent.id)
        .map((c) => ({ label: c.nom, value: c.id })),
    }));
  }, [categories]);

  const tabItems = [
    {
      key: "boissons",
      label: <span><CoffeeOutlined /> Boissons ({produitsBoissons.length})</span>,
      children: (
        <>
          {filterBar(boissonsSubCatIds)}
          {renderProductList(produitsBoissons, boissonsSubCatIds, true)}
        </>
      ),
    },
    {
      key: "restaurant",
      label: <span><ShoppingOutlined /> Restaurant ({produitsRestaurant.length})</span>,
      children: (
        <>
          {filterBar(restaurantSubCatIds)}
          {renderProductList(produitsRestaurant, restaurantSubCatIds, false)}
        </>
      ),
    },
    {
      key: "categories",
      label: "Catégories",
      children: <CategoriesTab />,
    },
    {
      key: "mouvements",
      label: "Mouvements de stock",
      children: <MouvementsTab />,
    },
    {
      key: "alertes",
      label: (
        <span>
          <WarningOutlined style={{ color: alerteCount > 0 ? '#ff4d4f' : undefined }} /> Alertes
          {alerteCount > 0 && <Tag color="red" className="ml-2">{alerteCount}</Tag>}
        </span>
      ),
      children: (
        <Table
          columns={[
            { title: "Réf.", dataIndex: "reference", key: "reference" },
            { title: "Nom", dataIndex: "nom", key: "nom" },
            { title: "Stock actuel", dataIndex: "stockActuel", key: "stock", render: (v: number, r: Produit) => <Tag color="red">{v} {r.unite}</Tag> },
            { title: "Seuil alerte", dataIndex: "seuilAlerte", key: "seuil" },
            { title: "Catégorie", dataIndex: ["categorie", "nom"], key: "categorie" },
          ]}
          dataSource={activeProduits.filter(p => p.stockActuel <= p.seuilAlerte)}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: "Aucun produit en alerte" }}
        />
      ),
    },
  ];

  return (
    <div id="tour-produits-page">
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total produits" value={activeProduits.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Boissons" value={produitsBoissons.length} prefix={<CoffeeOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Restaurant" value={produitsRestaurant.length} prefix={<ShoppingOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="En alerte stock"
              value={alerteCount}
              styles={alerteCount > 0 ? { content: { color: '#ff4d4f' } } : undefined}
              prefix={alerteCount > 0 ? <WarningOutlined /> : undefined}
            />
          </Card>
        </Col>
      </Row>

      <Tabs id="tour-produits-tabs" items={tabItems} onChange={() => { setSearchText(''); setFilterCatId(null); }} />

      <Modal
        title={editingProduit ? "Modifier le produit" : "Nouveau produit"}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="reference"
              label="Référence"
              rules={[{ required: true, message: "Référence requise" }]}
            >
              <Input placeholder="Ex: BIR-001" />
            </Form.Item>
            <Form.Item
              name="nom"
              label="Nom"
              rules={[{ required: true, message: "Nom requis" }]}
            >
              <Input placeholder="Nom du produit" />
            </Form.Item>
          </div>
          <Form.Item
            name="categorieId"
            label="Catégorie"
            rules={[{ required: true, message: "Catégorie requise" }]}
          >
            <Select
              placeholder="Choisir une catégorie"
              showSearch
              optionFilterProp="label"
              options={groupedCategories}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="prixAchat"
              label="Prix d'achat (FCFA)"
              rules={[{ required: true, message: "Prix requis" }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="prixVente"
              label="Prix de vente (FCFA)"
              rules={[{ required: true, message: "Prix requis" }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {!editingProduit && (
              <Form.Item name="stockActuel" label="Stock initial">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            )}
            <Form.Item name="seuilAlerte" label="Seuil alerte">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="unite" label="Unité">
              <Select>
                <Select.Option value="unite">Unité</Select.Option>
                <Select.Option value="portion">Portion</Select.Option>
                <Select.Option value="bouteille">Bouteille</Select.Option>
                <Select.Option value="kg">Kg</Select.Option>
                <Select.Option value="litre">Litre</Select.Option>
                <Select.Option value="carton">Carton</Select.Option>
                <Select.Option value="pack">Pack</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={closeModal}>Annuler</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingProduit ? "Modifier" : "Créer"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
