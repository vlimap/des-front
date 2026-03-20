import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useUser } from '@/app/contexts/UserContext';
import { requestEmailVerification } from '@/app/services/api';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithCredentials } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [requires2faSetup, setRequires2faSetup] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      setError(null);
      setEmailNotVerified(false);
      setRequires2faSetup(false);
      const result = await loginWithCredentials(email, password, requires2fa ? otp : undefined);
      if (result?.ok) {
        navigate('/dashboard');
        return;
      }
      if (result?.requires2fa) {
        setRequires2fa(true);
        setError(result?.error === 'invalid_otp' ? 'Código do autenticador inválido.' : 'Digite o código do autenticador para continuar.');
        return;
      }
      if (result?.emailNotVerified) {
        setEmailNotVerified(true);
        setError('E-mail não verificado. Envie o código e confirme.');
        return;
      }
      if (result?.requires2faSetup) {
        setRequires2faSetup(true);
        setError('Você precisa configurar o 2FA antes de entrar. Conclua o cadastro ou peça suporte.');
        return;
      }
      setError('Credenciais inválidas.');
    })();
  };

  const handleSendVerification = async () => {
    if (!email) return;
    setIsSendingCode(true);
    try {
      const response = await requestEmailVerification({ email });
      if (response?.otp) {
        toast.success(`Código de verificação: ${response.otp}`);
      } else {
        toast.success('Código de verificação enviado.');
      }
    } catch (err) {
      toast.error('Não foi possível enviar o código.');
    } finally {
      setIsSendingCode(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Decorative sponsor images (absolute, don't affect layout).
          Place your images in `frontend/public/sponsors/` with these names:
          sponsor1.png ... sponsor6.png
      */}
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <img src="/sponsors/assai.webp" alt="" aria-hidden="true" className="absolute left-6 top-12 h-16 opacity-100 rotate-6 transform" />
        <img src="/sponsors/atacadao.webp" alt="" aria-hidden="true" className="absolute -right-10 -top-10 h-20 opacity-100 -rotate-6 transform" />
        <img src="/sponsors/brandili_large.webp" alt="" aria-hidden="true" className="absolute left-14 bottom-6 h-24 opacity-100 rotate-3 transform" />
        <img src="/sponsors/cacau_chow.webp" alt="" aria-hidden="true" className="absolute -right-20 bottom-24 h-14 opacity-100 -rotate-12 transform" />
        <img src="/sponsors/CVC.webp" alt="" aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 top-6 h-12 opacity-100 rotate-12 transform" />
        <img src="/sponsors/sponsor6.webp" alt="" aria-hidden="true" className="absolute left-10 top-1/2 -translate-y-1/2 h-20 opacity-100 -rotate-12 transform" />
      </div>

      <Card className="w-full max-w-md relative z-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/')}
          className="absolute top-3 right-3 flex items-center gap-2 px-2 py-1"
          aria-label="Voltar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-gray-600" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm hover:text-blue-600">Voltar</span>
        </Button>

        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Entrar</CardTitle>
          <CardDescription className="text-sm">Use seu e-mail e senha para entrar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {requires2fa && (
              <div className="space-y-2">
                <Label htmlFor="otp">Código 2FA</Label>
                <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
              </div>
            )}

            <div className="text-sm">
              <button type="button" onClick={() => navigate('/esqueci-senha')} className="text-blue-600 hover:underline">Esqueci minha senha</button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {requires2faSetup && (
              <Alert>
                <AlertDescription className="text-sm">
                  Finalize a configuração de 2FA no fluxo de cadastro (etapa final) e tente novamente. Se já concluiu, insira o código do autenticador.
                </AlertDescription>
              </Alert>
            )}

            {emailNotVerified && (
              <Button type="button" variant="outline" onClick={handleSendVerification} disabled={isSendingCode}>
                {isSendingCode ? 'Enviando...' : 'Enviar código de verificação'}
              </Button>
            )}

            <div className="flex gap-3">
              <Button type="submit" className="flex-1">Entrar</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/cadastro')}>Cadastrar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {/* Decorative sponsors are scattered around the viewport; no static strip */}
    </div>
  );
}
