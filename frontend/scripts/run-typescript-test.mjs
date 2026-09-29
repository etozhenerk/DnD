import {createServer} from 'vite';
const path=process.argv[2];
if (!/^scripts\/test-[a-z0-9-]+\.ts$/u.test(path??'')) throw new Error('Pass a scripts/test-*.ts file.');
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true,hmr:false}});
try {await server.ssrLoadModule(`/${path}`);} finally {await server.close();}
