import { useState } from 'react';
import { Button, Tooltip, Badge, Modal, Table, Tag, App } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '../api/sync';
import type { SyncLog } from '../api/sync';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

export function SyncWidget() {
  const { message } = App.useApp();
  const [logsOpen, setLogsOpen] = useState(false);
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => syncApi.getStatus().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: logs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: () => syncApi.getLogs(20).then((r) => r.data),
    enabled: logsOpen,
  });

  const { mutate: sync, isPending } = useMutation({
    mutationFn: () => syncApi.push().then((r) => r.data),
    onSuccess: (result) => {
      if (result.success) {
        message.success(`Synchronisation réussie : ${result.nbEnvois} enregistrement(s) envoyé(s).`);
      } else {
        message.error('La synchronisation a échoué. Veuillez réessayer.');
      }
      void qc.invalidateQueries({ queryKey: ['sync-status'] });
      void qc.invalidateQueries({ queryKey: ['sync-logs'] });
    },
    onError: () => message.error('Impossible de synchroniser. Vérifiez votre connexion réseau.'),
  });

  if (!status?.remoteConfigure) return null;

  const dernierStatut = status.dernierSync?.statut;
  const badgeStatus =
    dernierStatut === 'REUSSIE' ? 'success' :
    dernierStatut === 'ECHOUEE' ? 'error' :
    dernierStatut === 'EN_COURS' ? 'processing' : 'default';

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      render: (v: SyncLog['statut']) => (
        <Tag color={v === 'REUSSIE' ? 'green' : v === 'ECHOUEE' ? 'red' : 'blue'}>{v}</Tag>
      ),
    },
    { title: 'Envois', dataIndex: 'nbEnvois' },
    {
      title: 'Résultat',
      dataIndex: 'erreur',
      render: (err: string, row: SyncLog) =>
        err || row.details ? <span style={{ color: '#ff4d4f', fontSize: 11 }}>Échec</span> : '—',
    },
  ];

  return (
    <>
      <Tooltip
        title={
          status.nbEnAttente > 0
            ? `${status.nbEnAttente} enregistrements non synchronisés`
            : status.dernierSync
            ? `Dernière sync ${dayjs(status.dernierSync.createdAt).fromNow()}`
            : 'Jamais synchronisé'
        }
      >
        <Badge count={status.nbEnAttente} size="small" offset={[-4, 4]}>
          <Button
            type="text"
            size="small"
            icon={
              <Badge status={badgeStatus} />
            }
            loading={isPending}
            onClick={() => sync()}
            style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}
          >
            Sync
          </Button>
        </Badge>
      </Tooltip>

      <Button
        type="text"
        size="small"
        onClick={() => setLogsOpen(true)}
        style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, padding: '0 4px' }}
      >
        Historique
      </Button>

      <Modal
        title="Historique des synchronisations"
        open={logsOpen}
        onCancel={() => setLogsOpen(false)}
        footer={null}
        width={700}
      >
        <Table
          dataSource={logs ?? []}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </>
  );
}
