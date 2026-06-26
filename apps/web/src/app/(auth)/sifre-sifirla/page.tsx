import Link from 'next/link';
import { resetPassword } from '@/lib/auth-actions';
import { AuthForm, AuthInput } from '@/components/auth/auth-form';

export const metadata = { title: 'Şifre Sıfırla — NEXUS OS' };

export default function ResetPasswordPage() {
  return (
    <AuthForm
      title="Şifre Sıfırla"
      subtitle="E-posta adresinize sıfırlama bağlantısı göndereceğiz"
      action={resetPassword}
      submitLabel="Bağlantı Gönder"
      footer={
        <Link href="/giris" className="text-primary hover:underline">
          Giriş sayfasına dön
        </Link>
      }
    >
      <AuthInput name="email" type="email" label="E-posta" placeholder="ornek@email.com" />
    </AuthForm>
  );
}
