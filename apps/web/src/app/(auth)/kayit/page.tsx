import Link from 'next/link';
import { signUp } from '@/lib/auth-actions';
import { AuthForm, AuthInput } from '@/components/auth/auth-form';

export const metadata = { title: 'Kayıt — NEXUS OS' };

export default function RegisterPage() {
  return (
    <AuthForm
      title="Hesap Oluştur"
      subtitle="NEXUS OS'a katılın"
      action={signUp}
      submitLabel="Kayıt Ol"
      footer={
        <Link href="/giris" className="text-primary hover:underline">
          Zaten hesabınız var mı? Giriş yapın
        </Link>
      }
    >
      <AuthInput name="name" label="Ad Soyad" placeholder="Adınız" />
      <AuthInput name="email" type="email" label="E-posta" placeholder="ornek@email.com" />
      <AuthInput name="password" type="password" label="Şifre" placeholder="En az 6 karakter" />
    </AuthForm>
  );
}
