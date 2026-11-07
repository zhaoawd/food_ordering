/* global __dirname */
const esbuild = require('esbuild');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const shim = `import React from 'react';import {View,Text,Pressable} from 'react-native-web';
export const usePathname=()=>{const [route,setRoute]=React.useState(location.pathname);React.useEffect(()=>{const fn=()=>setRoute(location.pathname);window.addEventListener('popstate',fn);return()=>window.removeEventListener('popstate',fn)},[]);return route};
const go=route=>{history.pushState({},'',route);window.dispatchEvent(new PopStateEvent('popstate'))};
export const router={navigate:go,push:go};
export const useSafeAreaInsets=()=>({top:59,bottom:34,left:0,right:0});
export const SafeAreaView=({style,...props})=><View {...props} style={[style,{paddingTop:59}]}/>;
export const Image=({source,contentFit,tintColor,...props})=><View {...props}/>;
const wrap=C=>({stableId,sourceRef,observationRole,observationStyle,style,...props})=><C {...props} testID={stableId} style={[observationStyle,style]}/>;
export const ObservedText=wrap(Text),ObservedView=wrap(View),ObservedPressable=wrap(Pressable);
export const useFoodOrderingEvalFixture=()=>({status:'ready'});
export const recordBusinessEvent=()=>Promise.resolve();`;
(async()=>{
 const result=await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';
import Home from './app/(tabs)/index';import Menu from './app/(tabs)/menu';import Rewards from './app/(tabs)/rewards';import Orders from './app/(tabs)/orders';import Profile from './app/(tabs)/profile';import TabBar from './components/commerce/TabBar';import {usePathname} from 'expo-router';
function App(){const route=usePathname();const Page={'/':Home,'/menu':Menu,'/rewards':Rewards,'/orders':Orders,'/profile':Profile}[route];return <><Page/><TabBar/></>};createRoot(document.getElementById('root')).render(<App/>);`,loader:'tsx',resolveDir:root},bundle:true,write:false,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"',__DEV__:'false'},loader:{'.png':'dataurl','.svg':'dataurl'},plugins:[{name:'native-boundaries',setup(build){build.onResolve({filter:/^(expo-router|expo-image|react-native-safe-area-context|@\/verification\/(observation|useEvalFixture|business-events))$/},()=>({path:'native',namespace:'shim'}));build.onLoad({filter:/.*/,namespace:'shim'},()=>({contents:shim,loader:'tsx',resolveDir:root}));build.onResolve({filter:/^react-native$/},()=>({path:require.resolve('react-native-web')}));}}]});
 const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(result.outputFiles[0].contents)}else {res.setHeader('content-type','text/html');res.end('<html><head><meta charset="UTF-8"><style>html,body,#root{margin:0;width:100%;height:100%}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')}});
 server.listen(18774,'127.0.0.1');process.on('SIGTERM',()=>server.close());
})().catch(error=>{console.error(error);process.exit(1)});
