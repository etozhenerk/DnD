export * from 'react';
let slots=[], cursor=0, pending=[], dirty=false;
const contexts=new Map();
export function setContext(context,value){contexts.set(context,value);}
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
export function resetComponent(){for(const slot of slots)slot?.cleanup?.();slots=[];cursor=0;pending=[];dirty=false;}
export function renderComponent(render){for(let i=0;i<50;i++){cursor=0;pending=[];dirty=false;const result=render();for(const effect of pending)effect();if(!dirty)return result;}throw new Error('Component did not settle after 50 renders');}
export function useState(initial){const i=cursor++;if(!(i in slots))slots[i]={value:typeof initial==='function'?initial():initial};const slot=slots[i];slot.set??=(value)=>{const next=typeof value==='function'?value(slot.value):value;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};return[slot.value,slot.set];}
export function useReducer(reducer,initial){const [value,set]=useState(initial);return[value,action=>set(current=>reducer(current,action))];}
export function useRef(initial){const i=cursor++;return slots[i]??=( {current:initial} );}
export function useMemo(factory,deps){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={value:factory(),deps};return slots[i].value;}
export function useCallback(fn,deps){return useMemo(()=>fn,deps);}
export function useEffect(effect,deps){const i=cursor++;const previous=slots[i];if(!previous||!same(previous.deps,deps)){slots[i]={deps};pending.push(()=>{previous?.cleanup?.();slots[i].cleanup=effect();});}}
export const useLayoutEffect=useEffect;
export function useSyncExternalStore(subscribe,getSnapshot){const[,changed]=useState(0);useEffect(()=>subscribe(()=>changed(value=>value+1)),[subscribe]);return getSnapshot();}
export function useContext(context){cursor++;return contexts.get(context)??null;}
export function useId(){const i=cursor++;return `test-${i}`;}
export function elements(element){if(!element||typeof element!=='object')return[];if(Array.isArray(element))return element.flatMap(elements);return[element,...elements(element.props?.children)];}
