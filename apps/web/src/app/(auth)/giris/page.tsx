import Link from 'next/link';
import { signIn } from '@/lib/auth-actions';
import { AuthForm, AuthInput } from '@/components/auth/auth-form';

export const metadata = { title: 'Giriş — NEXUS OS' };

export default function LoginPage() {
  return (
    <AuthForm
      title="Giriş Yap"
      subtitle="Hesabınıza giriş yapın"
      action={signIn}
      submitLabel="Giriş Yap"
      footer={
        <>
          <Link href="/kayit" className="text-primary hover:underline">
            Hesap oluştur
          </Link>
          {' · '}
          <Link href="/sifre-sifirla" className="text-primary hover:underline">
            Şifremi unuttum
          </Link>
        </>
      }
    >
      <AuthInput name="email" type="email" label="E-posta" placeholder="ornek@email.com" />
      <AuthInput name="password" type="password" label="Şifre" placeholder="••••••••" />
    </AuthForm>
  );
}
