import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Row, Col, Statistic, Table, DatePicker, Select, Tabs, Button, Tooltip, Dropdown } from 'antd';
import { TeamOutlined, HomeOutlined, RiseOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { rapportsApi } from '../../api/rapports';
import dayjs from 'dayjs';
import { exportToExcel, exportToPDF } from '../../utils/export';

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => String(r[h] ?? '')).join(';')),
  ].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RapportsPage() {
  const now = dayjs();
  const [mois, setMois] = useState(now.month() + 1);
  const [annee, setAnnee] = useState(now.year());
  const [caDateDebut, setCaDateDebut] = useState(now.startOf('month').format('YYYY-MM-DD'));
  const [caDateFin, setCaDateFin] = useState(now.endOf('month').format('YYYY-MM-DD'));

  const { data: ca } = useQuery({
    queryKey: ['rapport-ca', caDateDebut, caDateFin],
    queryFn: () => rapportsApi.getChiffreAffaires(caDateDebut, caDateFin),
  });

  const { data: occupation } = useQuery({
    queryKey: ['rapport-occupation', caDateDebut, caDateFin],
    queryFn: () => rapportsApi.getOccupation(caDateDebut, caDateFin),
  });

  const { data: topProduits } = useQuery({
    queryKey: ['rapport-top-produits'],
    queryFn: () => rapportsApi.getTopProduits(10),
  });

  const { data: personnel } = useQuery({
    queryKey: ['rapport-personnel'],
    queryFn: rapportsApi.getResumePersonnel,
  });

  const { data: resumeMensuel } = useQuery({
    queryKey: ['rapport-mensuel', mois, annee],
    queryFn: () => rapportsApi.getResumeMensuel(mois, annee),
  });

  const tabItems = [
    {
      key: 'ca',
      label: "Chiffre d'affaires",
      children: (
        <>
          <div className="mb-4 flex gap-3 items-center">
            <DatePicker.RangePicker
              defaultValue={[dayjs(caDateDebut), dayjs(caDateFin)]}
              onChange={(dates) => {
                if (dates) {
                  setCaDateDebut(dates[0]?.format('YYYY-MM-DD') || caDateDebut);
                  setCaDateFin(dates[1]?.format('YYYY-MM-DD') || caDateFin);
                }
              }}
            />
            <Dropdown menu={{ items: [
              { key: 'csv', label: 'CSV', onClick: () => exportCSV('ca.csv', [
                { Module: 'Hotel', CA: ca?.hotel || 0 },
                { Module: 'Restaurant', CA: ca?.restaurant || 0 },
                { Module: 'Piscine', CA: ca?.piscine || 0 },
                { Module: 'Salle de fete', CA: ca?.salle_fete || 0 },
                { Module: 'Total', CA: ca?.total || 0 },
              ])},
              { key: 'excel', label: 'Excel', onClick: () => exportToExcel([
                { Module: 'Hotel', CA: ca?.hotel || 0 },
                { Module: 'Restaurant', CA: ca?.restaurant || 0 },
                { Module: 'Piscine', CA: ca?.piscine || 0 },
                { Module: 'Salle de fete', CA: ca?.salle_fete || 0 },
                { Module: 'Total', CA: ca?.total || 0 },
              ], 'chiffre-affaires', 'CA')},
              { key: 'pdf', label: 'PDF', onClick: () => exportToPDF(
                [{ header: 'Module', dataKey: 'Module' }, { header: 'CA (FCFA)', dataKey: 'CA' }],
                [
                  { Module: 'Hotel', CA: ca?.hotel || 0 },
                  { Module: 'Restaurant', CA: ca?.restaurant || 0 },
                  { Module: 'Piscine', CA: ca?.piscine || 0 },
                  { Module: 'Salle de fete', CA: ca?.salle_fete || 0 },
                  { Module: 'Total', CA: ca?.total || 0 },
                ],
                'chiffre-affaires',
                `Chiffre d'affaires — ${caDateDebut} au ${caDateFin}`,
              )},
            ]}}>
              <Button icon={<DownloadOutlined />}>Exporter</Button>
            </Dropdown>
          </div>
          <Row gutter={16}>
            <Col span={5}><Card><Statistic title="Hotel" value={ca?.hotel || 0} suffix="FCFA" prefix={<HomeOutlined />} /></Card></Col>
            <Col span={5}><Card><Statistic title="Restaurant" value={ca?.restaurant || 0} suffix="FCFA" /></Card></Col>
            <Col span={4}><Card><Statistic title="Piscine" value={ca?.piscine || 0} suffix="FCFA" /></Card></Col>
            <Col span={5}><Card><Statistic title="Salle de fete" value={ca?.salle_fete || 0} suffix="FCFA" /></Card></Col>
            <Col span={5}><Card><Statistic title="Total" value={ca?.total || 0} suffix="FCFA" styles={{ content: { color: '#3f8600' } }} prefix={<RiseOutlined />} /></Card></Col>
          </Row>
        </>
      ),
    },
    {
      key: 'occupation',
      label: 'Occupation Hotel',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Card><Statistic title="Chambres totales" value={occupation?.totalChambres || 0} prefix={<HomeOutlined />} /></Card>
          </Col>
          <Col span={8}>
            <Card><Statistic title="Occupees" value={occupation?.chambresOccupees || 0} /></Card>
          </Col>
          <Col span={8}>
            <Card><Statistic title="Taux d'occupation" value={occupation?.tauxOccupation || 0} suffix="%" styles={{ content: { color: (occupation?.tauxOccupation || 0) > 70 ? '#3f8600' : '#cf1322' } }} /></Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'produits',
      label: 'Top Produits',
      children: (
        <>
          <div className="flex justify-end mb-3">
            <Dropdown menu={{ items: [
              { key: 'csv', label: 'CSV', onClick: () => exportCSV('top-produits.csv', (topProduits || []).map((p, i) => ({ Rang: i + 1, Produit: p.nom, 'Quantite vendue': p.quantiteVendue })))},
              { key: 'excel', label: 'Excel', onClick: () => exportToExcel((topProduits || []).map((p, i) => ({ Rang: i + 1, Produit: p.nom, 'Quantite vendue': p.quantiteVendue })), 'top-produits', 'Top Produits')},
              { key: 'pdf', label: 'PDF', onClick: () => exportToPDF(
                [{ header: 'Rang', dataKey: 'Rang' }, { header: 'Produit', dataKey: 'Produit' }, { header: 'Quantite vendue', dataKey: 'Quantite vendue' }],
                (topProduits || []).map((p, i) => ({ Rang: i + 1, Produit: p.nom, 'Quantite vendue': p.quantiteVendue })),
                'top-produits', 'Top 10 produits vendus',
              )},
            ]}}>
              <Button icon={<DownloadOutlined />}>Exporter</Button>
            </Dropdown>
          </div>
          <Table
            dataSource={topProduits || []}
            columns={[
              { title: '#', key: 'rank', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
              { title: 'Produit', dataIndex: 'nom', key: 'nom' },
              { title: 'Quantite vendue', dataIndex: 'quantiteVendue', key: 'quantiteVendue' },
            ]}
            rowKey="produitId"
            size="small"
            pagination={false}
          />
        </>
      ),
    },
    {
      key: 'personnel',
      label: 'Personnel',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Card><Statistic title="Effectif total" value={personnel?.effectifTotal || 0} prefix={<TeamOutlined />} /></Card>
          </Col>
          <Col span={8}>
            <Card><Statistic title="Presents aujourd'hui" value={personnel?.presentsAujourdhui || 0} styles={{ content: { color: '#3f8600' } }} /></Card>
          </Col>
          <Col span={8}>
            <Card><Statistic title="En conge" value={personnel?.enConge || 0} styles={{ content: { color: '#faad14' } }} /></Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'mensuel',
      label: 'Resume mensuel',
      children: (
        <>
          <div className="mb-4 flex gap-3 items-center">
            <Select
              value={mois}
              onChange={setMois}
              style={{ width: 120 }}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: dayjs().month(i).format('MMMM'),
              }))}
            />
            <Select
              value={annee}
              onChange={setAnnee}
              style={{ width: 100 }}
              options={Array.from({ length: 5 }, (_, i) => ({
                value: now.year() - 2 + i,
                label: `${now.year() - 2 + i}`,
              }))}
            />
            <Dropdown menu={{ items: [
              { key: 'csv', label: 'CSV', onClick: () => exportCSV(`resume-${annee}-${mois}.csv`, resumeMensuel ? [{ 'CA Total': resumeMensuel.caTotal, 'Depenses': resumeMensuel.depenses, 'Benefice': resumeMensuel.benefice, 'Nb Commandes': resumeMensuel.nbCommandes, 'Reservations': resumeMensuel.nbReservations }] : [])},
              { key: 'excel', label: 'Excel', onClick: () => exportToExcel(resumeMensuel ? [{ 'CA Total': resumeMensuel.caTotal, 'Depenses': resumeMensuel.depenses, 'Benefice': resumeMensuel.benefice, 'Nb Commandes': resumeMensuel.nbCommandes, 'Reservations': resumeMensuel.nbReservations }] : [], `resume-${annee}-${String(mois).padStart(2, '0')}`, 'Resume')},
              { key: 'pdf', label: 'PDF', onClick: () => exportToPDF(
                [{ header: 'CA Total', dataKey: 'CA Total' }, { header: 'Depenses', dataKey: 'Depenses' }, { header: 'Benefice', dataKey: 'Benefice' }, { header: 'Commandes', dataKey: 'Nb Commandes' }, { header: 'Reservations', dataKey: 'Reservations' }],
                resumeMensuel ? [{ 'CA Total': resumeMensuel.caTotal, 'Depenses': resumeMensuel.depenses, 'Benefice': resumeMensuel.benefice, 'Nb Commandes': resumeMensuel.nbCommandes, 'Reservations': resumeMensuel.nbReservations }] : [],
                `resume-${annee}-${String(mois).padStart(2, '0')}`,
                `Resume mensuel — ${mois}/${annee}`,
              )},
            ]}}>
              <Button icon={<DownloadOutlined />}>Exporter</Button>
            </Dropdown>
            <Tooltip title="Imprimer cette page">
              <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Imprimer</Button>
            </Tooltip>
          </div>
          <Row gutter={16}>
            <Col span={5}><Card><Statistic title="CA Total" value={resumeMensuel?.caTotal || 0} suffix="FCFA" styles={{ content: { color: '#3f8600' } }} /></Card></Col>
            <Col span={5}><Card><Statistic title="Depenses" value={resumeMensuel?.depenses || 0} suffix="FCFA" styles={{ content: { color: '#cf1322' } }} /></Card></Col>
            <Col span={5}><Card><Statistic title="Benefice" value={resumeMensuel?.benefice || 0} suffix="FCFA" /></Card></Col>
            <Col span={5}><Card><Statistic title="Nb Commandes" value={resumeMensuel?.nbCommandes || 0} /></Card></Col>
            <Col span={4}><Card><Statistic title="Reservations" value={resumeMensuel?.nbReservations || 0} /></Card></Col>
          </Row>
        </>
      ),
    },
  ];

  return (
    <div id="tour-rapports-page">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold m-0">Rapports & Statistiques</h2>
          <p className="text-slate-400 text-sm m-0">KPIs agregees en lecture seule — Pour les recettes detaillees, depenses et tresorerie : voir Comptabilite</p>
        </div>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Imprimer</Button>
      </div>
      <Tabs id="tour-rapports-tabs" items={tabItems} />
    </div>
  );
}
