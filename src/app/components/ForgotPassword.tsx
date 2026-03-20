import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { requestPasswordReset } from '@/app/services/api';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestInfo, setRequestInfo] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await requestPasswordReset(email);
      setRequestInfo(response || { ok: true });
    } catch {
      setError('Não foi possível processar a solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (requestInfo?.userId) params.set('userId', requestInfo.userId);
    navigate(`/reset-password?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Recuperar senha</h1>
          <p className="text-gray-500 text-sm mt-1">Solicite um OTP para redefinir sua senha</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="pt-6">
            {!requestInfo ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fp-email" className="text-sm font-medium text-gray-700">
                    E-mail cadastrado
                  </Label>
                  <Input
                    id="fp-email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Solicitando...' : 'Solicitar OTP'}
                </Button>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                    Voltar ao login
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Solicitação recebida</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Se o e-mail estiver cadastrado, use o OTP recebido para redefinir sua senha.
                </p>

                {requestInfo?.otp && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-left">
                    <p className="text-xs font-semibold text-amber-800">Ambiente de desenvolvimento</p>
                    <p className="mt-1 text-sm text-amber-900">
                      OTP: <span className="font-mono font-semibold">{requestInfo.otp}</span>
                    </p>
                    {requestInfo?.expiresAt && (
                      <p className="mt-1 text-xs text-amber-700">Expira em {new Date(requestInfo.expiresAt).toLocaleString('pt-BR')}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Button type="button" className="w-full" onClick={handleContinue}>
                    Continuar para redefinir senha
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setRequestInfo(null);
                      setEmail('');
                    }}
                  >
                    Tentar outro e-mail
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
