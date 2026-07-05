import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/chat');
  }, [router]);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'screen',
      fontFamily: 'system-ui, sans-serif'
    }}>
      Redirecting to Chat Sandbox...
    </div>
  );
}
