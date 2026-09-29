let slots=[], cursor=0, effects=[];
export function resetHooks(){slots=[];cursor=0;effects=[];}
export function renderHook(render){cursor=0;effects=[];const result=render();for(const effect of effects)effect();return result;}
export function useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];}
export function useMemo(factory){cursor++;return factory();}
export function useCallback(callback){cursor++;return callback;}
export function useEffect(effect){cursor++;effects.push(effect);}
