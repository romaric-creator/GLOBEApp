import { Tabs } from 'antd';
import TicketsTab from './TicketsTab';
import AbonnementsTab from './AbonnementsTab';

export default function PiscinePage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Piscine & Loisirs</h2>
      <Tabs
        defaultActiveKey="tickets"
        items={[
          { key: 'tickets', label: 'Tickets', children: <TicketsTab /> },
          { key: 'abonnements', label: 'Abonnements', children: <AbonnementsTab /> },
        ]}
      />
    </div>
  );
}
