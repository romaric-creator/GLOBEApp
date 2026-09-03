import { useState, useEffect, useCallback } from 'react';
import {
  Tabs,
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  Table,
  Tag,
  Space,
  Select,
  Statistic,
  Alert,
  Descriptions,
  Divider,
  Typography,
  Modal,
  Checkbox,
  App,
  Badge,
} from 'antd';
import {
  UserOutlined,
  CloudOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  PlusOutlined,
  LockOutlined,
  UnlockOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DesktopOutlined,
  GlobalOutlined,
  TeamOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { authApi } from '../../api/auth';
import { syncApi, type SyncLog } from '../../api/sync';
import { usersApi, type User, type CreateUserDto, type UpdateUserDto } from '../../api/users';
import { rolesApi, type Permission } from '../../api/roles';
import { useAuthStore } from '../../store/auth';

const { Text, Paragraph } = Typography;

const isDesktop = typeof (window as any).electronAPI !== 'undefined';
const eAPI = () => (window as any).electronAPI as any;

function parseDbError(error: string, ctx: { host?: string; port?: string | number; name?: string }): string {
  if (error.includes('ECONNREFUSED'))
    return `Impossible de joindre ${ctx.host}:${ctx.port}. Vérifiez que MySQL est démarré.`;
  if (error.includes('Access denied'))
    return 'Identifiants incorrects (utilisateur ou mot de passe).';
  if (error.includes('Unknown database'))
    return `La base "${ctx.name}" n'existe pas sur ce serveur.`;
  if (error.includes('ETIMEDOUT') || error.includes('timeout'))
    return `Délai dépassé pour ${ctx.host}:${ctx.port}. Vérifiez l'hôte et le port.`;
  if (error.includes('ENOTFOUND'))
    return `Hôte "${ctx.host}" introuvable. Vérifiez l'adresse.`;
  return error;
}

function useStatusAlert() {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });
  return {
    status,
    ok: (msg: string) => setStatus({ type: 'success', msg }),
    err: (msg: string) => setStatus({ type: 'error', msg }),
    clear: () => setStatus({ type: null, msg: '' }),
  };
}

// ─── Tab Compte ──────────────────────────────────────────────────────────────

function TabCompte({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [pwForm] = Form.useForm();
  const [profileForm] = Form.useForm();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.profile().then((r) => r.data),
  });

  useEffect(() => {
    if (profile) {
      profileForm.setFieldsValue({
        nom: profile.nom,
        prenom: profile.prenom,
        telephone: profile.telephone ?? '',
      });
    }
  }, [profile, profileForm]);

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      message.success('Mot de passe modifié avec succès');
      pwForm.resetFields();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Mot de passe actuel incorrect');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateUserDto) => usersApi.update(userId, data),
    onSuccess: () => {
      message.success('Profil mis à jour');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => message.error('Impossible de mettre à jour le profil. Veuillez réessayer.'),
  });

  return (
    <Row gutter={[16, 16]}>
      {/* Modifier le profil — admin uniquement car PATCH /users/:id est restreint */}
      {isAdmin && (
        <Col xs={24} lg={12}>
          <Card title={<Space><UserOutlined /> Mon profil</Space>} loading={profileLoading}>
            {profile && (
              <>
                <Descriptions column={1} size="middle" className="mb-4">
                  <Descriptions.Item label="Email">
                    <Text>{profile.email}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Rôle">
                    <Tag color="gold">{profile.role}</Tag>
                  </Descriptions.Item>
                </Descriptions>
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={(values) => updateProfileMutation.mutate(values)}
                  size="middle"
                >
                  <Row gutter={8}>
                    <Col span={12}>
                      <Form.Item name="nom" label="Nom" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="prenom" label="Prénom" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="telephone" label="Téléphone">
                    <Input />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="middle"
                    loading={updateProfileMutation.isPending}
                  >
                    Enregistrer
                  </Button>
                </Form>
              </>
            )}
          </Card>
        </Col>
      )}

      {/* Changer le mot de passe — tous les utilisateurs */}
      <Col xs={24} lg={isAdmin ? 12 : 16}>
        <Card title={<Space><LockOutlined /> Changer le mot de passe</Space>}>
          <Form
            form={pwForm}
            layout="vertical"
            onFinish={(values) =>
              changePasswordMutation.mutate({
                ancienMotDePasse: values.ancienMotDePasse,
                nouveauMotDePasse: values.nouveauMotDePasse,
              })
            }
            size="middle"
          >
            <Form.Item
              name="ancienMotDePasse"
              label="Mot de passe actuel"
              rules={[{ required: true }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="nouveauMotDePasse"
              label="Nouveau mot de passe"
              rules={[{ required: true }, { min: 6, message: 'Minimum 6 caractères' }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="confirmation"
              label="Confirmation"
              dependencies={['nouveauMotDePasse']}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('nouveauMotDePasse') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="middle"
              loading={changePasswordMutation.isPending}
            >
              Modifier le mot de passe
            </Button>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}

// ─── Tab Synchronisation ──────────────────────────────────────────────────────

function TabSync({ isAdmin }: { isAdmin: boolean }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [syncForm] = Form.useForm();
  const [savingSync, setSavingSync] = useState(false);
  const [testingRemote, setTestingRemote] = useState(false);
  const remote = useStatusAlert();
  const [syncConfigLoaded, setSyncConfigLoaded] = useState(false);
  const [urlConfigured, setUrlConfigured] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPwd, setConfirmPwd] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const api = eAPI();
    if (api) {
      api.getConfig().then((cfg: any) => {
        const url = cfg.remote_db_url || '';
        syncForm.setFieldsValue({ remote_db_url: url });
        setUrlConfigured(!!url);
      }).catch(() => {}).finally(() => setSyncConfigLoaded(true));
    } else {
      syncApi.getRemoteConfig().then((r) => {
        const url = r.data.connectionUrl || '';
        syncForm.setFieldsValue({ remote_db_url: url });
        setUrlConfigured(!!url);
      }).catch(() => {}).finally(() => setSyncConfigLoaded(true));
    }
  }, [syncForm, isAdmin]);

  const handleConfirmAdmin = async () => {
    if (!user?.email || !confirmPwd) return;
    setConfirmLoading(true);
    try {
      await authApi.login({ email: user.email, password: confirmPwd });
      setIsEditingUrl(true);
      setConfirmOpen(false);
      setConfirmPwd('');
    } catch {
      message.error('Mot de passe incorrect.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleTestRemote = async () => {
    try {
      await syncForm.validateFields(['remote_db_url']);
    } catch { return; }
    const values = syncForm.getFieldsValue();
    setTestingRemote(true);
    remote.clear();
    try {
      const result = await syncApi.testConnection({
        connectionUrl: values.remote_db_url,
      }).then((r) => r.data);
      if (result.ok) {
        remote.ok('Connexion à la base distante réussie.');
      } else {
        remote.err(parseDbError(result.erreur || 'Connexion échouée.', {
          host: values.remote_db_host,
          port: values.remote_db_port,
          name: values.remote_db_name,
        }));
      }
    } catch {
      remote.err('Impossible de joindre le serveur.');
    } finally {
      setTestingRemote(false);
    }
  };

  const handleSaveSync = async (values: any) => {
    setSavingSync(true);
    try {
      const url = values.remote_db_url || '';
      const api = eAPI();
      if (api) {
        const current = await api.getConfig();
        await api.saveConfig({ ...current, remote_db_url: url });
        message.success('Configuration enregistrée. Redémarrez pour appliquer.');
      } else {
        await syncApi.saveRemoteConfig(url);
        message.success('Configuration enregistrée.');
        queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      }
    } catch {
      message.error('Impossible de sauvegarder la configuration.');
    } finally {
      setSavingSync(false);
    }
  };

  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => syncApi.getStatus().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: syncLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: () => syncApi.getLogs(20).then((r) => r.data),
  });

  const initSchemaMutation = useMutation({
    mutationFn: () => syncApi.initSchema().then((r) => r.data),
    onSuccess: (data) => {
      if (data.ok) {
        message.success('Schéma appliqué sur la base distante.');
      } else {
        message.error(`Échec : ${data.message}`);
      }
    },
    onError: () => message.error('Impossible d\'initialiser le schéma.'),
  });

  const backupMutation = useMutation({
    mutationFn: () => syncApi.backupAll().then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      if (data.ok) {
        message.success(`Sauvegarde complète : ${data.nbEnvois} enregistrement(s) copiés.`);
      } else {
        message.error(`Sauvegarde échouée : ${data.erreur}`);
      }
    },
    onError: () => message.error('Impossible de lancer la sauvegarde.'),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncApi.push().then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      if (data.success) {
        message.success(`Synchronisation réussie : ${data.nbEnvois} enregistrement(s) envoyé(s).`);
      } else {
        message.error('La synchronisation a échoué. Veuillez réessayer.');
      }
    },
    onError: () => message.error('Impossible de joindre le serveur de synchronisation'),
  });

  const logColumns: ColumnsType<SyncLog> = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (d: string) =>
        new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 110,
      render: (s: string) => (
        <Tag
          icon={
            s === 'REUSSIE' ? (
              <CheckCircleOutlined />
            ) : s === 'ECHOUEE' ? (
              <CloseCircleOutlined />
            ) : (
              <SyncOutlined spin />
            )
          }
          color={s === 'REUSSIE' ? 'success' : s === 'ECHOUEE' ? 'error' : 'processing'}
        >
          {s}
        </Tag>
      ),
    },
    {
      title: 'Envoyés',
      dataIndex: 'nbEnvois',
      key: 'nbEnvois',
      width: 90,
      align: 'right',
    },
    {
      title: 'Résultat',
      dataIndex: 'erreur',
      key: 'erreur',
      render: (e: string | undefined) =>
        e ? <Text type="danger" style={{ fontSize: 11 }}>Échec</Text> : '—',
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {/* Configuration base distante — admin uniquement */}
      {isAdmin && (
        <Col xs={24}>
          <Card
            title={<Space><CloudOutlined /> Base de données distante (MySQL)</Space>}
            loading={!syncConfigLoaded}
            size="small"
          >
            <Form
              form={syncForm}
              layout="vertical"
              onFinish={handleSaveSync}
              onValuesChange={remote.clear}
            >
              {urlConfigured && !isEditingUrl ? (
                <Form.Item label="Chaîne de connexion">
                  <Input.Password
                    value="••••••••••••••••••••••••••••••••"
                    disabled
                    visibilityToggle={false}
                    style={{ marginBottom: 8 }}
                  />
                  <Button size="small" onClick={() => setConfirmOpen(true)}>
                    Modifier
                  </Button>
                </Form.Item>
              ) : (
                <Form.Item
                  label="Chaîne de connexion"
                  name="remote_db_url"
                  rules={[{ required: true, message: 'URL de connexion requise' }]}
                  extra="Format : mysql://utilisateur:motdepasse@hote:port/base"
                >
                  <Input.Password
                    placeholder="mysql://user:password@host:3306/database"
                    visibilityToggle
                  />
                </Form.Item>
              )}

              {remote.status.type && (
                <Alert
                  type={remote.status.type}
                  showIcon
                  title={remote.status.type === 'success' ? 'Connexion réussie' : 'Connexion échouée'}
                  description={remote.status.msg}
                  style={{ marginBottom: 12 }}
                />
              )}

              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                title="La synchronisation s'exécute automatiquement chaque soir à 23h et à la fermeture de la caisse."
              />
              <Space>
                {(!urlConfigured || isEditingUrl) && (
                  <Button icon={<CheckCircleOutlined />} loading={testingRemote} onClick={handleTestRemote}>
                    Tester la connexion
                  </Button>
                )}
                <Button type="primary" htmlType="submit" loading={savingSync} icon={<SyncOutlined />}
                  disabled={urlConfigured && !isEditingUrl}
                >
                  Enregistrer
                </Button>
              </Space>
            </Form>

            <Modal
              title="Confirmation administrateur"
              open={confirmOpen}
              onOk={handleConfirmAdmin}
              confirmLoading={confirmLoading}
              onCancel={() => { setConfirmOpen(false); setConfirmPwd(''); }}
              okText="Confirmer"
              cancelText="Annuler"
            >
              <p style={{ marginBottom: 12 }}>
                Entrez votre mot de passe pour modifier l'URL de connexion distante.
              </p>
              <Input.Password
                placeholder="Mot de passe"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                onPressEnter={handleConfirmAdmin}
                autoFocus
              />
            </Modal>
          </Card>
        </Col>
      )}

      <Col xs={24} lg={10}>
        <Card
          title={<Space><CloudOutlined /> Statut de la synchronisation</Space>}
          loading={statusLoading}
        >
          {syncStatus?.remoteConfigure ? (
            <>
              <Row gutter={12} className="mb-4">
                <Col span={12}>
                  <Statistic
                    title="En attente"
                    value={syncStatus.nbEnAttente}
                    styles={{ content: { color: syncStatus.nbEnAttente > 0 ? '#C9A84C' : '#52c41a', fontSize: 22 } }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Dernière sync"
                    value={
                      syncStatus.dernierSync
                        ? new Date(syncStatus.dernierSync.createdAt).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'Jamais'
                    }
                    styles={{ content: { fontSize: 13 } }}
                  />
                </Col>
              </Row>
              {syncStatus.dernierSync && (
                <div className="mb-3">
                  <Tag
                    icon={
                      syncStatus.dernierSync.statut === 'REUSSIE' ? (
                        <CheckCircleOutlined />
                      ) : syncStatus.dernierSync.statut === 'ECHOUEE' ? (
                        <CloseCircleOutlined />
                      ) : (
                        <SyncOutlined spin />
                      )
                    }
                    color={
                      syncStatus.dernierSync.statut === 'REUSSIE'
                        ? 'success'
                        : syncStatus.dernierSync.statut === 'ECHOUEE'
                          ? 'error'
                          : 'processing'
                    }
                  >
                    {syncStatus.dernierSync.statut}
                    {syncStatus.dernierSync.nbEnvois > 0 &&
                      ` · ${syncStatus.dernierSync.nbEnvois} enregistrement(s)`}
                  </Tag>
                  {syncStatus.dernierSync.erreur && (
                    <Paragraph type="danger" style={{ fontSize: 11, marginTop: 4 }}>
                      La synchronisation a échoué. Veuillez réessayer ou contacter l'administrateur.
                    </Paragraph>
                  )}
                </div>
              )}
              <Divider style={{ margin: '10px 0' }} />
              <Space wrap>
                <Button
                  type="primary"
                  size="middle"
                  icon={<SyncOutlined spin={syncMutation.isPending} />}
                  loading={syncMutation.isPending}
                  onClick={() => syncMutation.mutate()}
                  disabled={syncStatus.nbEnAttente === 0}
                >
                  Synchroniser maintenant
                  {syncStatus.nbEnAttente > 0 && ` (${syncStatus.nbEnAttente})`}
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      size="middle"
                      icon={<CloudOutlined />}
                      loading={initSchemaMutation.isPending}
                      onClick={() => initSchemaMutation.mutate()}
                    >
                      Initialiser le schéma distant
                    </Button>
                    <Button
                      size="middle"
                      icon={<SyncOutlined />}
                      loading={backupMutation.isPending}
                      onClick={() => backupMutation.mutate()}
                    >
                      Sauvegarder toutes les tables
                    </Button>
                  </>
                )}
              </Space>
            </>
          ) : (
            <Alert
              type="info"
              showIcon
              title="Synchronisation non configurée"
              description={
                <span style={{ fontSize: 12 }}>
                  La synchronisation vers le cloud n'est pas configurée. Contactez l'administrateur.
                </span>
              }
            />
          )}
        </Card>
      </Col>

      <Col xs={24} lg={14}>
        <Card title="Historique des synchronisations">
          <Table
            dataSource={syncLogs ?? []}
            columns={logColumns}
            rowKey="id"
            loading={logsLoading}
            size="middle"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            locale={{ emptyText: 'Aucune synchronisation enregistrée' }}
          />
        </Card>
      </Col>
    </Row>
  );
}

// ─── Tab Utilisateurs (admin) ─────────────────────────────────────────────────

function TabUtilisateurs() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.findAll().then((r) => r.data),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles-list'],
    queryFn: () => rolesApi.findAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserDto) => usersApi.create(data),
    onSuccess: () => {
      message.success('Utilisateur créé');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || "Erreur lors de la création");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      message.success('Utilisateur mis à jour');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      setEditingUser(null);
      form.resetFields();
    },
    onError: () => message.error('Impossible de mettre à jour l\'utilisateur. Veuillez réessayer.'),
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => {
      message.success('Utilisateur désactivé');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => usersApi.update(id, { actif: true }),
    onSuccess: () => {
      message.success('Utilisateur réactivé');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: usersApi.unlock,
    onSuccess: () => {
      message.success('Compte déverrouillé');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone ?? '',
      email: user.email,
      roleId: user.role.id,
    });
    setModalOpen(true);
  };

  const handleSubmit = (values: CreateUserDto & UpdateUserDto) => {
    if (editingUser) {
      const { ...updateData } = values;
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      createMutation.mutate(values as CreateUserDto);
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Utilisateur',
      key: 'user',
      render: (_, u) => (
        <div>
          <div className="font-medium">{u.prenom} {u.nom}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{u.email}</div>
        </div>
      ),
    },
    {
      title: 'Rôle',
      dataIndex: ['role', 'nom'],
      key: 'role',
      width: 110,
      render: (nom: string) => <Tag color="gold">{nom}</Tag>,
    },
    {
      title: 'Statut',
      key: 'statut',
      width: 90,
      render: (_, u) => (
        <Badge
          status={u.actif ? 'success' : 'error'}
          text={u.actif ? 'Actif' : 'Inactif'}
        />
      ),
    },
    {
      title: 'Dernière connexion',
      dataIndex: 'dernierLogin',
      key: 'dernierLogin',
      width: 140,
      render: (d: string | null) =>
        d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, u) => (
        <Space size="middle">
          <Button size="middle" type="link" onClick={() => openEdit(u)}>
            Modifier
          </Button>
          {u.actif ? (
            <Button
              size="middle"
              type="link"
              danger
              icon={<StopOutlined />}
              loading={deactivateMutation.isPending}
              onClick={() => deactivateMutation.mutate(u.id)}
            >
              Désactiver
            </Button>
          ) : (
            <Button
              size="middle"
              type="link"
              style={{ color: '#52c41a' }}
              onClick={() => activateMutation.mutate(u.id)}
            >
              Réactiver
            </Button>
          )}
          <Button
            size="middle"
            type="link"
            icon={<UnlockOutlined />}
            title="Déverrouiller le compte (réinitialise les tentatives échouées)"
            onClick={() => unlockMutation.mutate(u.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex justify-between items-center">
        <Text type="secondary" style={{ fontSize: 12 }}>
          {users?.length ?? 0} utilisateur(s) enregistré(s)
        </Text>
        <Button type="primary" size="middle" icon={<PlusOutlined />} onClick={openCreate}>
          Nouvel utilisateur
        </Button>
      </div>

      <Table
        dataSource={users ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={{ pageSize: 8, showSizeChanger: false }}
      />

      <Modal
        title={editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingUser(null); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle">
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="nom" label="Nom" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="prenom" label="Prénom" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: 'email' }]}
          >
            <Input disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="Mot de passe"
              rules={[{ required: true }, { min: 6 }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="telephone" label="Téléphone">
            <Input />
          </Form.Item>
          <Form.Item name="roleId" label="Rôle" rules={[{ required: true }]}>
            <Select
              options={roles?.map((r) => ({ value: r.id, label: r.nom })) ?? []}
              placeholder="Sélectionner un rôle"
            />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button size="middle" onClick={() => { setModalOpen(false); setEditingUser(null); }}>
              Annuler
            </Button>
            <Button
              type="primary"
              size="middle"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingUser ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

// ─── Tab Rôles & Permissions (admin) ─────────────────────────────────────────

function TabRoles() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles-full'],
    queryFn: () => rolesApi.findAll().then((r) => r.data),
  });

  const { data: allPermissions, isLoading: permsLoading } = useQuery({
    queryKey: ['permissions-all'],
    queryFn: () => rolesApi.getPermissions().then((r) => r.data),
  });

  const selectedRole = roles?.find((r) => r.id === selectedRoleId) ?? null;

  useEffect(() => {
    if (selectedRole) {
      setCheckedIds(selectedRole.permissions.map((rp) => rp.permission.id));
    }
  }, [selectedRoleId, roles]);

  const saveMutation = useMutation({
    mutationFn: () => rolesApi.assignPermissions(selectedRoleId!, checkedIds),
    onSuccess: () => {
      message.success('Permissions mises à jour');
      queryClient.invalidateQueries({ queryKey: ['roles-full'] });
    },
    onError: () => message.error('Erreur lors de la mise à jour des permissions'),
  });

  // Grouper les permissions par module
  const permsByModule = (allPermissions ?? []).reduce<Record<string, Permission[]>>(
    (acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    },
    {},
  );

  const hasChanges = selectedRole
    ? JSON.stringify([...checkedIds].sort()) !==
      JSON.stringify([...selectedRole.permissions.map((rp) => rp.permission.id)].sort())
    : false;

  const selectRole = useCallback((id: string) => {
    setSelectedRoleId(id);
  }, []);

  return (
    <Row gutter={[16, 0]}>
      {/* Liste des rôles */}
      <Col xs={24} lg={6}>
        <Card title={<Space><SafetyOutlined /> Rôles</Space>} loading={rolesLoading} size="middle">
          <div className="flex flex-col gap-1">
            {roles?.map((r) => (
              <div
                key={r.id}
                onClick={() => selectRole(r.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background:
                    selectedRoleId === r.id
                      ? 'rgba(201,168,76,0.12)'
                      : 'transparent',
                  border:
                    selectedRoleId === r.id
                      ? '1px solid rgba(201,168,76,0.4)'
                      : '1px solid transparent',
                }}
              >
                <div className="font-medium text-sm">{r.nom}</div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  {r._count.users} utilisateur(s)
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Col>

      {/* Matrice de permissions */}
      <Col xs={24} lg={18}>
        <Card
          title={
            selectedRole
              ? `Permissions : ${selectedRole.nom}`
              : 'Sélectionnez un rôle'
          }
          loading={permsLoading}
          extra={
            selectedRole && (
              <Button
                type="primary"
                size="middle"
                disabled={!hasChanges}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Enregistrer les modifications
              </Button>
            )
          }
        >
          {!selectedRole ? (
            <Paragraph type="secondary">
              Choisissez un rôle dans la liste pour modifier ses permissions.
            </Paragraph>
          ) : (
            <div className="flex flex-col gap-4">
              {Object.entries(permsByModule).map(([module, perms]) => (
                <div key={module}>
                  <Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {module}
                  </Text>
                  <Divider style={{ margin: '6px 0 8px' }} />
                  <Checkbox.Group
                    value={checkedIds}
                    onChange={(vals) => setCheckedIds(vals as string[])}
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                  >
                    {perms.map((p) => (
                      <Checkbox key={p.id} value={p.id}>
                        <Text style={{ fontSize: 12 }}>{p.action}</Text>
                      </Checkbox>
                    ))}
                  </Checkbox.Group>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
}

// ─── Tab Serveur (config environnement) ──────────────────────────────────────

function TabServeur() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const db = useStatusAlert();

  useEffect(() => {
    const api = eAPI();
    if (!api) { setLoading(false); return; }
    api.getConfig().then((cfg: any) => {
      const dbUrl = cfg.database_url || '';
      let dbHost = 'localhost', dbUser = 'globe', dbPass = '', dbName = 'gestion_residence', dbPort = '3306';
      try {
        const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
        if (match) {
          dbUser = match[1];
          dbPass = decodeURIComponent(match[2]);
          dbHost = match[3];
          dbPort = match[4];
          dbName = match[5];
        }
      } catch {}
      form.setFieldsValue({
        db_host: dbHost,
        db_port: dbPort,
        db_user: dbUser,
        db_password: dbPass,
        db_name: dbName,
        port: cfg.port || 3001,
        jwt_secret: cfg.jwt_secret || '',
      });
      setLoading(false);
    });
  }, [form]);

  const buildDbUrl = (values: any) => {
    const port = parseInt(values.db_port, 10) || 3306;
    return `mysql://${values.db_user}:${encodeURIComponent(values.db_password)}@${values.db_host}:${port}/${values.db_name}`;
  };

  const handleTestConnection = async () => {
    try {
      await form.validateFields(['db_host', 'db_port', 'db_user', 'db_password', 'db_name']);
    } catch {
      return;
    }

    const values = form.getFieldsValue();
    const portNum = parseInt(values.db_port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      db.err('Le port doit être un nombre entre 1 et 65535.');
      return;
    }

    setTesting(true);
    db.clear();

    try {
      const api = eAPI();
      const dbUrl = buildDbUrl(values);
      const result = await api.testDbConnection(dbUrl);

      if (result.ok) {
        db.ok('Connexion à MySQL réussie.');
      } else {
        db.err(parseDbError(result.error || 'Erreur inconnue', { host: values.db_host, port: values.db_port, name: values.db_name }));
      }
    } catch (e: any) {
      db.err('Erreur inattendue : ' + (e.message || e));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (values: any) => {
    const portNum = parseInt(values.db_port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      db.err('Le port doit être un nombre entre 1 et 65535.');
      return;
    }

    setSaving(true);
    db.clear();

    const api = eAPI();
    const dbUrl = buildDbUrl(values);

    try {
      const result = await api.testDbConnection(dbUrl);
      if (!result.ok) {
        const errMsg = parseDbError(result.error || 'Erreur inconnue', { host: values.db_host, port: values.db_port, name: values.db_name });
        db.err(errMsg);
        modal.error({
          title: 'Connexion échouée',
          content: `Impossible de se connecter à MySQL avec ces paramètres.\n\n${errMsg}`,
          okText: 'Compris',
        });
        setSaving(false);
        return;
      }
    } catch (e: any) {
      db.err('Erreur inattendue : ' + (e.message || e));
      setSaving(false);
      return;
    }

    try {
      const currentConfig = await api.getConfig();
      const newConfig = {
        ...currentConfig,
        database_url: dbUrl,
        port: Number(values.port) || 3001,
        jwt_secret: values.jwt_secret,
      };
      await api.saveConfig(newConfig);
      db.ok('Configuration sauvegardée avec succès.');
      message.success('Configuration sauvegardée. Redémarrez l\'application pour appliquer.');
    } catch {
      message.error('Erreur lors de la sauvegarde du fichier de configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSave} onValuesChange={db.clear}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<Space><CloudOutlined /> Base de données locale (MySQL)</Space>} loading={loading}>
            <Row gutter={8}>
              <Col span={16}>
                <Form.Item label="Hôte" name="db_host" rules={[{ required: true, message: 'Hôte requis' }]}>
                  <Input placeholder="localhost" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Port" name="db_port" rules={[{ required: true, message: 'Port requis' }]}>
                  <Input placeholder="3306" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Utilisateur" name="db_user" rules={[{ required: true, message: 'Utilisateur requis' }]}>
              <Input placeholder="globe" />
            </Form.Item>
            <Form.Item label="Mot de passe" name="db_password" rules={[{ required: true, message: 'Mot de passe requis' }]}>
              <Input.Password placeholder="Mot de passe MySQL" />
            </Form.Item>
            <Form.Item label="Nom de la base" name="db_name" rules={[{ required: true, message: 'Nom de base requis' }]}>
              <Input placeholder="gestion_residence" />
            </Form.Item>

            {db.status.type && (
              <Alert
                type={db.status.type}
                showIcon
                title={db.status.type === 'success' ? 'Connexion réussie' : 'Connexion échouée'}
                description={db.status.msg}
                style={{ marginBottom: 12 }}
              />
            )}

            <Button
              icon={<CheckCircleOutlined />}
              loading={testing}
              onClick={handleTestConnection}
              disabled={!isDesktop}
              title={!isDesktop ? "Disponible uniquement dans l'application installée sur le PC" : undefined}
              style={{ marginRight: 8 }}
            >
              Tester la connexion
            </Button>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<Space><LockOutlined /> Sécurité</Space>} loading={loading}>
            <Form.Item label="Port du serveur local" name="port">
              <Input placeholder="3001" type="number" />
            </Form.Item>
            <Form.Item label="Secret JWT" name="jwt_secret">
              <Input.Password placeholder="Clé secrète pour les tokens" />
            </Form.Item>
          </Card>
        </Col>

        <Col xs={24}>
          {isDesktop ? (
            <Button type="primary" htmlType="submit" loading={saving} style={{ marginTop: 8 }}>
              Sauvegarder la configuration
            </Button>
          ) : (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 8 }}
              title="Pour modifier ces paramètres, utilisez l'application installée sur le PC serveur."
            />
          )}
        </Col>
      </Row>
    </Form>
  );
}

// ─── Tab À propos ─────────────────────────────────────────────────────────────

function TabAbout() {
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    const api = eAPI();
    if (!api) return;
    api.getVersion().then(setVersion).catch(() => {});
  }, []);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title={<Space><InfoCircleOutlined /> Application</Space>}>
          <Descriptions column={1} size="middle">
            <Descriptions.Item label="Nom">GLOBE Manager</Descriptions.Item>
            <Descriptions.Item label="Version">
              <Tag color="gold">v{version}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Environnement">
              {isDesktop ? (
                <Tag icon={<DesktopOutlined />} color="purple">Desktop (Electron)</Tag>
              ) : (
                <Tag icon={<GlobalOutlined />} color="cyan">Navigateur web</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Licence">© 2026 GLOBE Résidence Meublée</Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
      <Col xs={24}>
        <Card title={<Space><TeamOutlined /> Développeur</Space>}>
          <Paragraph style={{ margin: 0 }}>
            <Text strong>GLOBE Manager</Text> a été conçu et développé par{' '}
            <Text strong style={{ color: '#C9A84C' }}>SparkNest</Text>
            , collectif tech basé à Douala, spécialisé dans les solutions digitales sur mesure.
          </Paragraph>
        </Card>
      </Col>
    </Row>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ParametresPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const userId = user?.id ?? '';

  const tabItems = [
    {
      key: 'compte',
      label: <Space><UserOutlined />Mon compte</Space>,
      children: <TabCompte userId={userId} isAdmin={isAdmin} />,
    },
    {
      key: 'sync',
      label: <Space><SyncOutlined />Synchronisation</Space>,
      children: <TabSync isAdmin={isAdmin} />,
    },
    ...(isAdmin
      ? [
          {
            key: 'users',
            label: <Space><TeamOutlined />Utilisateurs</Space>,
            children: <TabUtilisateurs />,
          },
          {
            key: 'roles',
            label: <Space><SafetyOutlined />Rôles & Permissions</Space>,
            children: <TabRoles />,
          },
        ]
      : []),
    ...(isAdmin && isDesktop
      ? [
          {
            key: 'serveur',
            label: <Space><CloudOutlined />Serveur</Space>,
            children: <TabServeur />,
          },
        ]
      : []),
    {
      key: 'about',
      label: <Space><InfoCircleOutlined />À propos</Space>,
      children: <TabAbout />,
    },
  ];

  return (
    <div id="tour-parametres-page">
      <h2 className="text-xl font-semibold mb-4">Paramètres</h2>
      <Tabs
        id="tour-parametres-tabs"
        items={tabItems}
        destroyOnHidden={false}
        tabBarStyle={{ overflowX: 'auto', flexWrap: 'nowrap' }}
        size="small"
      />
    </div>
  );
}
