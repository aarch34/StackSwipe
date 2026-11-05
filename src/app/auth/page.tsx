import { AuthForm } from '@/components/auth-form';
import { Cloud, Flower, Stacky } from '@/components/pixel/sprites';

export const metadata = {
  title: 'Join StackSwipe | Login & Sign Up',
  description: 'Join a community where every question is welcome. Sign in with Google, GitHub, or Email.',
};

export default function AuthPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[color:var(--c-pink)] p-4 sm:p-6 lg:p-8">
      <Cloud className="px-drift absolute left-[6%] top-[10%] w-32 sm:w-44" />
      <Cloud className="px-drift absolute bottom-[12%] right-[5%] hidden w-36 [animation-delay:-4s] sm:block" />
      <Flower className="absolute bottom-6 left-[6%] hidden w-24 lg:block" />

      <div className="relative w-full max-w-md pb-8 pt-20">
        <Stacky className="absolute right-8 top-[0.4rem] z-10 w-20" />
        <AuthForm initialMode="signup" />
      </div>
    </div>
  );
}
