import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Select, DatePicker, TimePicker, Tag, Card, Row, Col, Statistic, Alert, App, Divider } from 'antd';
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, ToolOutlined } from '@ant-design/icons';
import { personnelApi } from '../../api/personnel';
import type { Pointage, Presence } from '../../api/personnel';
import dayjs from 'dayjs';
import { getErrorMessage } from '../../api/errors';

export default function PointagesTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data: presences } = useQuery({
    queryKey: ['presences'],
    queryFn: personnelApi.getPresences,
  });

  const { data: employes } = useQuery({
    queryKey: ['employes'],
    queryFn: personnelApi.getEmployes,
  });

  const { data: pointages, isLoading } = useQuery({
    queryKey: ['pointages', selectedDate],
    queryFn: () => personnelApi.getPointages(selectedDate || undefined),
  });

  const createMutation = useMutation({
    mutationFn: personnelApi.createPointage,
    onSuccess: () => {
      message.success('Pointage enregistre');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['pointages'] });
      queryClient.invalidateQueries({ queryKey: ['presences'] });
    },
    onError: (err: unknown) => message.error(getErrorMessage(err)),
  });

  const nbPresents = presences?.filter((p: Presence) => p.present).length || 0;
  const nbAbsents = (presences?.length || 0) - nbPresents;

  const columns = [
    { title: 'Matricule', dataIndex: ['employe', 'matricule'], key: 'mat', width: 100 },
    {
      title: 'Employe',
      key: 'nom',
      render: (_: unknown, r: Pointage) => `${r.employe.nom} ${r.employe.prenom}`,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Arrivee',
      dataIndex: 'heureArrivee',
      key: 'arrivee',
      width: 80,
      render: (h: string | null) => h ? new Date(h).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '-',
    },
    {
      title: 'Depart',
      dataIndex: 'heureDepart',
      key: 'depart',
      width: 80,
      render: (h: string | null) => h ? new Date(h).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '-',
    },
    {
      title: 'Methode',
      dataIndex: 'methode',
      key: 'methode',
      width: 110,
      render: (m: string) => <Tag color={m === 'BIOMETRIQUE' ? 'gold' : 'default'}>{m}</Tag>,
    },
  ];

  return (
    <>
      <Alert
        message="Pointage biometrique en cours de construction"
        description="L'integration du lecteur d'empreintes digitales est prevue prochainement. En attendant, le pointage se fait manuellement."
        type="warning"
        showIcon
        icon={<ToolOutlined />}
        className="mb-4"
      />

      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card>
            <Statistic title="Presents aujourd'hui" value={nbPresents} prefix={<CheckCircleOutlined />} styles={{ content: { color: '#52c41a' } }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Absents" value={nbAbsents} prefix={<CloseCircleOutlined />} styles={{ content: { color: '#ff4d4f' } }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Presences du jour" size="small">
            {presences?.map((p: Presence) => (
              <Tag key={p.id} color={p.present ? 'green' : 'red'} className="mb-1">
                {p.matricule} - {p.nom}
              </Tag>
            ))}
          </Card>
        </Col>
      </Row>

      <div className="mb-3 flex gap-3">
        <DatePicker
          placeholder="Filtrer par date"
          onChange={(d) => setSelectedDate(d ? d.format('YYYY-MM-DD') : null)}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nouveau pointage
        </Button>
      </div>

      <Table
        dataSource={pointages || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
      />

      {(() => {
        const heuresPointage = (p: Pointage): number => {
          if (!p.heureArrivee || !p.heureDepart) return 0;
          const debut = new Date(p.heureArrivee);
          const fin = new Date(p.heureDepart);
          return Math.max(0, (fin.getTime() - debut.getTime()) / 3600000);
        };
        const recap: Record<string, { nom: string; jours: number; totalHeures: number }> = {};
        (pointages || []).forEach((p: Pointage) => {
          const key = p.employe.matricule;
          if (!recap[key]) recap[key] = { nom: `${p.employe.nom} ${p.employe.prenom}`, jours: 0, totalHeures: 0 };
          const h = heuresPointage(p);
          recap[key].jours += 1;
          recap[key].totalHeures += h;
        });
        const rows = Object.entries(recap).map(([id, v]) => ({ id, ...v }));
        if (rows.length === 0) return null;
        return (
          <>
            <Divider titlePlacement="left">Recapitulatif des heures ({selectedDate || 'Toutes periodes'})</Divider>
            <Table
              dataSource={rows}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: 'Employe', dataIndex: 'nom', key: 'nom' },
                { title: 'Nb jours', dataIndex: 'jours', key: 'jours', width: 90 },
                { title: 'Total heures', dataIndex: 'totalHeures', key: 'heures', width: 120, render: (h: number) => `${h.toFixed(1)}h` },
                { title: 'Moy / jour', key: 'moy', width: 100, render: (_: unknown, r: { jours: number; totalHeures: number }) => r.jours > 0 ? `${(r.totalHeures / r.jours).toFixed(1)}h` : '-' },
              ]}
            />
          </>
        );
      })()}

      <Modal
        title="Enregistrer un pointage"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            createMutation.mutate({
              employeId: values.employeId,
              date: values.date.format('YYYY-MM-DD'),
              heureArrivee: values.heureArrivee?.format('HH:mm'),
              heureDepart: values.heureDepart?.format('HH:mm'),
              methode: values.methode || 'MANUEL',
            });
          }}
        >
          <Form.Item name="employeId" label="Employe" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={employes?.filter((e) => e.actif).map((e) => ({
                value: e.id,
                label: `${e.matricule} - ${e.nom} ${e.prenom}`,
              })) || []}
            />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="heureArrivee" label="Heure d'arrivee">
            <TimePicker format="HH:mm" className="w-full" />
          </Form.Item>
          <Form.Item name="heureDepart" label="Heure de depart">
            <TimePicker format="HH:mm" className="w-full" />
          </Form.Item>
          <Form.Item name="methode" label="Methode" initialValue="MANUEL">
            <Select options={[
              { value: 'MANUEL', label: 'Manuel' },
              { value: 'BIOMETRIQUE', label: 'Biometrique' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
