/* global __dirname */
const esbuild = require('esbuild');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const shim = `import React from 'react'; import {baselineFixture} from '@/verification/fixture'; import {View,Text,Pressable,StyleSheet} from 'react-native-web';
const simulatedInsets=new URLSearchParams(location.search);
export const SafeAreaView=({style,edges=['top','bottom'],...props})=>{const flat=StyleSheet.flatten(style)||{};const q=simulatedInsets;const inset={top:Number(q.get('topInset')||59),bottom:Number(q.get('bottomInset')||37)};const padding={};for(const edge of ['top','bottom']){const mode=Array.isArray(edges)?(edges.includes(edge)?'additive':'off'):(edges[edge]||'off');const key=edge==='top'?'paddingTop':'paddingBottom';const own=flat[key]??flat.paddingVertical??flat.padding??0;padding[key]=mode==='maximum'?Math.max(own,inset[edge]):mode==='additive'?own+inset[edge]:own;}return <View {...props} style={[style,padding]}/>};
export const router={push:(route)=>{history.pushState({},'',route);window.dispatchEvent(new PopStateEvent('popstate'));},back:()=>{window.__backCalls=(window.__backCalls||0)+1;history.back()},canGoBack:()=>true,replace:(route)=>{history.replaceState({},'',route);window.dispatchEvent(new PopStateEvent('popstate'));}};
const wrap=(C)=>({stableId,sourceRef,observationRole,observationStyle,style,...props})=><C {...props} testID={stableId} style={[observationStyle,style]}/>;
export const ObservedView=wrap(View),ObservedPressable=wrap(Pressable),ObservedText=wrap(Text);
export function useFoodOrderingEvalFixture(){return {status:'ready',fixture:baselineFixture}};`;
(async()=>{
 const addressImport=`import Address from './app/delivery-address';`;
 const result=await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Index from './app/(tabs)/index';${addressImport}
 import {addressStore} from './store/address.store';window.addressStore=addressStore;
 const fixture=new URLSearchParams(location.search).get('fixture');if(fixture)addressStore.getState().loadFixture(fixture,'browser-selection');
 function App(){const [route,setRoute]=React.useState(location.pathname);React.useEffect(()=>{const update=()=>setRoute(location.pathname);window.addEventListener('popstate',update);return ()=>window.removeEventListener('popstate',update)},[]);return <><div style={{display:route==='/'?'flex':'none',flex:1,minHeight:0,flexDirection:'column'}}><Index/></div>{route==='/delivery-address'&&<Address/>}</>};createRoot(document.getElementById('root')).render(<App/>);`,loader:'tsx',resolveDir:root},bundle:true,write:false,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"',__DEV__:'false'},loader:{'.png':'dataurl'},plugins:[{name:'native-boundaries',setup(build){build.onResolve({filter:/^(expo-router|react-native-safe-area-context|@\/verification\/(observation|useEvalFixture))$/},()=>({path:'native',namespace:'shim'}));build.onLoad({filter:/.*/,namespace:'shim'},()=>({contents:shim,loader:'tsx',resolveDir:root}));build.onResolve({filter:/^react-native$/},()=>({path:require.resolve('react-native-web')}));}}]});
 const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(result.outputFiles[0].contents)}else {res.setHeader('content-type','text/html');res.end('<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')}});
 server.listen(18769,'127.0.0.1');process.on('SIGTERM',()=>server.close());
})().catch(error=>{console.error(error);process.exit(1)});
