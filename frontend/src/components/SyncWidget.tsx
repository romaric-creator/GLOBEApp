import { useState } from 'react';
import { Button, Tooltip, Badge, Modal, Table, Tag, App, Statistic, Row, Col, Typography, Divider } from 'antd';
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, CloudSyncOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '../api/sync';
import type { SyncLog } from '../api/sync';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Text } = Typography;

export function SyncWidget() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => syncApi.getStatus().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: logs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: () => syncApi.getLogs(20).then((r) => r.data),
    enabled: open,
  });

  const { mutate: sync, isPending } = useMutation({
    mutationFn: () => syncApi.push().then((r) => r.data),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['sync-status'] });
      void qc.invalidateQueries({ queryKey: ['sync-logs'] });
      if (result.success) {
        message.success(`Synchronisation réussie : ${result.nbEnvois} enregistrement(s) envoyé(s).`);
      } else {
        message.error(result.erreur ?? 'La synchronisation a échoué.');
      }
    },
    onError: () => message.error('Impossible de synchroniser. Vérifiez votre connexion réseau.'),
  });

  const dernierStatut = status?.dernierSync?.statut;
  const badgeStatus =
    dernierStatut === 'REUSSIE' ? 'success' :
    dernierStatut === 'ECHOUEE' ? 'error' :
    dernierStatut === 'EN_COURS' ? 'processing' : 'default';

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 100,
      render: (v: SyncLog['statut']) => (
        <Tag
          icon={v === 'REUSSIE' ? <CheckCircleOutlined /> : v === 'ECHOUEE' ? <CloseCircleOutlined /> : <SyncOutlined spin />}
          color={v === 'REUSSIE' ? 'green' : v === 'ECHOUEE' ? 'red' : 'blue'}
        >
          {v}
        </Tag>
      ),
    },
    { title: 'Envoyés', dataIndex: 'nbEnvois', key: 'nbEnvois', width: 80, align: 'right' as const },
    {
      title: 'Erreur',
      dataIndex: 'erreur',
      key: 'erreur',
      render: (err: string) => err ? <Text type="danger" style={{ fontSize: 11 }}>{err}</Text> : '—',
    },
  ];

  return (
    <>
      <Tooltip
        title={
          !status?.remoteConfigure
            ? 'Synchronisation non configurée'
            : (status.nbEnAttente ?? 0) > 0
            ? `${status.nbEnAttente} enregistrements non synchronisés`
            : status.dernierSync
            ? `Dernière sync ${dayjs(status.dernierSync.createdAt).fromNow()}`
            : 'Synchronisation disponible'
        }
      >
        <Badge count={status?.nbEnAttente ?? 0} size="small" offset={[-4, 4]}>
          <Button
            type="text"
            size="small"
            icon={<Badge status={!status?.remoteConfigure ? 'default' : badgeStatus} />}
            onClick={() => setOpen(true)}
            style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}
          >
            Sync
          </Button>
        </Badge>
      </Tooltip>

      <Modal
        title={<><CloudSyncOutlined /> Synchronisation cloud</>}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={720}
      >
        {!status?.remoteConfigure ? (
          <div style={{ padding: '16px 0', color: 'rgba(0,0,0,0.45)', textAlign: 'center' }}>
            La synchronisation n'est pas configurée. Allez dans Paramètres → Synchronisation pour configurer la base distante.
          </div>
        ) : (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic
                  title="En attente"
                  value={status.nbEnAttente}
                  valueStyle={{ color: status.nbEnAttente > 0 ? '#C9A84C' : '#52c41a', fontSize: 20 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Dernière sync"
                  value={status.dernierSync ? dayjs(status.dernierSync.createdAt).fromNow() : 'Jamais'}
                  valueStyle={{ fontSize: 14 }}
                />
              </Col>
              <Col span={8}>
                {status.dernierSync && (
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Statut</div>
                    <Tag
                      icon={
                        status.dernierSync.statut === 'REUSSIE' ? <CheckCircleOutlined /> :
                        status.dernierSync.statut === 'ECHOUEE' ? <CloseCircleOutlined /> :
                        <SyncOutlined spin />
                      }
                      color={
                        status.dernierSync.statut === 'REUSSIE' ? 'green' :
                        status.dernierSync.statut === 'ECHOUEE' ? 'red' : 'blue'
                      }
                    >
                      {status.dernierSync.statut}
                      {status.dernierSync.nbEnvois > 0 && ` · ${status.dernierSync.nbEnvois} envoyé(s)`}
                    </Tag>
                    {status.dernierSync.erreur && (
                      <div style={{ marginTop: 4, fontSize: 11, color: '#ff4d4f' }}>
                        {status.dernierSync.erreur}
                      </div>
                    )}
                  </div>
                )}
              </Col>
            </Row>

            <Button
              type="primary"
              icon={<SyncOutlined spin={isPending} />}
              loading={isPending}
              onClick={() => sync()}
              disabled={status.nbEnAttente === 0}
            >
              Synchroniser maintenant
              {status.nbEnAttente > 0 && ` (${status.nbEnAttente})`}
            </Button>
          </>
        )}

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Historique</div>
        <Table
          dataSource={logs ?? []}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: 'Aucune synchronisation enregistrée' }}
        />
      </Modal>
    </>
  );
}
