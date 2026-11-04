import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { useEffect, type PropsWithChildren } from 'react';
import { setCsrfToken, setUnauthorizedHandler } from '@/lib/api-client';
export function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCsrfToken(); void queryClient.cancelQueries();
      queryClient.removeQueries({ predicate: query => query.queryKey[0] !== 'session' });
      queryClient.setQueryData(['session'], null);
    });
    return () => setUnauthorizedHandler();
  }, []);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
