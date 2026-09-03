import { Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import TicketsTab from './TicketsTab';
import AbonnementsTab from './AbonnementsTab';
import AccessoiresTab from './AccessoiresTab';

export default function PiscinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'tickets';

  return (
    <div id="tour-piscine-page">
      <h2 className="text-xl font-semibold mb-4">Piscine & Loisirs</h2>
      <Tabs
        id="tour-piscine-tabs"
        activeKey={activeTab}
        onChange={(key) => setSearchParams({ tab: key })}
        items={[
          { key: 'tickets', label: 'Tickets', children: <TicketsTab /> },
          { key: 'abonnements', label: 'Abonnements', children: <AbonnementsTab /> },
          { key: 'accessoires', label: 'Accessoires', children: <AccessoiresTab /> },
        ]}
      />
    </div>
  );
}
