import { useState } from 'react';
import { Tag, Select, Empty, Skeleton, Tooltip } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import BottleImage from './BottleImage';
import type { Produit, Categorie } from '../../api/produits';

interface BoissonsGridProps {
  produits: Produit[];
  categories: Categorie[];
  loading?: boolean;
  onEdit: (produit: Produit) => void;
}

export default function BoissonsGrid({ produits, categories, loading, onEdit }: BoissonsGridProps) {
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(null);

  const boissonsParent = categories.find(
    (c) => c.nom.toLowerCase() === 'boissons' && !c.parentId
  );
  const restaurantParent = categories.find(
    (c) => c.nom.toLowerCase() === 'restaurant' && !c.parentId
  );
  const subCategories = categories.filter((c) => c.parentId && c.parentId !== restaurantParent?.id);
  const boissonsCategories = boissonsParent
    ? categories.filter((c) => c.parentId === boissonsParent.id)
    : subCategories;

  const filtered = selectedCategorie
    ? produits.filter((p) => p.categorieId === selectedCategorie)
    : produits;

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 flex flex-col items-center">
            <Skeleton.Image active style={{ width: 50, height: 80, marginBottom: 12 }} />
            <Skeleton active paragraph={{ rows: 2, width: ['80%', '60%'] }} title={false} />
          </div>
        ))}
      </div>
    );
  }

  if (!produits.length) {
    return <Empty description="Aucun produit boisson" />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600 font-medium">Filtrer :</span>
        <Select
          allowClear
          placeholder="Toutes les categories"
          style={{ width: 200 }}
          onChange={(value) => setSelectedCategorie(value || null)}
          value={selectedCategorie}
        >
          {boissonsCategories.map((cat) => (
            <Select.Option key={cat.id} value={cat.id}>
              {cat.nom}
            </Select.Option>
          ))}
        </Select>
        <span className="text-sm text-gray-500">
          {filtered.length} produit{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filtered.map((produit) => {
          const isLowStock = produit.stockActuel <= produit.seuilAlerte;

          return (
            <Tooltip key={produit.id} title={produit.nom} mouseEnterDelay={0.4}>
              <div
                role="button"
                tabIndex={0}
                aria-label={`${produit.nom}, ${produit.prixVente} FCFA, stock : ${produit.stockActuel} ${produit.unite}`}
                onClick={() => onEdit(produit)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEdit(produit); }}
                className="relative group cursor-pointer rounded-xl border border-gray-200 bg-white p-4
                           flex flex-col items-center transition-all duration-200 outline-none
                           hover:shadow-lg hover:border-amber-300 hover:-translate-y-1
                           focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:border-amber-400"
              >
                {isLowStock && (
                  <div className="absolute top-2 right-2">
                    <WarningOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />
                  </div>
                )}

                <div className="mb-3 transform group-hover:scale-105 transition-transform">
                  <BottleImage
                    categorie={produit.categorie?.nom || ''}
                    productName={produit.nom}
                    style={{ width: 50, height: 90 }}
                  />
                </div>

                <div className="text-center w-full space-y-1">
                  <p
                    className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 min-h-[2rem]"
                    title={produit.nom}
                  >
                    {produit.nom}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {produit.categorie?.nom}
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#C9A84C' }}>
                    {Number(produit.prixVente).toLocaleString()} FCFA
                  </p>
                  <div>
                    <Tag
                      color={isLowStock ? 'red' : 'green'}
                      className="text-[11px] m-0"
                    >
                      Stock: {produit.stockActuel} {produit.unite}
                    </Tag>
                  </div>
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
