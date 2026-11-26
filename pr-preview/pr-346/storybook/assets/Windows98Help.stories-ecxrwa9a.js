import{j as t,aQ as p,c as a,A as c,h as d,u as l,r as u}from"./iframe-7JEmh2mt.js";import{w as h}from"./windows98-bXnIjVR1.js";import"./preload-helper-DhQH6ajB.js";import"./index-DYS3yo0c.js";import"./helpers-DWcsdqVm.js";const m=[{id:"windows98-story-print-queue",title:"To view documents waiting to be printed",book:"Printing",steps:["Click the Start button, point to Settings, and then click Printers.","Double-click the icon for the printer you want to look at."]},{id:"windows98-story-change-printer",title:"To change printer settings",book:"Printing",steps:["Click the Start button, point to Settings, and then click Printers.","Click the printer you want, and then click Properties on the File menu."]},{id:"windows98-story-find-file",title:"To find a file or folder",book:"Finding Things",steps:["Click the Start button, point to Find, and then click Files or Folders.","In Named, type the name of the file or folder you want to find.","Click Find Now."]}];for(const e of m)u({id:e.id,title:e.title,book:e.book,packages:["windows98"],pages:[t.jsx("ol",{children:e.steps.map(o=>t.jsx("li",{children:o},o))},"steps"),t.jsx("p",{children:"You can also press F1 in a dialog box for help on it."},"tip")]});const k={title:"Appearance/Windows 98/Help",parameters:h};function r({action:e}){const o=l();return d.useEffect(()=>{o(e)},[o]),null}const i={render:()=>t.jsx(r,{action:{type:a,topicId:"windows98-story-print-queue"}})},n={render:()=>t.jsx(r,{action:{type:a,topicId:c}})},s={render:()=>t.jsx(r,{action:{type:p}})};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <Dispatch action={{
    type: APPLE_GUIDE_SHOW_TOPIC_EVENT,
    topicId: "windows98-story-print-queue"
  }} />
}`,...i.parameters?.docs?.source},description:{story:`A topic in WinHelp's task topic window: captioned with the help file's
name, sizable, Help Topics, Back and Options above the topic, the topic on
InfoWindow, the wizard's Back and Next below.`,...i.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <Dispatch action={{
    type: APPLE_GUIDE_SHOW_TOPIC_EVENT,
    topicId: ABOUT_BALLOON_HELP_TOPIC_ID
  }} />
}`,...n.parameters?.docs?.source},description:{story:`The Help menu's built-in topic, in Windows' words under Windows 98 ("Using
Help"); Platinum and System 7 keep Apple Guide's "About Help".`,...n.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <Dispatch action={{
    type: APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT
  }} />
}`,...s.parameters?.docs?.source},description:{story:`The Help Topics browser: its Contents tab lists the books and the topics
outside them; Display (or Open and Close on a book) and Cancel below.`,...s.parameters?.docs?.description}}};const O=["TopicWindow","UsingHelp","HelpTopics"];export{s as HelpTopics,i as TopicWindow,n as UsingHelp,O as __namedExportsOrder,k as default};
