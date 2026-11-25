import{F as l,j as o,d as a,h as u,u as m}from"./iframe-D1zPQr4o.js";import{d as h}from"./helpers-55q6qvuJ.js";import"./preload-helper-CiDKIbga.js";const{fn:F}=__STORYBOOK_MODULE_TEST__,k={title:"Desktop/FindFile",component:l,parameters:h},i=()=>{const s=m();return a.useEffect(()=>{s({type:"ClassicyAppFindFileShowFind"})},[s]),null},e={render:()=>o.jsx(i,{})},S=["Mercury","Venus","Earth","Mars","Jupiter","Saturn"],f=()=>(a.useEffect(()=>u({id:"storybook-planets",name:"Planets",search:(s,{signal:n})=>new Promise((c,d)=>{const p=setTimeout(()=>c(S.filter(t=>t.toLowerCase().includes(s.trim().toLowerCase())).map(t=>({name:t,kind:"planet",open:F().mockName(`open ${t}`)}))),300);n.addEventListener("abort",()=>{clearTimeout(p),d(n.reason)})})}),[]),o.jsx(i,{})),r={render:()=>o.jsx(f,{})};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  render: () => <OpenFindFile />
}`,...e.parameters?.docs?.source},description:{story:`Find File, Mac OS 8.1's: "Find items [on local disks] whose [name]
[contains] [\u2026]". Type part of a name (try "read") and press Return: Items
Found lists what matched, with the path pane under it. More Choices adds a
row (size, kind, label, dates, version, comments, lock, folder attribute,
file type, creator; Option-click the first pop-up for visibility and
name/icon lock). Open Item (\u2325O) opens a result as the Finder would; Open
Enclosing Folder (\u2325E) shows it selected in its Finder window. (The
decorator's desktop mounts Find File; this story only opens it.)`,...e.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <WithSource />
}`,...r.parameters?.docs?.source},description:{story:`With a search source registered (\`registerClassicyFindSource\`), Find File
gains Sherlock's Search Internet tab (Mac OS 8.5): type words (try "ur"),
leave the channel on, and press Search. A new search, or Stop, aborts the
one running.`,...r.parameters?.docs?.description}}};const E=["Default","WithSearchSource"];export{e as Default,r as WithSearchSource,E as __namedExportsOrder,k as default};
