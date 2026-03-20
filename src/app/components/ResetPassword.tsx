import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { resetPassword } from '@/app/services/api';

function PasswordStrength({ password }) {
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const label = ['', 'Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte'][strength] || '';
  if (!password) return null;

  return (
    <p className={`text-xs ${strength <= 2 ? 'text-red-500' : strength <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
      Força: {label}
    </p>
  );
}

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  const userId = searchParams.get('userId') || '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!email && !userId) {
      setError('E-mail ou usuário não informado. Solicite um novo OTP.');
      return;
    }
    if (!code.trim()) {
      setError('Informe o OTP recebido.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('A senha precisa conter letras e números.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ userId, email, code, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err?.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Redefinir senha</h1>
          <p className="text-gray-500 text-sm mt-1">Informe o OTP e sua nova senha</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="pt-6">
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="rp-email">E-mail</Label>
                  <Input id="rp-email" type="email" value={email} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rp-code">OTP</Label>
                  <Input
                    id="rp-code"
                    inputMode="numeric"
                    required
                    placeholder="123456"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rp-password">Nova senha</Label>
                  <Input
                    id="rp-password"
                    type="password"
                    required
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <PasswordStrength password={password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rp-confirm">Confirmar nova senha</Label>
                  <Input
                    id="rp-confirm"
                    type="password"
                    required
                    placeholder="Repita a nova senha"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Redefinindo...' : 'Redefinir senha'}
                </Button>

                <div className="text-center pt-2">
                  <Link to="/esqueci-senha" className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline">
                    Solicitar novo OTP
                  </Link>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Senha redefinida</h3>
                <p className="text-sm text-gray-500">
                  Sua senha foi alterada com sucesso. Você será redirecionado para o login.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
