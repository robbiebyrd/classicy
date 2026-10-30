import{H as r,I as p,j as e,y as n,J as c,w as d,K as l,L as h}from"./iframe-BXxk5RQO.js";import{d as u,S as m}from"./helpers-mwRaNUWb.js";import"./preload-helper-shce2T3m.js";const s="storybook-make-alias";l({id:s,title:"How do I make an alias?",pages:[e.jsx("p",{children:"In the Finder, click the item you want to make an alias of."},"1"),e.jsx("p",{children:"Choose Make Alias from the File menu."},"2"),e.jsx("p",{children:"Drag the alias to wherever you want it. Its name is shown in italics."},"3")]});const w={title:"Extensions/AppleGuide",component:p,parameters:u},o={args:{topicId:r}},t={args:{topicId:s}},g=()=>{const i=d();return e.jsx(m,{id:"storybook.app",name:"Storybook",children:e.jsx(n,{id:"apple-guide-launcher",appId:"storybook.app",title:"Help Launcher",initialSize:[260,0],initialPosition:[40,60],scrollable:!1,children:e.jsx(c,{onClickFunc:()=>i({type:h,topicId:s}),children:"Show Help Topic"})})})},a={args:{topicId:s},render:()=>e.jsx(g,{})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    topicId: ABOUT_BALLOON_HELP_TOPIC_ID
  }
}`,...o.parameters?.docs?.source},description:{story:`The built-in "About Balloon Help\u2026" topic the desktop's Help menu opens \u2014 the
canonical About Help implementation (an Apple Guide topic, not the generic
paged wizard in Dialogs/Assistant). One page, so both arrows are
disabled and the page ends with "- End -".`,...o.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    topicId: STORY_TOPIC_ID
  }
}`,...t.parameters?.docs?.source},description:{story:"A three-page topic registered with `registerAppleGuideTopic`. The header\nkeeps the topic title on every page; the arrows page through it, and the\npage index is stored in the AppManager store.",...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    topicId: STORY_TOPIC_ID
  },
  render: () => <ShowTopicLauncher />
}`,...a.parameters?.docs?.source},description:{story:"The recommended way to open a topic: dispatch `APPLE_GUIDE_SHOW_TOPIC_EVENT`\nwith its `topicId`, and the desktop's AppleGuide extension renders and\nfocuses the window. Showing an open topic again re-focuses it at page 1.",...a.parameters?.docs?.description}}};const A=["AboutBalloonHelp","MultiPageTopic","ShowTopicByDispatch"];export{o as AboutBalloonHelp,t as MultiPageTopic,a as ShowTopicByDispatch,A as __namedExportsOrder,w as default};
