import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { useUser } from '@/app/contexts/UserContext';
import { ROLES } from '@/app/constants/roles';
import { User, Mail, Briefcase, GraduationCap, Upload, Building2, MapPin, Phone, ShieldCheck, Lock } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '@/app/services/api';
import QRCode from 'qrcode';

export function ProfilePage() {
  const { user, updateUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityStatus, setSecurityStatus] = useState({
    emailVerified: false,
    otpConfigured: false,
    totpEnabled: false,
    require2fa: false,
    lgpdConsentAt: null,
  });
  const [emailCode, setEmailCode] = useState('');
  const [devEmailOtp, setDevEmailOtp] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  if (!user) return null;

  useEffect(() => {
    if (!user?.id) return;
    api.getSecurityStatus(user.id)
      .then((data) => setSecurityStatus(data))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!twoFactorSecret) {
      setQrCodeUrl('');
      return;
    }
    const otpauthUrl = `otpauth://totp/CarreiraHub:${encodeURIComponent(user.email || user.id)}?secret=${twoFactorSecret}&issuer=CarreiraHub`;
    QRCode.toDataURL(otpauthUrl).then(setQrCodeUrl).catch(() => setQrCodeUrl(''));
  }, [twoFactorSecret, user.email, user.id]);

  const onlyDigits = (value) => (value || '').replace(/\D/g, '');

  const isValidCPF = (cpfValue) => {
    const cpf = onlyDigits(cpfValue);
    if (!cpf || cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += parseInt(cpf[i], 10) * (10 - i);
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== parseInt(cpf[9], 10)) return false;
    sum = 0;
    for (let i = 0; i < 10; i += 1) sum += parseInt(cpf[i], 10) * (11 - i);
    check = (sum * 10) % 11;
    if (check === 10) check = 0;
    return check === parseInt(cpf[10], 10);
  };

  const isValidCNPJ = (cnpjValue) => {
    const cnpj = onlyDigits(cnpjValue);
    if (!cnpj || cnpj.length !== 14 || /^([0-9])\1+$/.test(cnpj)) return false;
    const calc = (base) => {
      let sum = 0;
      let pos = base.length - 7;
      for (let i = base.length; i >= 1; i -= 1) {
        sum += base[base.length - i] * pos--;
        if (pos < 2) pos = 9;
      }
      const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      return result;
    };
    const base = cnpj.split('').map(Number);
    const d1 = calc(base.slice(0, 12));
    const d2 = calc(base.slice(0, 12).concat(d1));
    return d1 === base[12] && d2 === base[13];
  };

  const handleSave = async () => {
    if (password && password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (user.role === ROLES.STUDENT) {
      if (user.cpf && !isValidCPF(user.cpf)) {
        toast.error('CPF inválido.');
        return;
      }
    }

    if (user.role === ROLES.COMPANY) {
      if (user.cnpj && !isValidCNPJ(user.cnpj)) {
        toast.error('CNPJ inválido.');
        return;
      }
      if (user.legalCpf && !isValidCPF(user.legalCpf)) {
        toast.error('CPF do responsável inválido.');
        return;
      }
    }

    if (user.role === ROLES.COURSE_PROVIDER) {
      if (user.providerType === 'PF' && user.providerCpf && !isValidCPF(user.providerCpf)) {
        toast.error('CPF do prestador inválido.');
        return;
      }
      if (user.providerType === 'PJ' && user.providerCnpj && !isValidCNPJ(user.providerCnpj)) {
        toast.error('CNPJ do prestador inválido.');
        return;
      }
    }

    try {
      const payload = { ...user };
      if (password) payload.password = password;
      if (user.lgpdConsent) payload.lgpdConsent = true;
      const response = await api.updateUserProfile(user.id, payload);
      if (response?.user) {
        updateUser(response.user);
      }
      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Erro ao atualizar perfil: ' + error.message);
    }
  };

  const handleSendVerification = async () => {
    if (!user?.email) return;
    setIsSendingCode(true);
    try {
      const response = await api.requestEmailVerification({ userId: user.id, email: user.email });
      setDevEmailOtp(response?.otp || '');
      toast.success('Código de verificação enviado.');
    } catch (error) {
      toast.error('Não foi possível enviar o código.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode) return;
    setIsVerifyingCode(true);
    try {
      await api.verifyEmail({ userId: user.id, code: emailCode });
      setSecurityStatus((prev) => ({ ...prev, emailVerified: true }));
      updateUser({ emailVerified: true });
      setDevEmailOtp('');
      toast.success('E-mail verificado com sucesso.');
    } catch (error) {
      toast.error('Código inválido ou expirado.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const data = await api.setupTwoFactor({ userId: user.id, email: user.email });
      setTwoFactorSecret(data.secret || '');
      setSecurityStatus((prev) => ({ ...prev, otpConfigured: !!data.secret }));
      toast.success('2FA configurado. Escaneie o QR e confirme.');
    } catch (error) {
      toast.error('Erro ao configurar 2FA.');
    }
  };

  const handleVerify2FA = async () => {
    try {
      await api.verifyTwoFactor({ userId: user.id, token: twoFactorOtp });
      setSecurityStatus((prev) => ({ ...prev, otpConfigured: true, totpEnabled: true, require2fa: true }));
      updateUser({ otpConfigured: true, totpEnabled: true, require2fa: true });
      toast.success('2FA ativado com sucesso.');
      setTwoFactorOtp('');
    } catch (error) {
      toast.error('Código 2FA inválido.');
    }
  };

  const handleDisable2FA = async () => {
    try {
      await api.disableTwoFactor({ userId: user.id });
      setSecurityStatus((prev) => ({ ...prev, otpConfigured: false, totpEnabled: false, require2fa: false }));
      updateUser({ otpConfigured: false, totpEnabled: false, require2fa: false });
      setTwoFactorSecret('');
      setTwoFactorOtp('');
      toast.success('2FA desativado.');
    } catch (error) {
      toast.error('Erro ao desativar 2FA.');
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !user?.id) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Envie um currículo em PDF.');
      return;
    }

    setIsUploadingResume(true);
    try {
      const upload = await api.uploadResume(file);
      const resumeUrl = upload.downloadUrl || upload.url;
      const resumeFileName = upload.fileName || file.name;
      const response = await api.updateUserProfile(user.id, { resumeUrl, resumeFileName });

      if (response?.user) {
        updateUser(response.user);
      } else {
        updateUser({ resumeUrl, resumeFileName });
      }

      toast.success('Currículo atualizado com sucesso.');
    } catch (error) {
      toast.error(error?.message || 'Não foi possível enviar o currículo.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const renderSecurityCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Segurança e LGPD
        </CardTitle>
        <CardDescription>Verificação de e-mail e autenticação em duas etapas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">E-mail verificado</p>
          <div className="flex items-center gap-2">
            <Badge variant={securityStatus.emailVerified ? 'default' : 'secondary'}>
              {securityStatus.emailVerified ? 'Verificado' : 'Pendente'}
            </Badge>
            {!securityStatus.emailVerified && (
              <Button variant="outline" size="sm" onClick={handleSendVerification} disabled={isSendingCode}>
                {isSendingCode ? 'Enviando...' : 'Enviar código'}
              </Button>
            )}
          </div>
          {!securityStatus.emailVerified && (
            <>
              <div className="flex flex-col md:flex-row gap-2">
                <Input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="Código de verificação"
                />
                <Button onClick={handleVerifyEmail} disabled={isVerifyingCode}>
                  {isVerifyingCode ? 'Verificando...' : 'Confirmar'}
                </Button>
              </div>
              {devEmailOtp && (
                <p className="text-xs text-amber-700">
                  Ambiente de desenvolvimento: OTP <span className="font-mono">{devEmailOtp}</span>
                </p>
              )}
            </>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Autenticação em duas etapas (2FA)</p>
          <div className="flex items-center gap-2">
            <Badge variant={securityStatus.totpEnabled ? 'default' : 'secondary'}>
              {securityStatus.totpEnabled ? 'Ativa' : 'Inativa'}
            </Badge>
            {!securityStatus.totpEnabled && securityStatus.otpConfigured && (
              <Badge variant="outline">Pendente de ativação</Badge>
            )}
            {securityStatus.totpEnabled ? (
              <Button variant="outline" size="sm" onClick={handleDisable2FA}>Desativar 2FA</Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleSetup2FA}>Configurar 2FA</Button>
            )}
          </div>
          {!securityStatus.totpEnabled && twoFactorSecret && (
            <div className="space-y-2">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code 2FA" className="h-40 w-40" />
              )}
              <div className="text-xs text-muted-foreground">Segredo: {twoFactorSecret}</div>
              <div className="flex flex-col md:flex-row gap-2">
                <Input
                  value={twoFactorOtp}
                  onChange={(e) => setTwoFactorOtp(e.target.value)}
                  placeholder="Código do autenticador"
                />
                <Button onClick={handleVerify2FA}>Ativar 2FA</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="lgpdConsent"
            checked={!!user.lgpdConsent}
            onCheckedChange={(checked) => updateUser({ lgpdConsent: !!checked })}
            disabled={!isEditing}
          />
          <Label htmlFor="lgpdConsent" className="text-sm">
            Concordo com os termos de uso e política de privacidade (LGPD)
          </Label>
          {securityStatus.lgpdConsentAt && (
            <span className="text-xs text-muted-foreground">Confirmado em {new Date(securityStatus.lgpdConsentAt).toLocaleDateString('pt-BR')}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Renderização para Empresa
  if (user?.role === ROLES.COMPANY) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Perfil da Empresa</h1>
            <p className="text-muted-foreground">Gerencie as informações da sua empresa</p>
          </div>
          <Button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            variant={isEditing ? 'default' : 'outline'}
          >
            {isEditing ? 'Salvar' : 'Editar Perfil'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  value={user.companyName || ''}
                  disabled={!isEditing}
                  onChange={(e) => updateUser({ companyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyLegalName">Razão Social</Label>
                <Input
                  id="companyLegalName"
                  value={user.companyLegalName || ''}
                  disabled={!isEditing}
                  onChange={(e) => updateUser({ companyLegalName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyTradeName">Nome Fantasia</Label>
                <Input
                  id="companyTradeName"
                  value={user.companyTradeName || ''}
                  disabled={!isEditing}
                  onChange={(e) => updateUser({ companyTradeName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={user.cnpj || ''}
                  disabled={!isEditing}
                  onChange={(e) => updateUser({ cnpj: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stateRegistration">Inscrição Estadual</Label>
                <Input
                  id="stateRegistration"
                  value={user.stateRegistration || ''}
                  disabled={!isEditing}
                  onChange={(e) => updateUser({ stateRegistration: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipalRegistration">Inscrição Municipal</Label>
                <Input
                  id="municipalRegistration"
                  value={user.municipalRegistration || ''}
                  disabled={!isEditing}
                  onChange={(e) => updateUser({ municipalRegistration: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companySize">Tamanho da Empresa</Label>
                <Input
                  id="companySize"
                  value={user.companySize || ''}
                  disabled={!isEditing}
                  onChange={(e) => updateUser({ companySize: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Setor de Atuação</Label>
                <Input
                  id="area"
                  value={user.area || ''}
                  disabled={!isEditing}
                  onChange={(e) => updateUser({ area: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="corporateEmail">E-mail Corporativo</Label>
              <Input
                id="corporateEmail"
                value={user.corporateEmail || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ corporateEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Telefone</Label>
              <Input
                id="companyPhone"
                value={user.companyPhone || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ companyPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyWhatsapp">WhatsApp</Label>
              <Input
                id="companyWhatsapp"
                value={user.companyWhatsapp || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ companyWhatsapp: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyCep">CEP</Label>
              <Input
                id="companyCep"
                value={user.companyCep || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ companyCep: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyStreet">Rua</Label>
              <Input
                id="companyStreet"
                value={user.companyStreet || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ companyStreet: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyNumber">Número</Label>
              <Input
                id="companyNumber"
                value={user.companyNumber || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ companyNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyNeighborhood">Bairro</Label>
              <Input
                id="companyNeighborhood"
                value={user.companyNeighborhood || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ companyNeighborhood: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyCity">Cidade</Label>
              <Input
                id="companyCity"
                value={user.companyCity || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ companyCity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyState">Estado</Label>
              <Input
                id="companyState"
                value={user.companyState || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ companyState: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Responsável Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Nome completo</Label>
              <Input
                id="legalName"
                value={user.legalName || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ legalName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalCpf">CPF</Label>
              <Input
                id="legalCpf"
                value={user.legalCpf || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ legalCpf: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalRole">Cargo</Label>
              <Input
                id="legalRole"
                value={user.legalRole || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ legalRole: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalPhone">Telefone</Label>
              <Input
                id="legalPhone"
                value={user.legalPhone || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ legalPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalEmail">E-mail</Label>
              <Input
                id="legalEmail"
                value={user.legalEmail || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ legalEmail: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Dados Comerciais
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companySegment">Segmento</Label>
              <Input
                id="companySegment"
                value={user.companySegment || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ companySegment: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmployees">Número de funcionários</Label>
              <Input
                id="companyEmployees"
                value={user.companyEmployees || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ companyEmployees: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Tipos de Vaga Oferecidos
            </CardTitle>
            <CardDescription>Perfis de contratação da empresa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.jobTypesOffered?.length > 0 ? (
                user.jobTypesOffered.map((type, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {type}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum tipo de vaga configurado</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Vagas Ativas</CardTitle>
              <CardDescription>Total de vagas publicadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{user.activeJobs?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Candidatos Contratados</CardTitle>
              <CardDescription>Total de contratações realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{user.hiredCandidates?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Dados de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loginEmail">Login (e-mail)</Label>
              <Input
                id="loginEmail"
                type="email"
                value={user.email || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                disabled={!isEditing}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmação de senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                disabled={!isEditing}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a senha"
              />
            </div>
          </CardContent>
        </Card>

        {renderSecurityCard()}
      </div>
    );
  }

  if (user?.role === ROLES.COURSE_PROVIDER) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Perfil do Prestador de Serviço</h1>
            <p className="text-muted-foreground">Cadastre suas informações e cursos</p>
          </div>
          <Button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            variant={isEditing ? 'default' : 'outline'}
          >
            {isEditing ? 'Salvar' : 'Editar Perfil'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="providerType">Tipo</Label>
              <Select
                value={user.providerType || ''}
                onValueChange={(value) => updateUser({ providerType: value })}
                disabled={!isEditing}
              >
                <SelectTrigger id="providerType">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerName">Nome / Razão social</Label>
              <Input id="providerName" value={user.providerName || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerCpf">CPF</Label>
              <Input id="providerCpf" value={user.providerCpf || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerCpf: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerCnpj">CNPJ</Label>
              <Input id="providerCnpj" value={user.providerCnpj || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerCnpj: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="providerEmail">E-mail</Label>
              <Input id="providerEmail" value={user.providerEmail || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerEmail: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerPhone">Telefone</Label>
              <Input id="providerPhone" value={user.providerPhone || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerPhone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerWhatsapp">WhatsApp</Label>
              <Input id="providerWhatsapp" value={user.providerWhatsapp || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerWhatsapp: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="providerCep">CEP</Label>
              <Input id="providerCep" value={user.providerCep || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerCep: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerStreet">Rua</Label>
              <Input id="providerStreet" value={user.providerStreet || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerStreet: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerNumber">Número</Label>
              <Input id="providerNumber" value={user.providerNumber || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerNeighborhood">Bairro</Label>
              <Input id="providerNeighborhood" value={user.providerNeighborhood || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerNeighborhood: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerCity">Cidade</Label>
              <Input id="providerCity" value={user.providerCity || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerCity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerState">Estado</Label>
              <Input id="providerState" value={user.providerState || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerState: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Instrutor (PF)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="providerRg">RG</Label>
              <Input id="providerRg" value={user.providerRg || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerRg: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerBirth">Data de nascimento</Label>
              <Input id="providerBirth" type="date" value={user.providerBirth || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerBirth: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerEducation">Formação acadêmica</Label>
              <Input id="providerEducation" value={user.providerEducation || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerEducation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerSpecialties">Especializações</Label>
              <Input id="providerSpecialties" value={user.providerSpecialties || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerSpecialties: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerSummary">Currículo resumido</Label>
              <Textarea id="providerSummary" value={user.providerSummary || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerSummary: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerCertifications">Certificações</Label>
              <Input id="providerCertifications" value={user.providerCertifications || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerCertifications: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Instituição (PJ)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="providerTradeName">Nome fantasia</Label>
              <Input id="providerTradeName" value={user.providerTradeName || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerTradeName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerStateReg">Inscrição estadual</Label>
              <Input id="providerStateReg" value={user.providerStateReg || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerStateReg: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerLegal">Responsável legal</Label>
              <Input id="providerLegal" value={user.providerLegal || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerLegal: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerSegment">Segmento</Label>
              <Input id="providerSegment" value={user.providerSegment || ''} disabled={!isEditing} onChange={(e) => updateUser({ providerSegment: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Dados do Curso
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">Nome do curso</Label>
              <Input id="courseName" value={user.courseName || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseCategory">Categoria</Label>
              <Input id="courseCategory" value={user.courseCategory || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseCategory: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseMode">Modalidade</Label>
              <Select value={user.courseMode || ''} onValueChange={(value) => updateUser({ courseMode: value })} disabled={!isEditing}>
                <SelectTrigger id="courseMode">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Híbrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseWorkload">Carga horária</Label>
              <Input id="courseWorkload" value={user.courseWorkload || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseWorkload: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseDuration">Duração</Label>
              <Input id="courseDuration" value={user.courseDuration || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseDuration: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseLevel">Nível</Label>
              <Select value={user.courseLevel || ''} onValueChange={(value) => updateUser({ courseLevel: value })} disabled={!isEditing}>
                <SelectTrigger id="courseLevel">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Básico">Básico</SelectItem>
                  <SelectItem value="Intermediário">Intermediário</SelectItem>
                  <SelectItem value="Avançado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coursePrerequisites">Pré-requisitos</Label>
              <Input id="coursePrerequisites" value={user.coursePrerequisites || ''} disabled={!isEditing} onChange={(e) => updateUser({ coursePrerequisites: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseSyllabus">Conteúdo programático</Label>
              <Textarea id="courseSyllabus" value={user.courseSyllabus || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseSyllabus: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseObjectives">Objetivos</Label>
              <Textarea id="courseObjectives" value={user.courseObjectives || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseObjectives: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseAudience">Público-alvo</Label>
              <Input id="courseAudience" value={user.courseAudience || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseAudience: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseCertification">Certificação</Label>
              <Select value={user.courseCertification || ''} onValueChange={(value) => updateUser({ courseCertification: value })} disabled={!isEditing}>
                <SelectTrigger id="courseCertification">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coursePrice">Valor</Label>
              <Input id="coursePrice" value={user.coursePrice || ''} disabled={!isEditing} onChange={(e) => updateUser({ coursePrice: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coursePayment">Forma de pagamento</Label>
              <Input id="coursePayment" value={user.coursePayment || ''} disabled={!isEditing} onChange={(e) => updateUser({ coursePayment: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseSeats">Número de vagas</Label>
              <Input id="courseSeats" value={user.courseSeats || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseSeats: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseDates">Datas disponíveis</Label>
              <Input id="courseDates" value={user.courseDates || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseDates: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseLocation">Local (presencial)</Label>
              <Input id="courseLocation" value={user.courseLocation || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseLocation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coursePlatform">Plataforma (online)</Label>
              <Input id="coursePlatform" value={user.coursePlatform || ''} disabled={!isEditing} onChange={(e) => updateUser({ coursePlatform: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Dados Bancários
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Banco</Label>
              <Input id="bankName" value={user.bankName || ''} disabled={!isEditing} onChange={(e) => updateUser({ bankName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAgency">Agência</Label>
              <Input id="bankAgency" value={user.bankAgency || ''} disabled={!isEditing} onChange={(e) => updateUser({ bankAgency: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Conta</Label>
              <Input id="bankAccount" value={user.bankAccount || ''} disabled={!isEditing} onChange={(e) => updateUser({ bankAccount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountType">Tipo de conta</Label>
              <Input id="bankAccountType" value={user.bankAccountType || ''} disabled={!isEditing} onChange={(e) => updateUser({ bankAccountType: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pixKey">Chave PIX</Label>
              <Input id="pixKey" value={user.pixKey || ''} disabled={!isEditing} onChange={(e) => updateUser({ pixKey: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Dados de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loginEmail">Login (e-mail)</Label>
              <Input id="loginEmail" type="email" value={user.email || ''} disabled={!isEditing} onChange={(e) => updateUser({ email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} disabled={!isEditing} onChange={(e) => setPassword(e.target.value)} placeholder="Nova senha" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmação de senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} disabled={!isEditing} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirme a senha" />
            </div>
          </CardContent>
        </Card>

        {renderSecurityCard()}
      </div>
    );
  }

  if (user?.role === ROLES.ADMIN) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Perfil do Admin</h1>
            <p className="text-muted-foreground">Gerencie seus dados de acesso</p>
          </div>
          <Button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            variant={isEditing ? 'default' : 'outline'}
          >
            {isEditing ? 'Salvar' : 'Editar Perfil'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={user.name || ''} disabled={!isEditing} onChange={(e) => updateUser({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={user.email || ''} disabled={!isEditing} onChange={(e) => updateUser({ email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPhone">Telefone</Label>
              <Input id="adminPhone" value={user.adminPhone || ''} disabled={!isEditing} onChange={(e) => updateUser({ adminPhone: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Dados de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loginEmail">Login (e-mail)</Label>
              <Input id="loginEmail" type="email" value={user.email || ''} disabled={!isEditing} onChange={(e) => updateUser({ email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} disabled={!isEditing} onChange={(e) => setPassword(e.target.value)} placeholder="Nova senha" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmação de senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} disabled={!isEditing} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirme a senha" />
            </div>
          </CardContent>
        </Card>

        {renderSecurityCard()}
      </div>
    );
  }

  // Renderização padrão para Estudante
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>
        <Button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          variant={isEditing ? 'default' : 'outline'}
        >
          {isEditing ? 'Salvar' : 'Editar Perfil'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={user.name}
                disabled={!isEditing}
                onChange={(e) => updateUser({ name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={user.cpf || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ cpf: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={user.rg || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ rg: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={user.birthDate || ''}
                disabled={!isEditing}
                onChange={(e) => updateUser({ birthDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">Sexo</Label>
              <Select
                value={user.sex || ''}
                onValueChange={(value) => updateUser({ sex: value })}
                disabled={!isEditing}
              >
                <SelectTrigger id="sex">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                  <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus">Estado civil</Label>
              <Select
                value={user.maritalStatus || ''}
                onValueChange={(value) => updateUser({ maritalStatus: value })}
                disabled={!isEditing}
              >
                <SelectTrigger id="maritalStatus">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                  <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                  <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                  <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled={!isEditing}
              onChange={(e) => updateUser({ email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone celular</Label>
            <Input
              id="phone"
              value={user.phone || ''}
              disabled={!isEditing}
              onChange={(e) => updateUser({ phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={user.whatsapp || ''}
              disabled={!isEditing}
              onChange={(e) => updateUser({ whatsapp: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" value={user.cep || ''} disabled={!isEditing} onChange={(e) => updateUser({ cep: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street">Rua</Label>
            <Input id="street" value={user.street || ''} disabled={!isEditing} onChange={(e) => updateUser({ street: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Número</Label>
            <Input id="number" value={user.number || ''} disabled={!isEditing} onChange={(e) => updateUser({ number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input id="neighborhood" value={user.neighborhood || ''} disabled={!isEditing} onChange={(e) => updateUser({ neighborhood: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" value={user.city || ''} disabled={!isEditing} onChange={(e) => updateUser({ city: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Input id="state" value={user.state || ''} disabled={!isEditing} onChange={(e) => updateUser({ state: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Dados Acadêmicos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="education">Escolaridade atual</Label>
            <Input id="education" value={user.education || ''} disabled={!isEditing} onChange={(e) => updateUser({ education: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="courseInterest">Curso de interesse</Label>
            <Input id="courseInterest" value={user.courseInterest || ''} disabled={!isEditing} onChange={(e) => updateUser({ courseInterest: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="areaInterest">Área de interesse</Label>
            <Input id="areaInterest" value={user.areaInterest || ''} disabled={!isEditing} onChange={(e) => updateUser({ areaInterest: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="institution">Instituição atual</Label>
            <Input id="institution" value={user.institution || ''} disabled={!isEditing} onChange={(e) => updateUser({ institution: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Dados de Acesso
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="loginEmail">Login (e-mail)</Label>
            <Input id="loginEmail" type="email" value={user.email} disabled={!isEditing} onChange={(e) => updateUser({ email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} disabled={!isEditing} onChange={(e) => setPassword(e.target.value)} placeholder="Nova senha" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmação de senha</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} disabled={!isEditing} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirme a senha" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Foto de perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            disabled={!isEditing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                updateUser({ profilePhotoUrl: url, profilePhotoName: file.name });
              }
            }}
          />
          {user.profilePhotoUrl && (
            <img src={user.profilePhotoUrl} alt="Foto de perfil" className="h-24 w-24 rounded-full object-cover" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Cursos Concluídos
          </CardTitle>
          <CardDescription>Histórico de aprendizado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {user.completedCourses?.length > 0 ? (
              user.completedCourses.map((courseId) => (
                <div key={courseId} className="flex items-center justify-between p-3 rounded-lg border">
                  <span>Desenvolvimento Web Full Stack</span>
                  <Badge variant="secondary">Concluído</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Nenhum curso concluído ainda</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Vagas Aplicadas
          </CardTitle>
          <CardDescription>Status das candidaturas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {user.appliedJobs?.length > 0 ? (
              user.appliedJobs.map((jobId) => (
                <div key={jobId} className="p-4 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Desenvolvedor Frontend Júnior</span>
                    <Badge>Em análise</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">TechCorp • Enviado em 10/01/2026</p>
                  <div className="p-3 bg-muted rounded text-sm">
                    <p className="font-medium mb-1">Feedback da empresa:</p>
                    <p className="text-muted-foreground">
                      Seu perfil está sendo analisado. Retornaremos em até 5 dias úteis.
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Nenhuma candidatura enviada ainda</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Currículo
          </CardTitle>
          <CardDescription>Upload e gerenciamento do seu currículo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.resumeUrl ? (
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">{user.resumeFileName || 'curriculo.pdf'}</p>
                <p className="text-sm text-muted-foreground">Enviado</p>
              </div>
              <a href={user.resumeUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">
                Abrir PDF
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">Nenhum currículo enviado</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="resumeUpload">Enviar currículo</Label>
            <Input
              id="resumeUpload"
              type="file"
              accept=".pdf,application/pdf"
              disabled={isUploadingResume}
              onChange={handleResumeUpload}
            />
            <p className="text-xs text-muted-foreground">Somente PDF. O arquivo enviado fica disponível para as candidaturas.</p>
            {isUploadingResume && <p className="text-xs text-muted-foreground">Enviando currículo...</p>}
          </div>
        </CardContent>
      </Card>

      {renderSecurityCard()}
    </div>
  );
}
