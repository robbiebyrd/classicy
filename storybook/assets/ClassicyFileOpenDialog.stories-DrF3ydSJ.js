import{E as l}from"./iframe-CdaXu9D3.js";import"./preload-helper-PPVm8Dsz.js";const n={id:"demo",label:"Demo Volume",list:async o=>o.length===0?[{id:"folder",name:"Folder",kind:"folder"},{id:"movie",name:"movie.mov",kind:"file",fileType:"video"},{id:"song",name:"song.mp3",kind:"file",fileType:"audio"}]:[{id:"nested",name:"nested.pdf",kind:"file",fileType:"pdf"}]},t={title:"Dialogs/FileOpenDialog",component:l},e={args:{id:"story-file-open",appId:"story-file-open",open:!0,volumes:[n],selectionMode:"multi",fileTypeFilters:[{label:"All Items",types:null},{label:"Movies",types:["video"]}],onOpenFunc:o=>console.log(o)}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "story-file-open",
    appId: "story-file-open",
    open: true,
    volumes: [demoVolume],
    selectionMode: "multi",
    fileTypeFilters: [{
      label: "All Items",
      types: null
    }, {
      label: "Movies",
      types: ["video"]
    }],
    onOpenFunc: selections => console.log(selections)
  }
}`,...e.parameters?.docs?.source}}};const a=["Default"];export{e as Default,a as __namedExportsOrder,t as default};
