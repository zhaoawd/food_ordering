/* global __dirname */
const esbuild = require("esbuild");
const http = require("node:http");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
// This isolated component harness replaces native IO and navigation. It is not device evidence.
const shim = `import React from 'react'; import {baselineFixture} from '@/verification/fixture'; import {View, Text, Pressable} from 'react-native-web';
export const SafeAreaView=View;
export const Ionicons=()=>null;
export const Image=View;
export const router={push:(route)=>{window.__lastRoute=route}};
const wrap=(Component)=>({stableId,observationRole,sourceRef,...props})=><Component {...props} testID={stableId}/>;
export const ObservedView=wrap(View), ObservedText=wrap(Text), ObservedPressable=wrap(Pressable);
export function useFoodOrderingEvalFixture(){return {status:'ready',fixture:baselineFixture}};`;
(async () => {
  const bundle = await esbuild.build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Index from './app/(tabs)/index';createRoot(document.getElementById('root')).render(<Index/>);`,
      resolveDir: root,
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"test"', __DEV__: "false" },
    loader: { ".png": "dataurl" },
    plugins: [
      {
        name: "isolated-native-boundaries",
        setup(build) {
          build.onResolve(
            {
              filter:
                /^(@expo\/vector-icons|expo-image|expo-router|react-native-safe-area-context|@\/verification\/(observation|useEvalFixture))$/,
            },
            () => ({ path: "native-boundaries", namespace: "fixture" }),
          );
          build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: shim,
            loader: "jsx",
            resolveDir: root,
          }));
          build.onResolve({ filter: /^react-native$/ }, () => ({
            path: require.resolve("react-native-web"),
          }));
        },
      },
    ],
  });
  const server = http.createServer((req, res) => {
    if (req.url === "/bundle.js") {
      res.setHeader("content-type", "text/javascript");
      res.end(bundle.outputFiles[0].contents);
    } else {
      res.setHeader("content-type", "text/html");
      res.end(
        '<html><head><meta charset="UTF-8"><style>html,body,#root{margin:0;width:100%;height:100%}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      );
    }
  });
  server.listen(18766, "127.0.0.1");
  process.on("SIGTERM", () => server.close());
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
