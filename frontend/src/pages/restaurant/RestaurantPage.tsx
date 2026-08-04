import { Tabs } from 'antd';
import TablesTab from './TablesTab';
import CommandesTab from './CommandesTab';

export default function RestaurantPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Bar & Restaurant</h2>
      <Tabs
        defaultActiveKey="tables"
        items={[
          { key: 'tables', label: 'Tables', children: <TablesTab /> },
          { key: 'commandes', label: 'Commandes', children: <CommandesTab /> },
        ]}
      />
    </div>
  );
}
