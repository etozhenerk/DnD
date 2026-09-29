export * from 'react-router-dom';
let location={pathname:'/campaign/penisuela/play/hotel-gallery',search:''};
export const navigations=[];
export function setLocation(path){const [pathname,search]=path.split('?');location={pathname,search:search?`?${search}`:''};navigations.length=0;}
const navigate=path=>{navigations.push(path);};
export function useNavigate(){return navigate;}
export function useLocation(){return location;}
