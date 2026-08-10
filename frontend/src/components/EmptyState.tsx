import { Button, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export default function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <Empty
      image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div className="text-center">
          <p className="text-base font-medium text-slate-600 mb-1">{title}</p>
          {description && <p className="text-sm text-slate-400">{description}</p>}
        </div>
      }
    >
      {actionLabel && onAction && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Empty>
  );
}
