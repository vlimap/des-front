import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Upload, User, Building2, GraduationCap, Shield, Info } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { requestEmailVerification, setupTwoFactor, verifyEmail, verifyTwoFactor } from '@/app/services/api';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/app/constants/roles';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login, registerUser } = useUser();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    area: '',
    education: '',
    resume: null,
    role: ROLES.STUDENT,
    companyName: '',
    companySize: '',
    expertise: '',
    yearsExperience: '',
    jobTypes: [],
    hiringFor: [],
    jobTypesOffered: [],
    coursePlatformName: '',
    courseCategories: [],
    acceptTerms: false,
    acceptSecurity: false,
    acceptLgpd: false,
  });

  const [errors, setErrors] = useState({});
  const [pendingVerification, setPendingVerification] = useState(null);
  const [emailCode, setEmailCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorUrl, setTwoFactorUrl] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorVerified, setTwoFactorVerified] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isSettingUp2fa, setIsSettingUp2fa] = useState(false);
  const [isVerifying2fa, setIsVerifying2fa] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.email.trim()) newErrors.email = 'E-mail é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'E-mail inválido';
    if (!formData.password) newErrors.password = 'Senha é obrigatória';
    else if (formData.password.length < 8) newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem';
    if (!formData.acceptTerms) newErrors.acceptTerms = 'Aceite os Termos de Uso';
    if (!formData.acceptSecurity) newErrors.acceptSecurity = 'Aceite os Termos de Segurança';
    if (!formData.acceptLgpd) newErrors.acceptLgpd = 'Aceite a LGPD';

    if (formData.role === ROLES.STUDENT) {
      if (!formData.age) newErrors.age = 'Idade é obrigatória';
      if (!formData.area) newErrors.area = 'Área de interesse é obrigatória';
      if (!formData.education) newErrors.education = 'Escolaridade é obrigatória';
      if (formData.jobTypes.length === 0) newErrors.jobTypes = 'Selecione pelo menos um tipo de vaga';
    }

    if (formData.role === ROLES.COMPANY) {
      if (!formData.companyName.trim()) newErrors.companyName = 'Nome da empresa é obrigatório';
      if (!formData.companySize) newErrors.companySize = 'Tamanho da empresa é obrigatório';
      if (formData.jobTypesOffered.length === 0) newErrors.jobTypesOffered = 'Selecione pelo menos um tipo de vaga oferecida';
    }

    if (formData.role === ROLES.COURSE_PROVIDER) {
      if (!formData.coursePlatformName.trim()) newErrors.coursePlatformName = 'Nome da plataforma é obrigatório';
      if (formData.courseCategories.length === 0) newErrors.courseCategories = 'Selecione pelo menos uma categoria de curso';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const userData = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      role: formData.role,
      createdAt: new Date().toISOString(),
      acceptTerms: formData.acceptTerms,
      acceptSecurity: formData.acceptSecurity,
      acceptLgpd: formData.acceptLgpd,
    };

    if (formData.role === ROLES.STUDENT) {
      userData.age = parseInt(formData.age);
      userData.area = formData.area;
      userData.education = formData.education;
      userData.resumeFileName = formData.resume ? formData.resume.name : undefined;
      userData.completedCourses = [];
      userData.appliedJobs = [];
      userData.enrolledCourses = [];
      userData.jobApplications = [];
      userData.points = 0;
      userData.badges = [];
      userData.jobTypes = formData.jobTypes;
    } else if (formData.role === ROLES.COMPANY) {
      userData.companyName = formData.companyName;
      userData.companySize = formData.companySize;
      userData.area = formData.area;
      userData.activeJobs = [];
      userData.hiredCandidates = [];
      userData.hiringFor = formData.hiringFor;
      userData.jobTypesOffered = formData.jobTypesOffered;
    } else if (formData.role === ROLES.COURSE_PROVIDER) {
      userData.coursePlatformName = formData.coursePlatformName;
      userData.courseCategories = formData.courseCategories;
      userData.activeCourses = [];
      userData.students = [];
    } else if (formData.role === ROLES.ADMIN) {
      userData.department = formData.area || 'Administração';
    }

    // Register user with password (uses registerUser which persists and logs in)
    try {
      const result = await registerUser(userData, formData.password);
      const ok = typeof result === 'boolean' ? result : result?.ok;
      if (ok) {
        if (result?.requiresEmailVerification || result?.requiresTwoFactor) {
          setPendingVerification({
            userId: result?.user?.id,
            email: result?.user?.email,
            requiresTwoFactor: !!result?.requiresTwoFactor,
            verification: result?.verification || null,
          });
          setEmailCode(result?.verification?.otp || '');
          setVerificationError('');
          return;
        }
        navigate('/dashboard');
      } else if (result?.error === 'consent_required') {
        setErrors({
          general: 'Você precisa aceitar os termos para continuar.',
          acceptTerms: 'Aceite os Termos de Uso',
          acceptSecurity: 'Aceite os Termos de Segurança',
          acceptLgpd: 'Aceite a LGPD',
        });
      } else {
        setErrors({ general: result?.error || 'Não foi possível criar a conta. Verifique os dados.' });
      }
    } catch (err) {
      setErrors({ general: 'Erro de servidor ao criar conta.' });
      console.error('register error', err);
    }
  };

  const handleSendVerification = async () => {
    if (!pendingVerification?.email && !pendingVerification?.userId) return;
    setIsSendingVerification(true);
    setVerificationError('');
    try {
      const response = await requestEmailVerification({ userId: pendingVerification.userId, email: pendingVerification.email });
      if (response?.otp) {
        setEmailCode(response.otp);
      }
    } catch (err) {
      setVerificationError('Não foi possível enviar o código de verificação.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode || !pendingVerification?.userId) return;
    setIsVerifyingEmail(true);
    setVerificationError('');
    try {
      await verifyEmail({ userId: pendingVerification.userId, code: emailCode });
      setEmailVerified(true);
    } catch (err) {
      setVerificationError('Código inválido ou expirado.');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleSetup2fa = async () => {
    if (!pendingVerification?.userId) return;
    setIsSettingUp2fa(true);
    setVerificationError('');
    try {
      const data = await setupTwoFactor({ userId: pendingVerification.userId, email: pendingVerification.email });
      setTwoFactorSecret(data.secret || '');
      setTwoFactorUrl(data.otpauthUrl || '');
    } catch (err) {
      setVerificationError('Não foi possível configurar o 2FA.');
    } finally {
      setIsSettingUp2fa(false);
    }
  };

  const handleVerify2fa = async () => {
    if (!pendingVerification?.userId || !twoFactorToken) return;
    setIsVerifying2fa(true);
    setVerificationError('');
    try {
      await verifyTwoFactor({ userId: pendingVerification.userId, token: twoFactorToken });
      setTwoFactorVerified(true);
      setTwoFactorToken('');
    } catch (err) {
      setVerificationError('Código 2FA inválido.');
    } finally {
      setIsVerifying2fa(false);
    }
  };

  if (pendingVerification) {
    const requiresTwoFactor = !!pendingVerification.requiresTwoFactor;
    const canFinish = emailVerified && (!requiresTwoFactor || twoFactorVerified);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Finalize seu cadastro</CardTitle>
            <CardDescription>
              Verifique seu e-mail para concluir o cadastro. O 2FA fica disponível para ativação quando exigido.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {verificationError && (
              <Alert variant="destructive">
                <AlertDescription>{verificationError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Verificação de e-mail</h3>
              {pendingVerification.verification?.otp && (
                <Alert>
                  <AlertDescription>
                    Ambiente de desenvolvimento: código OTP <span className="font-mono">{pendingVerification.verification.otp}</span>
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col md:flex-row gap-2">
                <Button type="button" variant="outline" onClick={handleSendVerification} disabled={isSendingVerification}>
                  {isSendingVerification ? 'Enviando...' : 'Enviar código'}
                </Button>
                <Input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="Código de verificação"
                />
                <Button type="button" onClick={handleVerifyEmail} disabled={isVerifyingEmail || emailVerified}>
                  {emailVerified ? 'Verificado' : isVerifyingEmail ? 'Verificando...' : 'Confirmar'}
                </Button>
              </div>
            </div>

            {requiresTwoFactor && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Autenticação em duas etapas (2FA)</h3>
                <div className="flex flex-col md:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={handleSetup2fa} disabled={isSettingUp2fa}>
                    {isSettingUp2fa ? 'Gerando...' : 'Gerar 2FA'}
                  </Button>
                  <Input
                    value={twoFactorToken}
                    onChange={(e) => setTwoFactorToken(e.target.value)}
                    placeholder="Código do autenticador"
                  />
                  <Button type="button" onClick={handleVerify2fa} disabled={isVerifying2fa || twoFactorVerified}>
                    {twoFactorVerified ? 'Ativado' : isVerifying2fa ? 'Verificando...' : 'Ativar'}
                  </Button>
                </div>
                {twoFactorSecret && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Chave secreta: <span className="font-mono">{twoFactorSecret}</span></p>
                    {twoFactorUrl && (
                      <p>URL otpauth: <span className="font-mono break-all">{twoFactorUrl}</span></p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/')}>Voltar</Button>
              <Button type="button" className="flex-1" disabled={!canFinish} onClick={() => navigate('/login')}>
                {canFinish ? 'Ir para login' : 'Complete as etapas acima'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case ROLES.STUDENT: return <User className="w-5 h-5" />;
      case ROLES.COMPANY: return <Building2 className="w-5 h-5" />;
      case ROLES.COURSE_PROVIDER: return <GraduationCap className="w-5 h-5" />;
      case ROLES.ADMIN: return <Shield className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
    }
  };

  const toggleArrayItem = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl md:text-2xl">Cadastro</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Preencha seus dados para começar sua jornada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {/* Seleção de Tipo de Conta */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo de Conta</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                {Object.entries(ROLES).map(([key, value]) => (
                  <Label
                    key={value}
                    htmlFor={`role-${value}`}
                    className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.role === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-background'
                    }`}
                  >
                    <RadioGroupItem value={value} id={`role-${value}`} className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        {getRoleIcon(value)}
                        {ROLE_LABELS[value]}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_DESCRIPTIONS[value]}
                      </p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {formData.role === ROLES.ADMIN && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Contas de administrador são para gerenciamento da plataforma e têm acesso total ao sistema.
                </AlertDescription>
              </Alert>
            )}

            {/* Dados Básicos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Dados Básicos
                </h3>
                <span className="text-xs text-red-600">* campos obrigatórios</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm">
                    {formData.role === ROLES.COMPANY ? 'Nome do Responsável' : 'Nome completo'} <span className="text-red-600">*</span>
                    <span className="text-xs text-red-600 ml-1">campo obrigatório</span>
                  </Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`h-9 md:h-10 text-sm ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">E-mail <span className="text-red-600">*</span>
                    <span className="text-xs text-red-600 ml-1">campo obrigatório</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`h-9 md:h-10 text-sm ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">Senha <span className="text-red-600">*</span>
                    <span className="text-xs text-red-600 ml-1">campo obrigatório</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`h-9 md:h-10 text-sm ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="Mínimo 8 caracteres"
                  />
                  {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm">Confirmar Senha <span className="text-red-600">*</span>
                    <span className="text-xs text-red-600 ml-1">campo obrigatório</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`h-9 md:h-10 text-sm ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                  {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Campos específicos para ESTUDANTE */}
            {formData.role === ROLES.STUDENT && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informações Acadêmicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-sm">Idade *</Label>
                    <Input
                      id="age"
                      type="number"
                      required
                      min="16"
                      max="100"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className={`h-9 md:h-10 text-sm ${errors.age ? 'border-red-500' : ''}`}
                    />
                    {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area" className="text-sm">Área de interesse *</Label>
                    <Select
                      required
                      value={formData.area}
                      onValueChange={(value) => setFormData({ ...formData, area: value })}
                    >
                      <SelectTrigger className={`h-9 md:h-10 text-sm ${errors.area ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TI">Tecnologia da Informação</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Administração">Administração</SelectItem>
                        <SelectItem value="Vendas">Vendas</SelectItem>
                        <SelectItem value="RH">Recursos Humanos</SelectItem>
                        <SelectItem value="Financeiro">Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.area && <p className="text-xs text-red-500">{errors.area}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="education" className="text-sm">Nível de escolaridade *</Label>
                    <Select
                      required
                      value={formData.education}
                      onValueChange={(value) => setFormData({ ...formData, education: value })}
                    >
                      <SelectTrigger className={`h-9 md:h-10 text-sm ${errors.education ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ensino Médio Completo">Ensino Médio Completo</SelectItem>
                        <SelectItem value="Superior Incompleto">Superior Incompleto</SelectItem>
                        <SelectItem value="Superior Completo">Superior Completo</SelectItem>
                        <SelectItem value="Pós-graduação">Pós-graduação</SelectItem>
                        <SelectItem value="Mestrado">Mestrado</SelectItem>
                        <SelectItem value="Doutorado">Doutorado</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.education && <p className="text-xs text-red-500">{errors.education}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="resume" className="text-sm">Currículo (opcional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="resume"
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => setFormData({ ...formData, resume: e.target.files?.[0] || null })}
                        className="flex-1 h-9 md:h-10 text-sm file:text-sm"
                      />
                      <Upload className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">Somente PDF. O envio efetivo acontece quando a candidatura for enviada.</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm">Tipos de Vaga que Procura *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['CLT', 'Estágio', 'Primeiro Emprego', 'Menor Aprendiz'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`jobType-${type}`}
                            checked={formData.jobTypes.includes(type)}
                            onCheckedChange={() => toggleArrayItem('jobTypes', type)}
                          />
                          <Label htmlFor={`jobType-${type}`} className="text-sm font-normal cursor-pointer">{type}</Label>
                        </div>
                      ))}
                    </div>
                    {errors.jobTypes && <p className="text-xs text-red-500">{errors.jobTypes}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Campos específicos para EMPRESA */}
            {formData.role === ROLES.COMPANY && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informações da Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm">Nome da Empresa *</Label>
                    <Input
                      id="companyName"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className={`h-9 md:h-10 text-sm ${errors.companyName ? 'border-red-500' : ''}`}
                    />
                    {errors.companyName && <p className="text-xs text-red-500">{errors.companyName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companySize" className="text-sm">Tamanho da Empresa *</Label>
                    <Select
                      required
                      value={formData.companySize}
                      onValueChange={(value) => setFormData({ ...formData, companySize: value })}
                    >
                      <SelectTrigger className={`h-9 md:h-10 text-sm ${errors.companySize ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 funcionários</SelectItem>
                        <SelectItem value="11-50">11-50 funcionários</SelectItem>
                        <SelectItem value="51-200">51-200 funcionários</SelectItem>
                        <SelectItem value="201-500">201-500 funcionários</SelectItem>
                        <SelectItem value="500+">Mais de 500 funcionários</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.companySize && <p className="text-xs text-red-500">{errors.companySize}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="area" className="text-sm">Setor de Atuação</Label>
                    <Select
                      value={formData.area}
                      onValueChange={(value) => setFormData({ ...formData, area: value })}
                    >
                      <SelectTrigger className="h-9 md:h-10 text-sm">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                        <SelectItem value="Varejo">Varejo</SelectItem>
                        <SelectItem value="Serviços">Serviços</SelectItem>
                        <SelectItem value="Indústria">Indústria</SelectItem>
                        <SelectItem value="Saúde">Saúde</SelectItem>
                        <SelectItem value="Educação">Educação</SelectItem>
                        <SelectItem value="Financeiro">Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm">Tipos de Funcionário que Procura</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['CLT', 'Estágio', 'Primeiro Emprego', 'Menor Aprendiz'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`hiring-${type}`}
                            checked={formData.hiringFor.includes(type)}
                            onCheckedChange={() => toggleArrayItem('hiringFor', type)}
                          />
                          <Label htmlFor={`hiring-${type}`} className="text-sm font-normal cursor-pointer">{type}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm">Tipos de Vaga Oferecida *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['CLT', 'Estágio', 'Primeiro Emprego', 'Menor Aprendiz'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`offered-${type}`}
                            checked={formData.jobTypesOffered.includes(type)}
                            onCheckedChange={() => toggleArrayItem('jobTypesOffered', type)}
                          />
                          <Label htmlFor={`offered-${type}`} className="text-sm font-normal cursor-pointer">{type}</Label>
                        </div>
                      ))}
                    </div>
                    {errors.jobTypesOffered && <p className="text-xs text-red-500">{errors.jobTypesOffered}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Campos específicos para PROVIDER DE CURSOS */}
            {formData.role === ROLES.COURSE_PROVIDER && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informações da Plataforma de Cursos
                </h3>
                <div className="grid grid-cols-1 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="coursePlatformName" className="text-sm">Nome da Plataforma *</Label>
                    <Input
                      id="coursePlatformName"
                      required
                      value={formData.coursePlatformName}
                      onChange={(e) => setFormData({ ...formData, coursePlatformName: e.target.value })}
                      className={`h-9 md:h-10 text-sm ${errors.coursePlatformName ? 'border-red-500' : ''}`}
                    />
                    {errors.coursePlatformName && <p className="text-xs text-red-500">{errors.coursePlatformName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Categorias de Curso *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Tecnologia', 'Marketing', 'Design', 'Administração', 'Vendas', 'RH', 'Liderança'].map(cat => (
                        <div key={cat} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cat-${cat}`}
                            checked={formData.courseCategories.includes(cat)}
                            onCheckedChange={() => toggleArrayItem('courseCategories', cat)}
                          />
                          <Label htmlFor={`cat-${cat}`} className="text-sm font-normal cursor-pointer">{cat}</Label>
                        </div>
                      ))}
                    </div>
                    {errors.courseCategories && <p className="text-xs text-red-500">{errors.courseCategories}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Campos específicos para ADMIN */}
            {formData.role === ROLES.ADMIN && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informações Administrativas
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="area" className="text-sm">Departamento</Label>
                  <Select
                    value={formData.area}
                    onValueChange={(value) => setFormData({ ...formData, area: value })}
                  >
                    <SelectTrigger className="h-9 md:h-10 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Administração">Administração Geral</SelectItem>
                      <SelectItem value="TI">Tecnologia da Informação</SelectItem>
                      <SelectItem value="RH">Recursos Humanos</SelectItem>
                      <SelectItem value="Financeiro">Financeiro</SelectItem>
                      <SelectItem value="Atendimento">Atendimento ao Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 border rounded-lg p-3">
              <p className="text-sm font-semibold">Termos, Segurança e LGPD</p>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="accept-terms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(value) => setFormData({ ...formData, acceptTerms: !!value })}
                />
                <Label htmlFor="accept-terms" className="text-sm font-normal">Aceito os Termos de Uso</Label>
              </div>
              {errors.acceptTerms && <p className="text-xs text-red-500">{errors.acceptTerms}</p>}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="accept-security"
                  checked={formData.acceptSecurity}
                  onCheckedChange={(value) => setFormData({ ...formData, acceptSecurity: !!value })}
                />
                <Label htmlFor="accept-security" className="text-sm font-normal">Aceito os Termos de Segurança</Label>
              </div>
              {errors.acceptSecurity && <p className="text-xs text-red-500">{errors.acceptSecurity}</p>}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="accept-lgpd"
                  checked={formData.acceptLgpd}
                  onCheckedChange={(value) => setFormData({ ...formData, acceptLgpd: !!value })}
                />
                <Label htmlFor="accept-lgpd" className="text-sm font-normal">Aceito o tratamento de dados conforme LGPD</Label>
              </div>
              {errors.acceptLgpd && <p className="text-xs text-red-500">{errors.acceptLgpd}</p>}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1 h-9 md:h-10 text-sm"
              >
                Voltar
              </Button>
              <Button type="submit" className="flex-1 h-9 md:h-10 text-sm">
                Criar Conta
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Os termos são obrigatórios no primeiro cadastro.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
