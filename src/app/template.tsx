import { PageCurtain } from '@/components/pixel/page-curtain';

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div id="main-content" tabIndex={-1}>
      <PageCurtain />
      {children}
    </div>
  );
}
