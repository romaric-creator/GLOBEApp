import { Tabs } from 'antd';
import EmployesTab from './EmployesTab';
import PointagesTab from './PointagesTab';
import CongesTab from './CongesTab';

export default function PersonnelPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Personnel</h1>
      <Tabs
        defaultActiveKey="employes"
        items={[
          { key: 'employes', label: 'Employes', children: <EmployesTab /> },
          { key: 'pointages', label: 'Pointages', children: <PointagesTab /> },
          { key: 'conges', label: 'Conges', children: <CongesTab /> },
        ]}
      />
    </div>
  );
}
