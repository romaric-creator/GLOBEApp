import { Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import ChambresTab from './ChambresTab';
import ReservationsTab from './ReservationsTab';
import FacturesTab from './FacturesTab';

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
          { key: 'factures', label: 'Factures & Tranches', children: <FacturesTab /> },
          { key: 'chambres', label: 'Chambres', children: <ChambresTab /> },
        ]}
      />
    </div>
  );
}
