import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Row, Col, Button, Modal, Form, Input, InputNumber, Tag, Statistic, App, Popconfirm } from 'antd';
import { PlusOutlined, CoffeeOutlined } from '@ant-design/icons';
import { restaurantApi } from '../../api/restaurant';
import type { TableResto } from '../../api/restaurant';

const STATUT_COLORS: Record<string, string> = {
  LIBRE: 'green',
  OCCUPEE: 'red',
  RESERVEE: 'blue',
};

export default function TablesTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: tables } = useQuery({
    queryKey: ['tables-resto'],
    queryFn: restaurantApi.getTables,
  });

  const { data: stats } = useQuery({
    queryKey: ['restaurant-stats'],
    queryFn: restaurantApi.getStats,
  });

  const createMutation = useMutation({
    mutationFn: restaurantApi.createTable,
    onSuccess: () => {
      message.success('Table creee');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['tables-resto'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: restaurantApi.deleteTable,
    onSuccess: () => {
      message.success('Table supprimee');
      queryClient.invalidateQueries({ queryKey: ['tables-resto'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
  });

  const zones = [...new Set((tables || []).map((t: TableResto) => t.zone).filter(Boolean))];

  return (
    <>
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card>
            <Statistic title="Total tables" value={stats?.totalTables || 0} prefix={<CoffeeOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Libres" value={stats?.tablesLibres || 0} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Occupees" value={stats?.tablesOccupees || 0} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="CA du jour" value={stats?.caJour || 0} suffix="FCFA" />
          </Card>
        </Col>
      </Row>

      <div className="mb-3">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouvelle table
        </Button>
      </div>

      {zones.length > 0 ? (
        zones.map((zone) => (
          <div key={zone as string} className="mb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">{zone as string}</h4>
            <Row gutter={[12, 12]}>
              {(tables || [])
                .filter((t: TableResto) => t.zone === zone)
                .map((t: TableResto) => (
                  <Col key={t.id} span={4}>
                    <Card
                      size="small"
                      title={`Table ${t.numero}`}
                      extra={<Tag color={STATUT_COLORS[t.statut]}>{t.statut}</Tag>}
                      actions={[
                        <Popconfirm key="del" title="Supprimer ?" onConfirm={() => deleteMutation.mutate(t.id)}>
                          <Button type="text" size="small" danger>Suppr.</Button>
                        </Popconfirm>,
                      ]}
                    >
                      <p className="text-xs text-gray-500 m-0">{t.capacite} places</p>
                      {t.commandes.length > 0 && (
                        <p className="text-xs m-0 mt-1">{t.commandes.length} cmd en cours</p>
                      )}
                    </Card>
                  </Col>
                ))}
            </Row>
          </div>
        ))
      ) : (
        <Row gutter={[12, 12]}>
          {(tables || []).map((t: TableResto) => (
            <Col key={t.id} span={4}>
              <Card
                size="small"
                title={`Table ${t.numero}`}
                extra={<Tag color={STATUT_COLORS[t.statut]}>{t.statut}</Tag>}
                actions={[
                  <Popconfirm key="del" title="Supprimer ?" onConfirm={() => deleteMutation.mutate(t.id)}>
                    <Button type="text" size="small" danger>Suppr.</Button>
                  </Popconfirm>,
                ]}
              >
                <p className="text-xs text-gray-500 m-0">{t.capacite} places</p>
                {t.commandes.length > 0 && (
                  <p className="text-xs m-0 mt-1">{t.commandes.length} cmd en cours</p>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="Nouvelle table"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="numero" label="Numero" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="capacite" label="Capacite (places)" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} className="w-full" />
          </Form.Item>
          <Form.Item name="zone" label="Zone (optionnel)">
            <Input placeholder="Terrasse, Interieur, Bar..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
