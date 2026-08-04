import { Tabs } from 'antd';
import ChambresTab from './ChambresTab';
import ReservationsTab from './ReservationsTab';

export default function HotelPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Hotel</h2>
      <Tabs
        defaultActiveKey="chambres"
        items={[
          { key: 'chambres', label: 'Chambres', children: <ChambresTab /> },
          { key: 'reservations', label: 'Reservations', children: <ReservationsTab /> },
        ]}
      />
    </div>
  );
}
