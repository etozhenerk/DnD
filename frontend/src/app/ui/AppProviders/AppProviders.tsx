import {useState} from 'react';
import type {ReactNode} from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {createQueryClient} from '../../model/create-query-client';

export type AppProvidersProps = {children: ReactNode};

export function AppProviders({children}: AppProvidersProps) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
