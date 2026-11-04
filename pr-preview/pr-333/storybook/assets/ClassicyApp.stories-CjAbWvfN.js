import{G as b,E as I,s as f,P as M,x as c,j as e,y as a,r,bl as x,e as v,aa as D,ab as _,bm as k,w as T,bn as A}from"./iframe-BVhiFZxf.js";import{d as l,a as t,S as E}from"./helpers-ARPMxC_i.js";import"./preload-helper-shce2T3m.js";const V="/pr-preview/pr-333/storybook/assets/renamed-media-player-CB9qa42U.svg",O="/pr-preview/pr-333/storybook/assets/renamed-television-DXM4aItE.svg",m="renamed",j=n=>n.replace(/(data-classicy-appearance=)(["']?)platinum\2/g,`$1$2${m}$2`),R=()=>{const n=f(M);if(!n)throw new Error("The renamed package is built on Platinum, which is not registered.");return n},d=R();b({id:m,name:"Renamed (Storybook test)",css:j(d.css),defaults:{...I("default"),id:"renamed-default",name:"Renamed",package:m},layout:d.layout,hooks:d.hooks,apps:{"MoviePlayer.app":{name:"Media Player",icon:V,description:"Plays movies and sound."},"TV.app":{name:"Television",icon:O}}});const B={...l,classicy:{...l.classicy,appearancePackage:"renamed"}},{fn:g}=__STORYBOOK_MODULE_TEST__,U={title:"Desktop/App",component:c,parameters:l},i={render:()=>e.jsxs(E,{id:"storybook.app",name:"Storybook",children:[e.jsx(a,{id:"doc1",appId:"storybook.app",title:"Document 1",initialSize:[360,240],initialPosition:[60,60],children:e.jsx("p",{style:{padding:"1em"},children:"First document window."})}),e.jsx(a,{id:"doc2",appId:"storybook.app",title:"Document 2",initialSize:[360,240],initialPosition:[160,140],children:e.jsx("p",{style:{padding:"1em"},children:"Second document window \u2014 click to focus."})})]})},o={render:()=>e.jsx(c,{id:"tv.app",name:"TV",icon:t,desktopIconBalloonHelp:"Double-click to watch TV.",children:e.jsx(a,{id:"main",appId:"tv.app",title:"TV",initialSize:[320,200],initialPosition:[120,80],children:e.jsx("p",{style:{padding:"1em"},children:"The app opened from its icon."})})})},W=()=>{const n=T();return r.useEffect(()=>{n({type:"ClassicyAppOpen",app:{id:"menus.app",name:"Menus",icon:t}})},[n]),e.jsxs(c,{id:"menus.app",name:"Menus",icon:t,contextMenu:[{id:"about-menus",title:"About Menus\u2026",onClickFunc:g()}],children:[e.jsx(a,{id:"plain",appId:"menus.app",title:"Uses the App Menu",initialSize:[320,160],initialPosition:[60,60],children:e.jsx("p",{style:{padding:"1em"},children:"No window menu: right-click shows the app's."})}),e.jsx(a,{id:"own",appId:"menus.app",title:"Has Its Own Menu",initialSize:[320,160],initialPosition:[200,200],contextMenu:[{id:"window-only",title:"Window Command",onClickFunc:g()}],children:e.jsx("p",{style:{padding:"1em"},children:"This window's own menu wins over the app's."})})]})},s={render:()=>e.jsx(W,{})},P="Macintosh HD:Applications",C="storybook-tv",N={url:"assets/vid/quicktime/sample.mp4",name:"Sample",type:"audio"},z=()=>{const n=T(),u=x("TV.app",{name:"TV",icon:t}),y=v(S=>{const{apps:w}=S.System.Manager.Applications;return A(w["TV.app"],"main")&&A(w["Finder.app"],P)}),h=r.useRef(!1);return r.useEffect(()=>(D({id:C,appId:"TV.app",label:"TV",icon:t,menuItems:[{id:"storybook-tv-channel",title:"Channel 8",disabled:!0,className:"classicyControlStripStatus"}]}),n({type:"ClassicyAppOpen",app:{id:"TV.app",name:"TV",icon:t}}),n({type:"ClassicyAppFinderOpenFolder",path:P}),()=>{_(C)}),[n]),r.useEffect(()=>{!y||h.current||(h.current=!0,n({type:"ClassicyDesktopIconAdd",app:k,kind:"app_shortcut"}),n({type:"ClassicyAppOpen",app:k}),n({type:"ClassicyAppMoviePlayerOpenDocument",document:N}))},[n,y]),e.jsx(c,{id:"TV.app",name:"TV",icon:t,showDesktopIcon:!0,addSystemMenu:!0,desktopIconBalloonHelp:"Double-click to watch TV.",children:e.jsx(a,{id:"main",appId:"TV.app",title:u.name,icon:u.icon,initialSize:[300,160],initialPosition:[420,400],children:e.jsx("p",{style:{padding:"1em"},children:"Now playing on channel 8."})})})},p={parameters:B,render:()=>e.jsx(z,{})};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="doc1" appId="storybook.app" title="Document 1" initialSize={[360, 240]} initialPosition={[60, 60]}>
                <p style={{
        padding: "1em"
      }}>First document window.</p>
            </ClassicyWindow>
            <ClassicyWindow id="doc2" appId="storybook.app" title="Document 2" initialSize={[360, 240]} initialPosition={[160, 140]}>
                <p style={{
        padding: "1em"
      }}>
                    Second document window \u2014 click to focus.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...i.parameters?.docs?.source},description:{story:`One open app with two document windows. Clicking a window focuses it and
brings it to the front, while the other takes the inactive (dimmed)
treatment. Both belong to one app, with one App Switcher entry.`,...i.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyApp id="tv.app" name="TV" icon={SB_ICON} desktopIconBalloonHelp="Double-click to watch TV.">
            <ClassicyWindow id="main" appId="tv.app" title="TV" initialSize={[320, 200]} initialPosition={[120, 80]}>
                <p style={{
        padding: "1em"
      }}>The app opened from its icon.</p>
            </ClassicyWindow>
        </ClassicyApp>
}`,...o.parameters?.docs?.source},description:{story:"A closed app as it first appears: only its desktop icon, an `app_shortcut`\ndrawn with the alias arrow and an italic label. Rest the pointer on it for\nthe `desktopIconBalloonHelp` balloon; double-click it to open the app, which\nrenders its children.",...o.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <AppWithContextMenu />
}`,...s.parameters?.docs?.source},description:{story:"The app-level `contextMenu` is the fallback for windows without their own:\nright-click each window to compare. Resolution is innermost-first \u2014 control\ntarget, then window, then app.",...s.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  parameters: renamedParameters,
  render: () => <RenamedByPackageDesktop />
}`,...p.parameters?.docs?.source},description:{story:`Under the Storybook-only \`renamed\` package, Movie Player is 'Media Player'
with its own icon (menu bar, App Switcher, Applications) and the host app
TV.app is 'Television' on the desktop. Switch the package back in the
Appearance control panel and every name and icon returns.

Movie Player has a document open and focused, so the Apple menu offers
"About Media Player" and its About box; its desktop icon's balloon is the
package's description. The TV window titles itself with
\`useClassicyAppIdentity\`, as the bundled control panels do, so its title
and proxy icon follow the package too, and TV.app's Control Strip module
is labeled "Television" in the strip and its control panel. Persisted
state never changes: records, menus and the file system keep the apps'
own names.`,...p.parameters?.docs?.description}}};const $=["TwoWindows","DesktopIcon","AppContextMenu","RenamedByPackage"];export{s as AppContextMenu,o as DesktopIcon,p as RenamedByPackage,i as TwoWindows,$ as __namedExportsOrder,U as default};
