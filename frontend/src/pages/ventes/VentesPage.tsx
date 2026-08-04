import { Tabs } from 'antd';
import VentesTab from './VentesTab';
import CaisseTab from './CaisseTab';
import CreancesTab from './CreancesTab';
import NouvelleVenteTab from './NouvelleVenteTab';

export default function VentesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Ventes & Caisse</h1>
      <Tabs
        defaultActiveKey="nouvelle"
        items={[
          { key: 'nouvelle', label: 'Nouvelle Vente', children: <NouvelleVenteTab /> },
          { key: 'historique', label: 'Historique Ventes', children: <VentesTab /> },
          { key: 'caisse', label: 'Caisse', children: <CaisseTab /> },
          { key: 'creances', label: 'Creances', children: <CreancesTab /> },
        ]}
      />
    </div>
  );
}
