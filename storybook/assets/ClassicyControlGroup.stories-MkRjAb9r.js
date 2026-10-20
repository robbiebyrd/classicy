import{B as m,j as e,D as u,n as r}from"./iframe-Cdrq9qm7.js";import"./preload-helper-PPVm8Dsz.js";const y={title:"Controls/ControlGroup",component:m},s={args:{label:"Connection",children:e.jsxs(e.Fragment,{children:[e.jsx(u,{id:"cg-host",labelTitle:"Host"}),e.jsx(r,{id:"cg-remember",checked:!0,label:"Remember me"})]})}},t={args:{label:"File Sharing",variant:"primary",children:e.jsx(r,{id:"cg-primary",checked:!0,label:"Share this item"})}},a={args:{label:"Access Privileges",variant:"secondary",children:e.jsx(r,{id:"cg-secondary",checked:!0,label:"Allow guests"})}},c={args:{children:e.jsx(r,{id:"cg-untitled",checked:!0,label:"Enabled"})}},o={args:{checkboxTitle:{id:"cg-cb-title",checked:!0,label:"Use custom settings"},children:e.jsxs(e.Fragment,{children:[e.jsx(u,{id:"cg-cb-detail",labelTitle:"Server"}),e.jsx(r,{id:"cg-cb-secure",checked:!0,label:"Use SSL"})]})}},n={args:{popUpMenuTitle:{id:"cg-popup-title",options:[{value:"startup",label:"Startup Disk"},{value:"network",label:"Network"}],selected:"startup"},children:e.jsx(r,{id:"cg-popup-detail",checked:!0,label:"Show in Finder"})}},l={args:{label:"Options",columns:!0,children:e.jsxs(e.Fragment,{children:[e.jsx(r,{id:"cg-a",checked:!0,label:"Sound"}),e.jsx(r,{id:"cg-b",label:"Speech"}),e.jsx(r,{id:"cg-c",label:"Alerts"})]})},render:h=>e.jsxs("div",{style:{display:"flex",width:420},children:[e.jsx(m,{...h}),e.jsxs(m,{label:"Feedback",columns:!0,children:[e.jsx(r,{id:"cg-d",checked:!0,label:"Flash menu bar"}),e.jsx(r,{id:"cg-e",label:"Speak alerts"})]})]})},i={args:{label:"On a White Surface",backgroundColor:"#ffffff",children:e.jsx(r,{id:"cg-custom",checked:!0,label:"Enabled"})},decorators:[h=>e.jsx("div",{style:{background:"#ffffff",padding:"16px"},children:e.jsx(h,{})})]},d={args:{label:"Server",layout:"form",children:e.jsxs(e.Fragment,{children:[e.jsx(u,{id:"cg-form-host",labelTitle:"Host",labelPosition:"left"}),e.jsx(u,{id:"cg-form-user",labelTitle:"User name",labelPosition:"left"})]})}},p={args:{title:e.jsx("strong",{children:"Startup Disk"}),children:e.jsx(r,{id:"cg-rich",checked:!0,label:"Verify on startup"})}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Connection",
    children: <>
                <ClassicyInput id="cg-host" labelTitle="Host" />
                <ClassicyCheckbox id="cg-remember" checked={true} label="Remember me" />
            </>
  }
}`,...s.parameters?.docs?.source},description:{story:"A titled primary group box holding a text field and a checkbox.",...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    label: "File Sharing",
    variant: "primary",
    children: <ClassicyCheckbox id="cg-primary" checked={true} label="Share this item" />
  }
}`,...t.parameters?.docs?.source},description:{story:'`variant="primary"`: the 2px etched frame — the default look.',...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Access Privileges",
    variant: "secondary",
    children: <ClassicyCheckbox id="cg-secondary" checked={true} label="Allow guests" />
  }
}`,...a.parameters?.docs?.source},description:{story:'`variant="secondary"`: a single 1px line, for lighter or nested grouping.',...a.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    children: <ClassicyCheckbox id="cg-untitled" checked={true} label="Enabled" />
  }
}`,...c.parameters?.docs?.source},description:{story:"An untitled group box: with no title prop set, no `<legend>` is rendered.",...c.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source},description:{story:"`checkboxTitle`: the title is a `ClassicyCheckbox` (props passed through).\nBy HIG convention it governs the group's controls; wiring that enablement\nis up to the caller.",...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:"`popUpMenuTitle`: the title is a `ClassicyPopUpMenu` (props passed through)\nwhose choice decides what the group shows; swapping the content is up to the\ncaller.",...n.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Options",
    columns: true,
    children: <>
                <ClassicyCheckbox id="cg-a" checked={true} label="Sound" />
                <ClassicyCheckbox id="cg-b" label="Speech" />
                <ClassicyCheckbox id="cg-c" label="Alerts" />
            </>
  },
  render: args => <div style={{
    display: "flex",
    width: 420
  }}>
            <ClassicyControlGroup {...args} />
            <ClassicyControlGroup label="Feedback" columns={true}>
                <ClassicyCheckbox id="cg-d" checked={true} label="Flash menu bar" />
                <ClassicyCheckbox id="cg-e" label="Speak alerts" />
            </ClassicyControlGroup>
        </div>
}`,...l.parameters?.docs?.source},description:{story:"`columns` lets a group grow to fill its flex row, so groups placed side by\nside share the width as columns.",...l.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
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
}`,...i.parameters?.docs?.source},description:{story:"`backgroundColor` must match the surface the group sits on, because the\ntitle paints it to mask the frame line — here a white surface.",...i.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Server",
    layout: "form",
    children: <>
                <ClassicyInput id="cg-form-host" labelTitle="Host" labelPosition="left" />
                <ClassicyInput id="cg-form-user" labelTitle="User name" labelPosition="left" />
            </>
  }
}`,...d.parameters?.docs?.source},description:{story:'`layout="form"` turns the content into a two-column grid: each\n`ClassicyInput`\'s label and field become one row, so the fields line up.',...d.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    title: <strong>Startup Disk</strong>,
    children: <ClassicyCheckbox id="cg-rich" checked={true} label="Verify on startup" />
  }
}`,...p.parameters?.docs?.source},description:{story:"`title` takes any node — here a bold run — when plain text is not enough.",...p.parameters?.docs?.description}}};const k=["Default","Primary","Secondary","Untitled","CheckboxTitle","PopUpMenuTitle","Columns","CustomBackground","FormLayout","RichTitle"];export{o as CheckboxTitle,l as Columns,i as CustomBackground,s as Default,d as FormLayout,n as PopUpMenuTitle,t as Primary,p as RichTitle,a as Secondary,c as Untitled,k as __namedExportsOrder,y as default};
