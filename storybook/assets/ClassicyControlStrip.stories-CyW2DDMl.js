import{u as i,r as m,v as d,f as c,j as u}from"./iframe-CEfyM0k-.js";import{d as S}from"./helpers-B4FsTvAG.js";import"./preload-helper-PPVm8Dsz.js";const{fn:g}=__STORYBOOK_MODULE_TEST__,y={title:"Desktop/ControlStrip",component:i,parameters:{...S,classicy:{desktop:!0,controlStrip:!1}}},s={},n={render:()=>{const[e,a]=m.useState(!1),l=d(),r=[{id:"file-sharing",label:"File Sharing",icon:c.system.controlStrip.fileSharing,menuItems:[{id:"file-sharing-status",title:e?"1 User Connected":"No Users Connected",disabled:!0,className:"classicyControlStripStatus"},{id:"spacer"},{id:"file-sharing-open",title:"Open File Sharing Control Panel",onClickFunc:g()},{id:"spacer"},{id:"file-sharing-toggle",title:e?"Turn File Sharing Off":"Turn File Sharing On",onClickFunc:()=>a(p=>!p)}]},{id:"cd",label:"CD",icon:c.system.controlStrip.cd,menuItems:[{id:"cd-status",title:"No Audio CD",disabled:!0,className:"classicyControlStripStatus"}]},...l];return u.jsx(i,{modules:r})}},t={render:()=>{const e=d(),a=Array.from({length:6},(l,r)=>({...e[r%e.length],id:`module-${r}`}));return u.jsx(i,{modules:a,defaultWidth:90})}},o={args:{defaultCollapsed:!0}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:"{}",...s.parameters?.docs?.source},description:{story:`The built-in modules: Sound pops up Figure 2-16's volume slider; Screen
Saver is a menu.`,...s.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [sharing, setSharing] = useState(false);
    const builtIns = useClassicyDefaultControlStripModules();
    const modules: ClassicyControlStripModule[] = [{
      id: "file-sharing",
      label: "File Sharing",
      icon: ClassicyIcons.system.controlStrip.fileSharing,
      menuItems: [{
        id: "file-sharing-status",
        title: sharing ? "1 User Connected" : "No Users Connected",
        disabled: true,
        className: "classicyControlStripStatus"
      }, {
        id: "spacer"
      }, {
        id: "file-sharing-open",
        title: "Open File Sharing Control Panel",
        onClickFunc: fn()
      }, {
        id: "spacer"
      }, {
        id: "file-sharing-toggle",
        title: sharing ? "Turn File Sharing Off" : "Turn File Sharing On",
        onClickFunc: () => setSharing(s => !s)
      }]
    }, {
      id: "cd",
      label: "CD",
      icon: ClassicyIcons.system.controlStrip.cd,
      menuItems: [{
        id: "cd-status",
        title: "No Audio CD",
        disabled: true,
        className: "classicyControlStripStatus"
      }]
    }, ...builtIns];
    return <ClassicyControlStrip modules={modules} />;
  }
}`,...n.parameters?.docs?.source},description:{story:`HIGOS8 Figure 6-15: a File Sharing module whose menu leads with an italic
status line and offers a command that opens its control panel, and a CD
module, ahead of the built-ins.`,...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => {
    const builtIns = useClassicyDefaultControlStripModules();
    const extra = Array.from({
      length: 6
    }, (_, i) => ({
      ...builtIns[i % builtIns.length],
      id: \`module-\${i}\`
    }));
    return <ClassicyControlStrip modules={extra} defaultWidth={90} />;
  }
}`,...t.parameters?.docs?.source},description:{story:"Too narrow for its modules: the scroll arrows step through them.",...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    defaultCollapsed: true
  }
}`,...o.parameters?.docs?.source}}};const b=["Default","CustomModules","Scrolling","Collapsed"];export{o as Collapsed,n as CustomModules,s as Default,t as Scrolling,b as __namedExportsOrder,y as default};
