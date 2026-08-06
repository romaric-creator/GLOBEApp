import { Tabs, Badge } from 'antd';
import { useQuery } from '@tanstack/react-query';
import VentesTab from './VentesTab';
import CaisseTab from './CaisseTab';
import CreancesTab from './CreancesTab';
import NouvelleVenteTab from './NouvelleVenteTab';
import { ventesApi } from '../../api/ventes';

export default function VentesPage() {
  const { data: creances } = useQuery({
    queryKey: ['creances-count'],
    queryFn: () => ventesApi.getCreances(),
  });

  const nbCreances = creances?.length || 0;

  return (
    <div>
      <Tabs
        defaultActiveKey="nouvelle"
        items={[
          { key: 'nouvelle', label: 'Nouvelle Vente', children: <NouvelleVenteTab /> },
          { key: 'historique', label: 'Historique', children: <VentesTab /> },
          { key: 'caisse', label: 'Caisse', children: <CaisseTab /> },
          {
            key: 'creances',
            label: <span>Creances {nbCreances > 0 && <Badge count={nbCreances} size="small" className="ml-1" />}</span>,
            children: <CreancesTab />,
          },
        ]}
      />
    </div>
  );
}
