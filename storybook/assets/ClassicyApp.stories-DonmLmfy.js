import{h as p,j as i,C as t,i as d,u as c}from"./iframe-C1IgWVCA.js";import{d as l,a as s,S as m}from"./helpers-Cjo4XIqK.js";import"./preload-helper-PPVm8Dsz.js";const{fn:r}=__STORYBOOK_MODULE_TEST__,k={title:"Desktop/App",component:p,parameters:l},e={render:()=>i.jsxs(m,{id:"storybook.app",name:"Storybook",children:[i.jsx(t,{id:"doc1",appId:"storybook.app",title:"Document 1",initialSize:[360,240],initialPosition:[60,60],children:i.jsx("p",{style:{padding:"1em"},children:"First document window."})}),i.jsx(t,{id:"doc2",appId:"storybook.app",title:"Document 2",initialSize:[360,240],initialPosition:[160,140],children:i.jsx("p",{style:{padding:"1em"},children:"Second document window — click to focus."})})]})},n={render:()=>i.jsx(p,{id:"tv.app",name:"TV",icon:s,desktopIconBalloonHelp:"Double-click to watch TV.",children:i.jsx(t,{id:"main",appId:"tv.app",title:"TV",initialSize:[320,200],initialPosition:[120,80],children:i.jsx("p",{style:{padding:"1em"},children:"The app opened from its icon."})})})},u=()=>{const a=c();return d.useEffect(()=>{a({type:"ClassicyAppOpen",app:{id:"menus.app",name:"Menus",icon:s}})},[a]),i.jsxs(p,{id:"menus.app",name:"Menus",icon:s,contextMenu:[{id:"about-menus",title:"About Menus…",onClickFunc:r()}],children:[i.jsx(t,{id:"plain",appId:"menus.app",title:"Uses the App Menu",initialSize:[320,160],initialPosition:[60,60],children:i.jsx("p",{style:{padding:"1em"},children:"No window menu: right-click shows the app's."})}),i.jsx(t,{id:"own",appId:"menus.app",title:"Has Its Own Menu",initialSize:[320,160],initialPosition:[200,200],contextMenu:[{id:"window-only",title:"Window Command",onClickFunc:r()}],children:i.jsx("p",{style:{padding:"1em"},children:"This window's own menu wins over the app's."})})]})},o={render:()=>i.jsx(u,{})};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
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
                    Second document window — click to focus.
                </p>
            </ClassicyWindow>
        </StoryApp>
}`,...e.parameters?.docs?.source},description:{story:`One open app with two document windows. Clicking a window focuses it and
brings it to the front, while the other takes the inactive (dimmed)
treatment. Both belong to one app, with one App Switcher entry.`,...e.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyApp id="tv.app" name="TV" icon={SB_ICON} desktopIconBalloonHelp="Double-click to watch TV.">
            <ClassicyWindow id="main" appId="tv.app" title="TV" initialSize={[320, 200]} initialPosition={[120, 80]}>
                <p style={{
        padding: "1em"
      }}>The app opened from its icon.</p>
            </ClassicyWindow>
        </ClassicyApp>
}`,...n.parameters?.docs?.source},description:{story:"A closed app as it first appears: only its desktop icon, an `app_shortcut`\ndrawn with the alias arrow and an italic label. Rest the pointer on it for\nthe `desktopIconBalloonHelp` balloon; double-click it to open the app, which\nrenders its children.",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <AppWithContextMenu />
}`,...o.parameters?.docs?.source},description:{story:"The app-level `contextMenu` is the fallback for windows without their own:\nright-click each window to compare. Resolution is innermost-first — control\ntarget, then window, then app.",...o.parameters?.docs?.description}}};const x=["TwoWindows","DesktopIcon","AppContextMenu"];export{o as AppContextMenu,n as DesktopIcon,e as TwoWindows,x as __namedExportsOrder,k as default};
