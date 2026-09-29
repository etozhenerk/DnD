import {createContext} from 'react';
export const SceneCheckpointContext = createContext<(() => void) | undefined>(undefined);
