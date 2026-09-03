import { Badge, Button, Popover, List, Tag, Empty } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNotificationsStore } from '../store/notifications';
import type { AppNotification } from '../store/notifications';
import api from '../api/axios';

const TYPE_COLORS: Record<string, string> = {
  RESERVATION_EXPIREE: 'orange',
  CAISSE_ALERTE: 'red',
  STOCK_ALERTE: 'gold',
  INFO: 'blue',
};

const TYPE_LABELS: Record<string, string> = {
  RESERVATION_EXPIREE: 'Reservation',
  CAISSE_ALERTE: 'Caisse',
  STOCK_ALERTE: 'Stock',
  INFO: 'Info',
};

export default function NotificationCenter() {
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const clear = useNotificationsStore((s) => s.clear);
  const unreadCount = items.filter((n) => !n.lu).length;

  const handleMarkRead = (id: string) => {
    markRead(id);
    api.patch(`/notifications/${id}/lire`).catch(() => {});
  };

  const handleMarkAllRead = () => {
    markAllRead();
    api.patch('/notifications/lire-tout').catch(() => {});
  };

  const handleClear = () => {
    clear();
    api.delete('/notifications/vider-tout').catch(() => {});
  };

  const content = (
    <div style={{ width: 360, maxHeight: 420, overflow: 'auto' }}>
      {items.length === 0 ? (
        <Empty description="Les notifications apparaitront ici en temps reel (alertes reservations, stock, caisse...)" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="flex justify-between items-center px-2 pb-2 border-b mb-2">
            <span className="text-xs text-slate-500">{items.length} notification(s)</span>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button size="small" type="link" icon={<CheckOutlined />} onClick={handleMarkAllRead}>
                  Tout lire
                </Button>
              )}
              <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={handleClear}>
                Vider
              </Button>
            </div>
          </div>
          <List
            size="small"
            dataSource={items}
            renderItem={(n: AppNotification) => (
              <List.Item
                key={n.id}
                className={`cursor-pointer ${!n.lu ? 'bg-blue-50' : ''}`}
                onClick={() => !n.lu && handleMarkRead(n.id)}
                style={{ padding: '8px 12px' }}
              >
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag color={TYPE_COLORS[n.type]} className="text-xs m-0">{TYPE_LABELS[n.type]}</Tag>
                    <span className="text-xs text-slate-400">
                      {new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!n.lu && <span className="w-2 h-2 rounded-full bg-blue-500 ml-auto" />}
                  </div>
                  <div className="text-sm font-medium">{n.titre}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                </div>
              </List.Item>
            )}
          />
        </>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title={null}
      trigger="click"
      placement="bottomRight"
      arrow={false}
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Popover>
  );
}
