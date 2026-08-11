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
  Switch,
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
  WifiOutlined,
  CloudOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  ReloadOutlined,
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
  PoweroffOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { authApi } from '../../api/auth';
import { syncApi, type SyncLog } from '../../api/sync';
import { usersApi, type User, type CreateUserDto, type UpdateUserDto } from '../../api/users';
import { rolesApi, type Permission } from '../../api/roles';
import { useAuthStore } from '../../store/auth';

const { Text, Paragraph } = Typography;

const isTauri = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';

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
    onError: () => message.error('Erreur lors de la mise à jour du profil'),
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

// ─── Tab Réseau (Tauri uniquement) ────────────────────────────────────────────

function TabReseau({ isAdmin }: { isAdmin: boolean }) {
  const { message, modal } = App.useApp();
  const [config, setConfig] = useState<{
    mode: string;
    server_url: string | null;
    configured: boolean;
  } | null>(null);
  const [autostart, setAutostart] = useState<boolean>(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingAutostart, setLoadingAutostart] = useState(false);

  useEffect(() => {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      Promise.all([
        invoke<{ mode: string; server_url: string | null; configured: boolean }>('get_config'),
        invoke<boolean>('autostart_is_enabled'),
      ])
        .then(([cfg, as]) => {
          setConfig(cfg);
          setAutostart(as);
        })
        .finally(() => setLoadingConfig(false));
    });
  }, []);

  const toggleAutostart = async (enabled: boolean) => {
    setLoadingAutostart(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const ok = await invoke<boolean>(enabled ? 'autostart_enable' : 'autostart_disable');
      if (ok) {
        setAutostart(enabled);
        message.success(enabled ? 'Démarrage automatique activé' : 'Démarrage automatique désactivé');
      } else {
        message.error('Impossible de modifier le démarrage automatique');
      }
    } finally {
      setLoadingAutostart(false);
    }
  };

  const handleReset = () => {
    modal.confirm({
      title: 'Reconfigurer la connexion ?',
      content:
        "La configuration réseau sera effacée. Le mode (serveur/client) sera redemandé au prochain démarrage.",
      okText: 'Réinitialiser',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        const ok = await invoke<boolean>('reset_config');
        if (ok) {
          message.success("Configuration réinitialisée — redémarrez l'application");
        } else {
          message.error('Échec de la réinitialisation');
        }
      },
    });
  };

  const apiUrl =
    (window as any).__GLOBE_API_URL__ ??
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    '/api';

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title={<Space><WifiOutlined /> Mode de connexion</Space>} loading={loadingConfig}>
          {config && (
            <>
              <Descriptions column={1} size="middle" className="mb-3">
                <Descriptions.Item label="Mode">
                  {config.mode === 'server' ? (
                    <Tag color="green">Serveur</Tag>
                  ) : (
                    <Tag color="blue">Poste client</Tag>
                  )}
                </Descriptions.Item>
                {config.mode === 'client' && config.server_url && (
                  <Descriptions.Item label="Serveur configuré">
                    <Text code>{config.server_url}</Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="URL API active">
                  <Text code style={{ fontSize: 11, wordBreak: 'break-all' }}>
                    {apiUrl}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
                {config.mode === 'server'
                  ? 'Ce poste héberge la base de données et le serveur NestJS via Docker.'
                  : 'Ce poste se connecte à un serveur distant sur le réseau local (LAN).'}
              </Paragraph>
              {isAdmin && (
                <>
                  <Divider style={{ margin: '10px 0' }} />
                  <Button danger size="middle" icon={<ReloadOutlined />} onClick={handleReset}>
                    Reconfigurer la connexion
                  </Button>
                </>
              )}
            </>
          )}
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card title={<Space><PoweroffOutlined /> Démarrage automatique</Space>} loading={loadingConfig}>
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
            Lance GLOBE Manager automatiquement au démarrage de Windows / Linux.
          </Paragraph>
          <Space>
            <Switch
              checked={autostart}
              loading={loadingAutostart}
              onChange={toggleAutostart}
            />
            <Text>{autostart ? 'Activé' : 'Désactivé'}</Text>
          </Space>
        </Card>
      </Col>
    </Row>
  );
}

// ─── Tab Synchronisation ──────────────────────────────────────────────────────

function TabSync() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => syncApi.getStatus().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: syncLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: () => syncApi.getLogs(20).then((r) => r.data),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncApi.push().then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      if (data.success) {
        message.success(`Synchronisation réussie — ${data.nbEnvois} enregistrement(s) envoyé(s)`);
      } else {
        message.error(data.erreur || 'Erreur lors de la synchronisation');
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
      title: 'Erreur',
      dataIndex: 'erreur',
      key: 'erreur',
      ellipsis: true,
      render: (e: string | undefined) =>
        e ? <Text type="danger" style={{ fontSize: 11 }}>{e}</Text> : '—',
    },
  ];

  return (
    <Row gutter={[16, 16]}>
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
                    valueStyle={{
                      color: syncStatus.nbEnAttente > 0 ? '#C9A84C' : '#52c41a',
                      fontSize: 22,
                    }}
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
                    valueStyle={{ fontSize: 13 }}
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
                      ` — ${syncStatus.dernierSync.nbEnvois} enregistrement(s)`}
                  </Tag>
                  {syncStatus.dernierSync.erreur && (
                    <Paragraph type="danger" style={{ fontSize: 11, marginTop: 4 }}>
                      {syncStatus.dernierSync.erreur}
                    </Paragraph>
                  )}
                </div>
              )}
              <Divider style={{ margin: '10px 0' }} />
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
            </>
          ) : (
            <Alert
              type="info"
              showIcon
              message="Synchronisation non configurée"
              description={
                <span style={{ fontSize: 12 }}>
                  Définissez{' '}
                  <Text code style={{ fontSize: 11 }}>SYNC_REMOTE_URL</Text> et{' '}
                  <Text code style={{ fontSize: 11 }}>SYNC_API_KEY</Text>{' '}
                  dans les variables d'environnement du serveur pour activer la synchronisation cloud.
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
    onError: () => message.error('Erreur lors de la mise à jour'),
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
              ? `Permissions — ${selectedRole.nom}`
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

// ─── Tab À propos ─────────────────────────────────────────────────────────────

function TabAbout() {
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    if (!isTauri) return;
    import('@tauri-apps/api/app')
      .then(({ getVersion }) => getVersion())
      .then(setVersion)
      .catch(() => {});
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
              {isTauri ? (
                <Tag icon={<DesktopOutlined />} color="purple">Desktop (Tauri)</Tag>
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
  const isAdmin = user?.role === 'admin';
  const userId = user?.id ?? '';

  const tabItems = [
    {
      key: 'compte',
      label: <Space><UserOutlined />Mon compte</Space>,
      children: <TabCompte userId={userId} isAdmin={isAdmin} />,
    },
    ...(isTauri
      ? [
          {
            key: 'reseau',
            label: <Space><WifiOutlined />Réseau</Space>,
            children: <TabReseau isAdmin={isAdmin} />,
          },
        ]
      : []),
    {
      key: 'sync',
      label: <Space><SyncOutlined />Synchronisation</Space>,
      children: <TabSync />,
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
    {
      key: 'about',
      label: <Space><InfoCircleOutlined />À propos</Space>,
      children: <TabAbout />,
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Paramètres</h2>
      <Tabs items={tabItems} destroyInactiveTabPane={false} />
    </div>
  );
}
