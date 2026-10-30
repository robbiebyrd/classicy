import{X as s,j as i}from"./iframe-F5jzD-xv.js";import{d,S as m}from"./helpers-BKszu3J4.js";import"./preload-helper-PPVm8Dsz.js";const{fn:o}=__STORYBOOK_MODULE_TEST__,r="storybook.app",l={id:"demo",label:"Demo Volume",list:async n=>n.length===0?[{id:"folder",name:"Folder",kind:"folder"},{id:"song",name:"song.mp3",kind:"file",fileType:"audio"}]:[],write:o(async()=>{}),mkDir:o(async()=>{})},c={id:"cd",label:"Mac OS 8 CD",list:async()=>[{id:"readme",name:"Read Me",kind:"file",fileType:"text_file"}]},y={title:"Dialogs/FileSaveDialog",component:s,parameters:d,args:{appId:r,open:!0,onSaveFunc:o(),onCancelFunc:o()},render:n=>i.jsx(m,{id:r,name:"Storybook",children:i.jsx(s,{...n})})},e={args:{id:"story-file-save",volumes:[l],defaultFileName:"My Stack",formats:[{label:"HyperCard Stack",extension:".stack",fileType:"stack",data:()=>"{}"},{label:"Plain Text",extension:".txt",fileType:"text_file",data:()=>""}]}},a={args:{id:"story-file-save-replace",volumes:[l],defaultFileName:"song",formats:[{label:"MP3 Audio",extension:".mp3",fileType:"audio",data:()=>""}]}},t={args:{id:"story-file-save-readonly",volumes:[c],defaultFileName:"Untitled",formats:[{label:"Plain Text",extension:".txt",fileType:"text_file",data:()=>""}]}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    id: "story-file-save",
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
    }]
  }
}`,...e.parameters?.docs?.source},description:{story:"Two formats, so the Format pop-up appears and switching it changes the\nextension shown after the name. Click a folder to save into it; New Folder\nprompts for a name. The demo volume's `write` and `mkDir` are no-op spies,\nso nothing is actually stored.",...e.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    id: "story-file-save-replace",
    volumes: [demoVolume],
    defaultFileName: "song",
    formats: [{
      label: "MP3 Audio",
      extension: ".mp3",
      fileType: "audio",
      data: () => ""
    }]
  }
}`,...a.parameters?.docs?.source},description:{story:`A single format hides the Format pop-up. The name opens as "song", which
with ".mp3" collides with an existing file: Save raises the movable caution
"Replace “song.mp3”?" alert, whose default button is Cancel.`,...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    id: "story-file-save-readonly",
    volumes: [cdVolume],
    defaultFileName: "Untitled",
    formats: [{
      label: "Plain Text",
      extension: ".txt",
      fileType: "text_file",
      data: () => ""
    }]
  }
}`,...t.parameters?.docs?.source},description:{story:"A read-only volume (no `write` or `mkDir`): Save and New Folder stay dimmed\nwhatever the name, so nothing can be written to it.",...t.parameters?.docs?.description}}};const x=["Default","ReplaceExistingFile","ReadOnlyVolume"];export{e as Default,t as ReadOnlyVolume,a as ReplaceExistingFile,x as __namedExportsOrder,y as default};
