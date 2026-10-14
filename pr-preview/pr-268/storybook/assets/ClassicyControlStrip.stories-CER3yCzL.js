import{t as c,r as d,u as m,f as i,j as l}from"./iframe-D9ssu4Py.js";import{d as g}from"./helpers-DrBzQAc8.js";import{C as h}from"./ClassicyPopUpSlider-Bb-g18WA.js";import"./preload-helper-BH7b3-7c.js";const{fn:f}=__STORYBOOK_MODULE_TEST__,O={title:"Desktop/ControlStrip",component:c,parameters:{...g,classicy:{desktop:!0,controlStrip:!1}}},s={},n={render:()=>{const[e,a]=d.useState(!1),[u,r]=d.useState(70),p=m(),S=[{id:"file-sharing",label:"File Sharing",icon:i.system.controlStrip.fileSharing,menuItems:[{id:"file-sharing-status",title:e?"1 User Connected":"No Users Connected",disabled:!0,className:"classicyControlStripStatus"},{id:"spacer"},{id:"file-sharing-open",title:"Open File Sharing Control Panel",onClickFunc:f()},{id:"spacer"},{id:"file-sharing-toggle",title:e?"Turn File Sharing Off":"Turn File Sharing On",onClickFunc:()=>a(C=>!C)}]},{id:"volume",label:"Volume",icon:i.system.controlStrip.sound,content:l.jsx(h,{ariaLabel:"Volume",value:u,onChange:r})},{id:"cd",label:"CD",icon:i.system.controlStrip.cd,menuItems:[{id:"cd-status",title:"No Audio CD",disabled:!0,className:"classicyControlStripStatus"}]},...p];return l.jsx(c,{modules:S})}},t={render:()=>{const e=m(),a=Array.from({length:6},(u,r)=>({...e[r%e.length],id:`module-${r}`}));return l.jsx(c,{modules:a,defaultWidth:90})}},o={args:{defaultCollapsed:!0}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:"{}",...s.parameters?.docs?.source},description:{story:"The built-in Sound and Screen Saver modules.",...s.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [sharing, setSharing] = useState(false);
    const [volume, setVolume] = useState(70);
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
      id: "volume",
      label: "Volume",
      icon: ClassicyIcons.system.controlStrip.sound,
      content: <ClassicyPopUpSlider ariaLabel="Volume" value={volume} onChange={setVolume} />
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
status line and offers a command that opens its control panel, beside a
volume module that pops up a slider instead of a menu (Figure 2-16).`,...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source}}};const x=["Default","CustomModules","Scrolling","Collapsed"];export{o as Collapsed,n as CustomModules,s as Default,t as Scrolling,x as __namedExportsOrder,O as default};
