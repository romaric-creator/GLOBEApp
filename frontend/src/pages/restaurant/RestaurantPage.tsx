import { Tabs } from 'antd';
import CommandesTab from './CommandesTab';
import MenuTab from './MenuTab';

export default function RestaurantPage() {
  return (
    <div>
      <Tabs
        defaultActiveKey="commandes"
        items={[
          { key: 'commandes', label: 'Commandes', children: <CommandesTab /> },
          { key: 'menu', label: 'Menu', children: <MenuTab /> },
        ]}
      />
    </div>
  );
}
