import { Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import ChambresTab from './ChambresTab';
import ReservationsTab from './ReservationsTab';

export default function HotelPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'reservations';

  return (
    <div id="tour-hotel-page">
      <Tabs
        id="tour-hotel-tabs"
        activeKey={activeTab}
        onChange={(key) => setSearchParams({ tab: key })}
        items={[
          { key: 'reservations', label: 'Reservations', children: <ReservationsTab /> },
          { key: 'chambres', label: 'Chambres', children: <ChambresTab /> },
        ]}
      />
    </div>
  );
}
