import{p as a,j as e,d as l}from"./iframe-0079SEi_.js";import{d as t,S as d}from"./helpers-BlI1ZMiN.js";import"./preload-helper-PPVm8Dsz.js";const u={title:"Controls/ColorPicker",component:a,parameters:t},s=({children:i})=>e.jsx(d,{id:"storybook.app",name:"Storybook",children:e.jsx(l,{id:"colors",appId:"storybook.app",title:"Colors",initialSize:[420,220],initialPosition:[80,60],children:e.jsx("div",{style:{padding:"1em"},children:i})})}),o={render:()=>e.jsx(s,{children:e.jsx(a,{id:"cp-default",defaultValue:12212012,labelTitle:"Highlight color:"})})},r={render:()=>e.jsx(s,{children:e.jsx(a,{id:"cp-disabled",defaultValue:8947848,labelTitle:"Locked color:",disabled:!0})})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <InWindow>
            <ClassicyColorPicker id="cp-default" defaultValue={0xba572c} labelTitle="Highlight color:" />
        </InWindow>
}`,...o.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <InWindow>
            <ClassicyColorPicker id="cp-disabled" defaultValue={0x888888} labelTitle="Locked color:" disabled={true} />
        </InWindow>
}`,...r.parameters?.docs?.source}}};const m=["Default","Disabled"];export{o as Default,r as Disabled,m as __namedExportsOrder,u as default};
