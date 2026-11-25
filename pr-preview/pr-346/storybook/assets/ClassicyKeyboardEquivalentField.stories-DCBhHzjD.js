import{a8 as l,j as t,a9 as h,h as b,C as y}from"./iframe-BESxYuUA.js";import{d as g,S as C}from"./helpers-Cqc7SQ9j.js";import"./preload-helper-DhQH6ajB.js";const{fn:u}=__STORYBOOK_MODULE_TEST__,i="storybook.app",w={title:"Controls/KeyboardEquivalentField",component:l,parameters:g,args:{id:"kbd-equivalent",appId:i,onChange:u()}},o=({initial:e,...d})=>{const[p,m]=b.useState(e);return t.jsx(C,{id:i,name:"Storybook",children:t.jsx(y,{id:"kbd-equivalent-panel",appId:i,title:"Custom Settings",initialSize:[380,0],initialPosition:[40,60],resizable:!1,scrollable:!1,children:t.jsx("div",{style:{padding:12},children:t.jsx(l,{...d,value:p,onChange:c=>{d.onChange(c),m(c)}})})})})},s={render:e=>t.jsx(o,{...e,initial:"\u2303\u2318S",description:"This key combination will show and hide the custom settings."})},n={render:e=>t.jsx(o,{...e,initial:"\u2318K",inUse:h([{id:"new",title:"New Folder",keyboardShortcut:"\u2318N"},{id:"open",title:"Open\u2026",keyboardShortcut:"\u2318O"}]),onHelp:u()})},r={render:e=>t.jsx(o,{...e,initial:"\u2318K",disabled:!0})},a={render:e=>t.jsx(o,{...e,initial:"\u2325K",requireCommandKey:!1,description:"Option-based combinations are accepted here."})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: args => <InControlPanel {...args} initial="\u2303\u2318S" description="This key combination will show and hide the custom settings." />
}`,...s.parameters?.docs?.source},description:{story:`HIGOS8 Figures 6-8 to 6-10: click the button, type a combination with the
command key, then OK. A combination without one is refused with an alert.`,...s.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: args => <InControlPanel {...args} initial="\u2318K" inUse={keyboardEquivalentsInUse([{
    id: "new",
    title: "New Folder",
    keyboardShortcut: "\u2318N"
  }, {
    id: "open",
    title: "Open\u2026",
    keyboardShortcut: "\u2318O"
  }])} onHelp={fn()} />
}`,...n.parameters?.docs?.source},description:{story:"The second HIG alert case: the combination is already in use. These menu\ncommands are passed as `inUse` (via `keyboardEquivalentsInUse`), so typing\n\u2318N or \u2318O names its owner; `onHelp` adds a Help button to that alert.",...n.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: args => <InControlPanel {...args} initial="\u2318K" disabled />
}`,...r.parameters?.docs?.source},description:{story:"A disabled field: the current equivalent is shown but cannot be changed.",...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: args => <InControlPanel {...args} initial="\u2325K" requireCommandKey={false} description="Option-based combinations are accepted here." />
}`,...a.parameters?.docs?.source},description:{story:"`requireCommandKey={false}` lifts the command-key rule, e.g. for web\nshortcuts built on Option (\u2325), which the browser reserves far less than \u2318.",...a.parameters?.docs?.description}}};const K=["Default","WithMenuConflicts","Disabled","WithoutCommandKeyRule"];export{s as Default,r as Disabled,n as WithMenuConflicts,a as WithoutCommandKeyRule,K as __namedExportsOrder,w as default};
