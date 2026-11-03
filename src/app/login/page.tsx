import { AuthForm } from '@/components/auth-form';

export const metadata = {
  title: 'Log In | StackSwipe',
  description: 'Log in to your StackSwipe account using Google, GitHub, or Email.',
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-background via-background/70 to-background">
      <div className="absolute inset-0 -z-10 pointer-events-none flex items-center justify-center">
        <div className="h-[450px] w-[450px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md py-8">
        <AuthForm initialMode="login" />
      </div>
    </div>
  );
}
