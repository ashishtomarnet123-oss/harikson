import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/chat');
  }, [router]);

  return null;
}

export function getServerSideProps() {
  return {
    redirect: {
      destination: '/chat',
      permanent: false,
    },
  };
}
