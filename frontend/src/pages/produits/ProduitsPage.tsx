import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { produitsApi } from "../../api/produits";
import type { Produit, CreateProduitDto } from "../../api/produits";
import CategoriesTab from "./CategoriesTab";
import MouvementsTab from "./MouvementsTab";
import BoissonsGrid from "./BoissonsGrid";
import { getErrorMessage } from "../../api/errors";

export default function ProduitsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

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
      message.success("Produit cree");
      closeModal();
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
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
      message.success("Produit modifie");
      closeModal();
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => produitsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produits"] });
      message.success("Produit desactive");
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

  const columns = [
    { title: "Reference", dataIndex: "reference", key: "reference" },
    {
      title: "Nom",
      dataIndex: "nom",
      key: "nom",
      sorter: (a: Produit, b: Produit) => a.nom.localeCompare(b.nom),
    },
    { title: "Categorie", dataIndex: ["categorie", "nom"], key: "categorie" },
    {
      title: "Prix achat",
      dataIndex: "prixAchat",
      key: "prixAchat",
      render: (v: number) => `${v} FCFA`,
    },
    {
      title: "Prix vente",
      dataIndex: "prixVente",
      key: "prixVente",
      render: (v: number) => `${v} FCFA`,
    },
    {
      title: "Stock",
      key: "stock",
      render: (_: unknown, record: Produit) => (
        <span>
          {record.stockActuel <= record.seuilAlerte ? (
            <Tag color="red" icon={<WarningOutlined />}>
              {record.stockActuel} {record.unite}
            </Tag>
          ) : (
            <Tag color="green">
              {record.stockActuel} {record.unite}
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Produit) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title="Desactiver ce produit ?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const activeProduits = produits?.filter((p) => p.actif) || [];

  const tabItems = [
    {
      key: "produits",
      label: "Produits",
      children: (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Produits</h2>
            <div className="flex items-center gap-3">
              <Segmented
                value={viewMode}
                onChange={(val) => setViewMode(val as 'table' | 'grid')}
                options={[
                  { value: 'grid', icon: <AppstoreOutlined /> },
                  { value: 'table', icon: <UnorderedListOutlined /> },
                ]}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Nouveau produit
              </Button>
            </div>
          </div>

          {viewMode === 'table' ? (
            <Table
              columns={columns}
              dataSource={activeProduits}
              rowKey="id"
              loading={isLoading}
              pagination={{
                pageSize: 10,
                showTotal: (total) => `${total} produit(s)`,
              }}
            />
          ) : (
            <BoissonsGrid
              produits={activeProduits}
              categories={categories || []}
              loading={isLoading}
              onEdit={openEdit}
            />
          )}
        </>
      ),
    },
    {
      key: "categories",
      label: "Categories",
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
          <WarningOutlined style={{ color: '#ff4d4f' }} /> Alertes stock
          {produits && produits.filter(p => p.actif && p.stockActuel <= p.seuilAlerte).length > 0 && (
            <Tag color="red" className="ml-2">{produits.filter(p => p.actif && p.stockActuel <= p.seuilAlerte).length}</Tag>
          )}
        </span>
      ),
      children: (
        <Table
          columns={[
            { title: "Reference", dataIndex: "reference", key: "reference" },
            { title: "Nom", dataIndex: "nom", key: "nom" },
            { title: "Stock actuel", dataIndex: "stockActuel", key: "stock", render: (v: number, r: Produit) => <Tag color="red">{v} {r.unite}</Tag> },
            { title: "Seuil alerte", dataIndex: "seuilAlerte", key: "seuil" },
            { title: "Categorie", dataIndex: ["categorie", "nom"], key: "categorie" },
          ]}
          dataSource={produits?.filter(p => p.actif && p.stockActuel <= p.seuilAlerte) || []}
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
      <Tabs id="tour-produits-tabs" items={tabItems} />

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
              label="Reference"
              rules={[{ required: true, message: "Reference requise" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="nom"
              label="Nom"
              rules={[{ required: true, message: "Nom requis" }]}
            >
              <Input />
            </Form.Item>
          </div>
          <Form.Item
            name="categorieId"
            label="Categorie"
            rules={[{ required: true, message: "Categorie requise" }]}
          >
            <Select placeholder="Choisir une categorie">
              {categories?.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.nom}
                </Select.Option>
              ))}
            </Select>
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
            <Form.Item name="stockActuel" label="Stock initial">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="seuilAlerte" label="Seuil alerte">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="unite" label="Unite">
              <Select>
                <Select.Option value="unite">Unite</Select.Option>
                <Select.Option value="kg">Kg</Select.Option>
                <Select.Option value="litre">Litre</Select.Option>
                <Select.Option value="carton">Carton</Select.Option>
                <Select.Option value="bouteille">Bouteille</Select.Option>
                <Select.Option value="pack">Pack</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingProduit ? "Modifier" : "Creer"}
              </Button>
              <Button onClick={closeModal}>Annuler</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
