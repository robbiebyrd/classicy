import{c as n,j as o,d as t}from"./iframe-Ddm8TjKX.js";import{d as s,S as e}from"./helpers-AUEX4X4O.js";import"./preload-helper-Cz5WKIEF.js";const r={title:"Desktop/App",component:n,parameters:s},i={render:()=>o.jsxs(e,{id:"storybook.app",name:"Storybook",children:[o.jsx(t,{id:"doc1",appId:"storybook.app",title:"Document 1",initialSize:[360,240],initialPosition:[60,60],children:o.jsx("p",{style:{padding:"1em"},children:"First document window."})}),o.jsx(t,{id:"doc2",appId:"storybook.app",title:"Document 2",initialSize:[360,240],initialPosition:[160,140],children:o.jsx("p",{style:{padding:"1em"},children:"Second document window — click to focus."})})]})};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
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
}`,...i.parameters?.docs?.source}}};const c=["TwoWindows"];export{i as TwoWindows,c as __namedExportsOrder,r as default};
