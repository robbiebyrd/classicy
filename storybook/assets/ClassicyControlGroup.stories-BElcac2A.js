import{n as p,j as e,o as d,l as r}from"./iframe-D2XmTs5i.js";import"./preload-helper-PPVm8Dsz.js";const m={title:"Controls/ControlGroup",component:p},c={args:{label:"Connection",children:e.jsxs(e.Fragment,{children:[e.jsx(d,{id:"cg-host",labelTitle:"Host"}),e.jsx(r,{id:"cg-remember",checked:!0,label:"Remember me"})]})}},s={args:{label:"File Sharing",variant:"primary",children:e.jsx(r,{id:"cg-primary",checked:!0,label:"Share this item"})}},a={args:{label:"Access Privileges",variant:"secondary",children:e.jsx(r,{id:"cg-secondary",checked:!0,label:"Allow guests"})}},l={args:{children:e.jsx(r,{id:"cg-untitled",checked:!0,label:"Enabled"})}},n={args:{checkboxTitle:{id:"cg-cb-title",checked:!0,label:"Use custom settings"},children:e.jsxs(e.Fragment,{children:[e.jsx(d,{id:"cg-cb-detail",labelTitle:"Server"}),e.jsx(r,{id:"cg-cb-secure",checked:!0,label:"Use SSL"})]})}},t={args:{popUpMenuTitle:{id:"cg-popup-title",options:[{value:"startup",label:"Startup Disk"},{value:"network",label:"Network"}],selected:"startup"},children:e.jsx(r,{id:"cg-popup-detail",checked:!0,label:"Show in Finder"})}},o={args:{label:"Options",columns:!0,children:e.jsxs(e.Fragment,{children:[e.jsx(r,{id:"cg-a",checked:!0,label:"Sound"}),e.jsx(r,{id:"cg-b",label:"Speech"}),e.jsx(r,{id:"cg-c",label:"Alerts"})]})}},i={args:{label:"On a White Surface",backgroundColor:"#ffffff",children:e.jsx(r,{id:"cg-custom",checked:!0,label:"Enabled"})},decorators:[u=>e.jsx("div",{style:{background:"#ffffff",padding:"16px"},children:e.jsx(u,{})})]};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Connection",
    children: <>
                <ClassicyInput id="cg-host" labelTitle="Host" />
                <ClassicyCheckbox id="cg-remember" checked={true} label="Remember me" />
            </>
  }
}`,...c.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    label: "File Sharing",
    variant: "primary",
    children: <ClassicyCheckbox id="cg-primary" checked={true} label="Share this item" />
  }
}`,...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Access Privileges",
    variant: "secondary",
    children: <ClassicyCheckbox id="cg-secondary" checked={true} label="Allow guests" />
  }
}`,...a.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    children: <ClassicyCheckbox id="cg-untitled" checked={true} label="Enabled" />
  }
}`,...l.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    checkboxTitle: {
      id: "cg-cb-title",
      checked: true,
      label: "Use custom settings"
    },
    children: <>
                <ClassicyInput id="cg-cb-detail" labelTitle="Server" />
                <ClassicyCheckbox id="cg-cb-secure" checked={true} label="Use SSL" />
            </>
  }
}`,...n.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    popUpMenuTitle: {
      id: "cg-popup-title",
      options: [{
        value: "startup",
        label: "Startup Disk"
      }, {
        value: "network",
        label: "Network"
      }],
      selected: "startup"
    },
    children: <ClassicyCheckbox id="cg-popup-detail" checked={true} label="Show in Finder" />
  }
}`,...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Options",
    columns: true,
    children: <>
                <ClassicyCheckbox id="cg-a" checked={true} label="Sound" />
                <ClassicyCheckbox id="cg-b" label="Speech" />
                <ClassicyCheckbox id="cg-c" label="Alerts" />
            </>
  }
}`,...o.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    label: "On a White Surface",
    backgroundColor: "#ffffff",
    children: <ClassicyCheckbox id="cg-custom" checked={true} label="Enabled" />
  },
  decorators: [Story => <div style={{
    background: "#ffffff",
    padding: "16px"
  }}>
                <Story />
            </div>]
}`,...i.parameters?.docs?.source}}};const h=["Default","Primary","Secondary","Untitled","CheckboxTitle","PopUpMenuTitle","Columns","CustomBackground"];export{n as CheckboxTitle,o as Columns,i as CustomBackground,c as Default,t as PopUpMenuTitle,s as Primary,a as Secondary,l as Untitled,h as __namedExportsOrder,m as default};
