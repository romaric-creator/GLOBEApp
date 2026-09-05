import React from 'react';
import { App } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { getErrorMessage } from '../api/errors';

function ErrBody({ msg }: { msg: string }) {
  const [copied, setCopied] = React.useState(false);
  const display = msg.length > 280 ? msg.slice(0, 280) + '…' : msg;

  const copy = () => {
    navigator.clipboard.writeText(msg).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ flex: 1, lineHeight: 1.55, fontSize: 13, wordBreak: 'break-word' }}>
        {display}
      </span>
      <span
        onClick={copy}
        title={copied ? 'Copié !' : "Copier l'erreur"}
        style={{
          cursor: 'pointer',
          color: copied ? '#52c41a' : 'rgba(0,0,0,0.3)',
          flexShrink: 0,
          fontSize: 13,
          marginTop: 2,
          transition: 'color 0.2s',
        }}
      >
        {copied ? <CheckOutlined /> : <CopyOutlined />}
      </span>
    </div>
  );
}

export function useMsg() {
  const { notification, message } = App.useApp();

  return {
    err(error: unknown, title = 'Erreur') {
      const msg = typeof error === 'string' ? error : getErrorMessage(error);
      notification.error({
        message: title,
        description: <ErrBody msg={msg} />,
        placement: 'bottomRight',
        duration: 7,
      });
    },
    ok: (msg: string, duration = 3) => message.success(msg, duration),
    info: (msg: string) => message.info(msg),
    warn: (msg: string) => message.warning(msg),
  };
}
