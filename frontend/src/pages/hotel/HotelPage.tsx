import { Tabs } from 'antd';
import ChambresTab from './ChambresTab';
import ReservationsTab from './ReservationsTab';

export default function HotelPage() {
  return (
    <div>
      <Tabs
        defaultActiveKey="reservations"
        items={[
          { key: 'reservations', label: 'Reservations', children: <ReservationsTab /> },
          { key: 'chambres', label: 'Chambres', children: <ChambresTab /> },
        ]}
      />
    </div>
  );
}
