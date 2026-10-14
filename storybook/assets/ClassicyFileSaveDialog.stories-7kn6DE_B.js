import{F as n}from"./iframe-DRsFS4-m.js";import"./preload-helper-PPVm8Dsz.js";const l={id:"demo",label:"Demo Volume",list:async e=>e.length===0?[{id:"folder",name:"Folder",kind:"folder"},{id:"song",name:"song.mp3",kind:"file",fileType:"audio"}]:[],write:async(e,o,t)=>console.log("write",e,o,t),mkDir:async(e,o)=>console.log("mkDir",e,o)},r={title:"Dialogs/FileSaveDialog",component:n},a={args:{id:"story-file-save",appId:"story-file-save",open:!0,volumes:[l],defaultFileName:"My Stack",formats:[{label:"HyperCard Stack",extension:".stack",fileType:"stack",data:()=>"{}"},{label:"Plain Text",extension:".txt",fileType:"text_file",data:()=>""}],onSaveFunc:e=>console.log(e)}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "story-file-save",
    appId: "story-file-save",
    open: true,
    volumes: [demoVolume],
    defaultFileName: "My Stack",
    formats: [{
      label: "HyperCard Stack",
      extension: ".stack",
      fileType: "stack",
      data: () => "{}"
    }, {
      label: "Plain Text",
      extension: ".txt",
      fileType: "text_file",
      data: () => ""
    }],
    onSaveFunc: saved => console.log(saved)
  }
}`,...a.parameters?.docs?.source}}};const d=["Default"];export{a as Default,d as __namedExportsOrder,r as default};
