import{W as i,j as n}from"./iframe-BPXyaAsi.js";import{d,S as m}from"./helpers-DzBLb7O3.js";import"./preload-helper-shce2T3m.js";const{fn:r}=__STORYBOOK_MODULE_TEST__,l="storybook.app",a={id:"demo",label:"Demo Volume",list:async e=>e.length===0?[{id:"folder",name:"Folder",kind:"folder"},{id:"movie",name:"movie.mov",kind:"file",fileType:"video"},{id:"song",name:"song.mp3",kind:"file",fileType:"audio"}]:[{id:"nested",name:"nested.pdf",kind:"file",fileType:"pdf"}]},p={id:"documents",label:"Documents",list:async()=>[{id:"letter",name:"Letter",kind:"file",fileType:"text_file"},{id:"notes",name:"Notes",kind:"file",fileType:"text_file"}]},c={id:"server",label:"File Server",list:async e=>{if(e.length===0)return[{id:"shared",name:"Shared",kind:"folder"},{id:"readme",name:"Read Me",kind:"file",fileType:"text_file"}];throw new Error("The server is not responding.")}},g={title:"Dialogs/FileOpenDialog",component:i,parameters:d,args:{appId:l,open:!0,onOpenFunc:r(),onCancelFunc:r()},render:e=>n.jsx(m,{id:l,name:"Storybook",children:n.jsx(i,{...e})})},o={args:{id:"story-file-open",volumes:[a],selectionMode:"multi",fileTypeFilters:[{label:"All Items",types:null},{label:"Movies",types:["video"]}]}},s={args:{id:"story-file-open-single",volumes:[p,a]}},t={args:{id:"story-file-open-error",volumes:[c]}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    id: "story-file-open",
    volumes: [demoVolume],
    selectionMode: "multi",
    fileTypeFilters: [{
      label: "All Items",
      types: null
    }, {
      label: "Movies",
      types: ["video"]
    }]
  }
}`,...o.parameters?.docs?.source},description:{story:'Multi-selection with a Show filter. Choose "Movies" to dim everything but\n`video` files; Command-click toggles files and Shift-click extends within a\nfolder. Expand Folder to load its contents lazily.',...o.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    id: "story-file-open-single",
    volumes: [documentsVolume, demoVolume]
  }
}`,...s.parameters?.docs?.source},description:{story:`Single selection (the default) across two volumes: the Volume pop-up
switches between them. Double-click a file, or select it and press Return,
to open it.`,...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "story-file-open-error",
    volumes: [flakyVolume]
  }
}`,...t.parameters?.docs?.source},description:{story:'A volume whose `list()` rejects: expanding Shared shows "Couldn\'t open this\nfolder" with a Retry button instead of failing silently.',...t.parameters?.docs?.description}}};const h=["Default","SingleSelectionTwoVolumes","FolderLoadError"];export{o as Default,t as FolderLoadError,s as SingleSelectionTwoVolumes,h as __namedExportsOrder,g as default};
