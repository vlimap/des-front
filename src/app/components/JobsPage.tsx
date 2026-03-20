import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { mockJobs } from '@/app/data/mockData';
import { Briefcase, MapPin, DollarSign, Award, Filter, Loader2, RefreshCw, Calendar, Users, Share2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/app/contexts/UserContext';
import { ROLES } from '@/app/constants/roles';
import { CompanyJobsManagement } from '@/app/components/CompanyJobsManagement';
import { IS_PRODUCTION } from '@/app/config/runtime';
import * as api from '@/app/services/api';

// Helper: calcula match aleatório baseado no id (para vagas da API que não têm match)
function computeMatch(jobId: string): number {
  let hash = 0;
  for (let i = 0; i < jobId.length; i++) hash = ((hash << 5) - hash) + jobId.charCodeAt(i);
  return 60 + Math.abs(hash) % 35; // 60-94%
}

export function JobsPage() {
  const { user, updateUser } = useUser();
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [suggestJob, setSuggestJob] = useState<any | null>(null);
  const [suggestEmail, setSuggestEmail] = useState('');
  const [suggestName, setSuggestName] = useState('');
  
  // Se for empresa, mostrar tela de gerenciamento
  if (user?.role === ROLES.COMPANY) {
    return <CompanyJobsManagement />;
  }

  // Para estudantes e admin, mostrar tela de busca de vagas
  const [apiJobs, setApiJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [pendingJob, setPendingJob] = useState<any | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const [filter, setFilter] = useState({
    area: 'all',
    type: 'all',
    location: '',
  });

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const response = await api.getAllJobs();
      const fetched = (response.jobs || []).map((job: any) => ({
        ...job,
        company: job.companyName || job.company || 'Empresa',
        match: job.match || computeMatch(job.id),
        requirements: job.requirements || [],
        salary: job.salary || 'A combinar',
        location: job.location || 'Não informado',
        deadline: job.deadline || job.expirationDate,
      }));
      setApiJobs(fetched);
    } catch (error) {
      console.error('Erro ao carregar vagas do servidor:', error);
      setApiJobs([]);
      if (IS_PRODUCTION) {
        toast.error('Não foi possível carregar as vagas no momento.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (Array.isArray(user?.appliedJobs)) {
      setAppliedJobs(user.appliedJobs);
    } else {
      setAppliedJobs([]);
    }
  }, [user?.appliedJobs]);

  const isMockFallbackJob = (jobId: string) =>
    !apiJobs.some((job) => job.id === jobId) && mockJobs.some((job) => job.id === jobId);

  // Em produção exibimos apenas dados reais do backend.
  const allJobs = IS_PRODUCTION
    ? apiJobs
    : [...apiJobs, ...mockJobs.filter((mj) => !apiJobs.some((aj) => aj.id === mj.id))];

  const filteredJobs = allJobs.filter(job => {
    if (filter.area !== 'all' && job.area !== filter.area) return false;
    if (filter.type !== 'all' && job.type !== filter.type) return false;
    if (filter.location && !job.location.toLowerCase().includes(filter.location.toLowerCase())) return false;
    return true;
  });

  const markApplied = (job: any, resumePatch?: { resumeUrl?: string; resumeFileName?: string }) => {
    const nextApplied = Array.from(new Set([...(appliedJobs || []), job.id]));
    setAppliedJobs(nextApplied);

    if (updateUser) {
      const previousApplications = Array.isArray(user?.jobApplications) ? user.jobApplications : [];
      const jobSnapshot = {
        id: job.id,
        title: job.title,
        company: job.company,
        area: job.area,
        location: job.location,
        type: job.type,
        status: 'Candidatura enviada',
        match: job.match,
        salary: job.salary,
      };

      const nextJobApplications = [jobSnapshot, ...previousApplications.filter((j: any) => j.id !== job.id)];

      updateUser({
        appliedJobs: nextApplied,
        jobApplications: nextJobApplications,
        ...(resumePatch || {}),
      });
    }
  };

  const handleApply = async (job: any) => {
    if (!user?.id) {
      toast.error('Faça login para se candidatar');
      return;
    }
    if (appliedJobs.includes(job.id)) {
      setOverlayMessage('Você já se inscreveu nesta vaga.');
      return;
    }
    if (!user?.resumeUrl) {
      setPendingJob(job);
      resumeInputRef.current?.click();
      return;
    }
    try {
      setApplyingJobId(job.id);
      await api.applyToJob({
        jobId: job.id,
        candidateId: user.id,
        candidateData: {
          name: user.name,
          email: user.email,
          resumeUrl: user.resumeUrl,
          resumeFileName: user.resumeFileName,
        },
      });
      toast.success(`Candidatura enviada para "${job.title}"!`);
      markApplied(job);
    } catch (error: any) {
      if (!IS_PRODUCTION && isMockFallbackJob(job.id)) {
        toast.success(`Candidatura enviada para "${job.title}"!`);
        markApplied(job);
      } else {
        toast.error(error?.message || 'Erro ao enviar candidatura.');
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleShare = async (job: any) => {
    const shareUrl = `${window.location.origin}/vagas/${job.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, text: `Vaga: ${job.title} em ${job.company}`, url: shareUrl });
        toast.success('Vaga compartilhada');
      } catch (err) {
        // ignore cancel
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copiado para a área de transferência');
    } catch (err) {
      toast.error('Não foi possível compartilhar agora.');
    }
  };

  const handleSuggest = (job: any) => {
    setSuggestJob(job);
    setSuggestEmail('');
    setSuggestName('');
  };

  const handleSendSuggestion = () => {
    if (!suggestEmail.trim()) {
      toast.error('Informe um e-mail para enviar a sugestão.');
      return;
    }
    toast.success(`Sugestão enviada para ${suggestEmail}${suggestName ? ` (${suggestName})` : ''}`);
    setSuggestJob(null);
  };

  const getDeadlineTone = (deadline?: string) => {
    if (!deadline) return 'border-border';
    const end = new Date(deadline);
    if (Number.isNaN(end.getTime())) return 'border-border';
    const now = new Date();
    const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 0) return 'border-red-500/60 bg-red-50/40 dark:bg-red-950/20';
    if (diffDays <= 3) return 'border-red-500/60 bg-red-50/40 dark:bg-red-950/20';
    if (diffDays <= 7) return 'border-yellow-400/60 bg-yellow-50/40 dark:bg-yellow-950/20';
    return 'border-green-500/60 bg-green-50/40 dark:bg-green-950/20';
  };

  const handleResumeSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const job = pendingJob;
    setPendingJob(null);
    event.target.value = '';

    if (!file) {
      return;
    }
    if (!job || !user?.id) {
      toast.error('Não foi possível enviar o currículo. Tente novamente.');
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Envie um currículo em PDF.');
      return;
    }

    let resumePatch: { resumeUrl?: string; resumeFileName?: string } | undefined;
    try {
      setApplyingJobId(job.id);
      const upload = await api.uploadResume(file, user.id);
      const resumeUrl = upload.downloadUrl || upload.url;
      const resumeFileName = upload.fileName || file.name;
      resumePatch = { resumeUrl, resumeFileName };

      await api.applyToJob({
        jobId: job.id,
        candidateId: user.id,
        candidateData: {
          name: user.name,
          email: user.email,
          resumeUrl,
          resumeFileName,
        },
      });

      toast.success(`Candidatura enviada para "${job.title}"!`);
      markApplied(job, resumePatch);
    } catch (error: any) {
      if (!IS_PRODUCTION && isMockFallbackJob(job.id) && resumePatch) {
        toast.success(`Candidatura enviada para "${job.title}"!`);
        markApplied(job, resumePatch);
      } else {
        toast.error(error?.message || 'Erro ao enviar currículo ou candidatura.');
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {overlayMessage && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="bg-background border shadow-lg rounded-lg p-4 w-full max-w-sm text-center space-y-2">
            <p className="text-sm font-medium">{overlayMessage}</p>
            <Button size="sm" onClick={() => setOverlayMessage(null)}>Fechar</Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vagas Disponíveis</h1>
          <p className="text-sm md:text-base text-muted-foreground">Encontre oportunidades compatíveis com seu perfil</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadJobs} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Filter className="h-4 w-4 md:h-5 md:w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Localização</label>
              <Input
                placeholder="Cidade, estado..."
                value={filter.location}
                onChange={(e) => setFilter({ ...filter, location: e.target.value })}
                className="h-9 md:h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Área</label>
              <Select
                value={filter.area}
                onValueChange={(value) => setFilter({ ...filter, area: value })}
              >
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  <SelectItem value="TI">Tecnologia</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Administração">Administração</SelectItem>
                  <SelectItem value="Vendas">Vendas</SelectItem>
                  <SelectItem value="RH">Recursos Humanos</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Tipo</label>
              <Select
                value={filter.type}
                onValueChange={(value) => setFilter({ ...filter, type: value })}
              >
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="Estágio">Estágio</SelectItem>
                  <SelectItem value="Primeiro Emprego">Primeiro Emprego</SelectItem>
                  <SelectItem value="Menor Aprendiz">Menor Aprendiz</SelectItem>
                  <SelectItem value="Emprego">Emprego</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Carregando vagas...</span>
        </div>
      )}

      {/* Lista de Vagas */}
      <div className="space-y-3 md:space-y-4">
        {!isLoading && filteredJobs.map((job) => {
          const isApplied = appliedJobs.includes(job.id);
          const applicationDetails = (Array.isArray(user?.jobApplications) ? user?.jobApplications : []).find((j: any) => j.id === job.id);
          return (
          <Card
            key={job.id}
            className={`hover:shadow-lg transition-shadow ${isApplied ? 'border-green-500/60 bg-green-50/40 dark:bg-green-950/20' : ''} ${getDeadlineTone(job.deadline)}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base md:text-lg line-clamp-2">{job.title}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">{job.company}</CardDescription>
                </div>
                <Badge variant={job.type === 'Estágio' ? 'secondary' : 'default'} className="text-xs shrink-0">
                  {job.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 md:space-y-4">
                  {/* 1. Informações principais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><MapPin className="h-3 w-3 md:h-4 md:w-4" /><span className="truncate">{job.location || 'Local não informado'}</span></div>
                    <div className="flex items-center gap-2"><Briefcase className="h-3 w-3 md:h-4 md:w-4" /><span>{job.type || 'Contrato'}</span></div>
                    <div className="flex items-center gap-2"><DollarSign className="h-3 w-3 md:h-4 md:w-4" /><span>{job.salary || 'A combinar'}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="h-3 w-3 md:h-4 md:w-4" /><span>Publicado: {job.createdAt ? new Date(job.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}</span></div>
                    <div className="flex items-center gap-2"><Award className="h-3 w-3 md:h-4 md:w-4" /><span>Compatibilidade: {job.match}%</span></div>
                    <div className="flex items-center gap-2"><Users className="h-3 w-3 md:h-4 md:w-4" /><span>{job.candidatesCount || 0} candidatos</span></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleApply(job)}
                      className="w-full h-9 md:h-10 text-sm md:text-base"
                      size="lg"
                      disabled={isApplied || applyingJobId === job.id}
                    >
                      {isApplied ? 'Candidatado' : applyingJobId === job.id ? 'Enviando...' : 'Candidatar-se'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-9 md:h-10 text-sm md:text-base"
                      onClick={() => setSelectedJob({ ...job, applicationDetails })}
                    >
                      Ver detalhes
                    </Button>
                  </div>

                  {/* 2. Descrição */}
                  <div className="border rounded-lg p-3 md:p-4 space-y-2">
                    <p className="text-sm font-semibold">Descrição da vaga</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{job.description || 'Desenvolver interfaces, participar de code reviews e integrar APIs.'}</p>
                  </div>

                  {/* 3. Requisitos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border rounded-lg p-3 space-y-2">
                      <p className="text-sm font-semibold">Obrigatórios</p>
                      <div className="flex flex-wrap gap-1.5 text-xs md:text-sm">
                        {(job.requirements || ['React', 'JavaScript/TypeScript', 'Git']).map((req: string, idx: number) => (
                          <Badge key={idx} variant="outline">{req}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="border rounded-lg p-3 space-y-2">
                      <p className="text-sm font-semibold">Diferenciais</p>
                      <div className="flex flex-wrap gap-1.5 text-xs md:text-sm">
                        {(job.niceToHave || ['Next.js', 'Testes automatizados', 'Inglês']).map((req: string, idx: number) => (
                          <Badge key={idx} variant="secondary">{req}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Benefícios */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-semibold">Benefícios</p>
                    <div className="flex flex-wrap gap-1.5 text-xs md:text-sm text-muted-foreground">
                      {(job.benefits || ['Vale alimentação', 'Plano de saúde', 'Home office', 'Horário flexível', 'Bônus']).map((b: string, idx: number) => (
                        <Badge key={idx} variant="outline">{b}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* 5. Sobre a empresa */}
                  <div className="border rounded-lg p-3 space-y-1 text-xs md:text-sm text-muted-foreground">
                    <p className="text-sm font-semibold text-foreground">Sobre a empresa</p>
                    <p>{job.companyDescription || 'Empresa focada em tecnologia e experiência do usuário.'}</p>
                    <p>Segmento: {job.companySegment || 'Tecnologia'}</p>
                    <p>Tamanho: {job.companySize || '51-200'}</p>
                    <p>Cultura: {job.companyCulture || 'Colaboração, aprendizado contínuo e autonomia.'}</p>
                    {job.companySite && <a className="text-primary" href={job.companySite} target="_blank" rel="noreferrer">Visitar site</a>}
                  </div>

                  {/* 6. Candidatura */}
                    <div className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-semibold">Informações para candidatura</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm text-muted-foreground">
                      <span>Status: {isApplied ? 'Já candidatado' : 'Disponível'}</span>
                      <span>Prazo final: {job.deadline || 'Não informado'}</span>
                      <span>Etapas: {job.stages || 'Envio CV → Entrevista → Oferta'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleApply(job)} disabled={isApplied || applyingJobId === job.id}>Enviar currículo</Button>
                      <Button size="sm" variant="outline" onClick={() => handleSuggest(job)}>
                        <Send className="h-3 w-3 mr-1" /> Sugerir para alguém
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleShare(job)}>
                        <Share2 className="h-3 w-3 mr-1" /> Compartilhar
                      </Button>
                    </div>
                  </div>

                  {/* 7. Extras */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs md:text-sm">
                    <div className="border rounded-lg p-3 flex items-center justify-between"><span>Compatibilidade</span><Badge variant="secondary">{job.match}%</Badge></div>
                    <div className="border rounded-lg p-3 flex items-center justify-between"><span>Similares</span><Badge variant="outline">Sugestões</Badge></div>
                    <div className="border rounded-lg p-3 flex items-center justify-between"><span>Recrutador</span><Badge variant="outline">Em breve</Badge></div>
                  </div>
                </div>
            </CardContent>
          </Card>
        );
        })}
      </div>

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhes da candidatura</DialogTitle>
            <DialogDescription>Veja as informações da vaga e da sua candidatura.</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-base leading-tight">{selectedJob.title}</p>
                  <p className="text-muted-foreground text-sm">{selectedJob.company}</p>
                </div>
                <Badge variant={selectedJob.type === 'Estágio' ? 'secondary' : 'default'}>{selectedJob.type || '—'}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                <div className="flex items-center justify-between"><span>Local</span><span>{selectedJob.location || '—'}</span></div>
                <div className="flex items-center justify-between"><span>Salário</span><span>{selectedJob.salary || 'A combinar'}</span></div>
                <div className="flex items-center justify-between"><span>Compatibilidade</span><span>{selectedJob.match ? `${selectedJob.match}%` : '—'}</span></div>
                <div className="flex items-center justify-between"><span>Status</span><span>{selectedJob.applicationDetails?.status || 'Candidatura enviada'}</span></div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Descrição</p>
                <p className="text-sm text-muted-foreground">{selectedJob.description || 'Desenvolver interfaces, participar de code reviews e integrar APIs.'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Requisitos</p>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedJob.requirements || ['React', 'JavaScript/TypeScript', 'Git']).map((req: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">{req}</Badge>
                  ))}
                </div>
              </div>

              {selectedJob.applicationDetails?.resumeFileName && (
                <div className="flex items-center justify-between text-muted-foreground text-sm">
                  <span>Currículo enviado</span>
                  <span>{selectedJob.applicationDetails.resumeFileName}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1" disabled>Editar candidatura (em breve)</Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelectedJob(null)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de sugestão */}
      <Dialog open={!!suggestJob} onOpenChange={(open) => !open && setSuggestJob(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sugerir vaga para alguém</DialogTitle>
            <DialogDescription>Envie o link desta vaga para um contato.</DialogDescription>
          </DialogHeader>
          {suggestJob && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">{suggestJob.title}</p>
                <p className="text-xs text-muted-foreground">{suggestJob.company}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Nome (opcional)</label>
                <Input value={suggestName} onChange={(e) => setSuggestName(e.target.value)} placeholder="Nome do contato" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">E-mail para envio</label>
                <Input value={suggestEmail} onChange={(e) => setSuggestEmail(e.target.value)} placeholder="contato@email.com" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSendSuggestion}>Enviar sugestão</Button>
                <Button variant="outline" className="flex-1" onClick={() => setSuggestJob(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <input
        ref={resumeInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleResumeSelected}
        className="hidden"
      />

      {!isLoading && filteredJobs.length === 0 && (
        <Card>
          <CardContent className="py-8 md:py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm md:text-base text-muted-foreground mb-2">
              Nenhuma vaga encontrada com os filtros selecionados.
            </p>
            <Button variant="outline" size="sm" onClick={loadJobs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
