import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Select, DatePicker, TimePicker, Tag, Card, Row, Col, Statistic, Alert, App } from 'antd';
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, ToolOutlined } from '@ant-design/icons';
import { personnelApi } from '../../api/personnel';
import type { Pointage, Presence } from '../../api/personnel';
import dayjs from 'dayjs';

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
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Erreur');
    },
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
      render: (h: string | null) => h ? new Date(h).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
    },
    {
      title: 'Depart',
      dataIndex: 'heureDepart',
      key: 'depart',
      width: 80,
      render: (h: string | null) => h ? new Date(h).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
    },
    {
      title: 'Methode',
      dataIndex: 'methode',
      key: 'methode',
      width: 110,
      render: (m: string) => <Tag color={m === 'BIOMETRIQUE' ? 'blue' : 'default'}>{m}</Tag>,
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
            <Statistic title="Presents aujourd'hui" value={nbPresents} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Absents" value={nbAbsents} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
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
