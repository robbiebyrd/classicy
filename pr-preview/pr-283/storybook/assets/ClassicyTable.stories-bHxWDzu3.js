import{Z as a,j as r}from"./iframe-DkN2RQMA.js";import"./preload-helper-BQRuiJOt.js";const n=[{id:"finder",name:"Finder",kind:"Application",memoryKb:1024},{id:"simpletext",name:"SimpleText",kind:"Application",memoryKb:512},{id:"system",name:"Mac OS",kind:"System Software",memoryKb:8192},{id:"moviep",name:"Movie Player",kind:"Application",memoryKb:2048},{id:"hypercard",name:"HyperCard",kind:"Application",memoryKb:1536}],t=[{id:"name",title:"Name",accessor:e=>e.name,width:180},{id:"kind",title:"Kind",accessor:e=>e.kind},{id:"memory",title:"Memory",accessor:e=>e.memoryKb,render:e=>r.jsxs("span",{children:[e.memoryKb.toLocaleString()," K"]}),align:"right",width:90}],c={title:"Controls/Table",component:a,decorators:[e=>r.jsx("div",{style:{width:420,height:200},children:r.jsx(e,{})})]},s={args:{columns:t,rows:n,getRowId:e=>e.id,defaultSort:{columnId:"name"}}},o={args:{columns:t,rows:n,getRowId:e=>e.id,selectionMode:"multi"}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    columns: columns as ClassicyTableColumn<unknown>[],
    rows: processes,
    getRowId: p => (p as Process).id,
    defaultSort: {
      columnId: "name"
    }
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    columns: columns as ClassicyTableColumn<unknown>[],
    rows: processes,
    getRowId: p => (p as Process).id,
    selectionMode: "multi"
  }
}`,...o.parameters?.docs?.source}}};const d=["AboutThisComputer","MultiSelect"];export{s as AboutThisComputer,o as MultiSelect,d as __namedExportsOrder,c as default};
