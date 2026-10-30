import{B as m,j as e,D as b,n as r,E as y,F as C,G as f,b as x,H as k}from"./iframe-BlH3vcfR.js";import"./preload-helper-PPVm8Dsz.js";const j={title:"Controls/ControlGroup",component:m},s={args:{label:"Connection",children:e.jsxs(e.Fragment,{children:[e.jsx(b,{id:"cg-host",labelTitle:"Host"}),e.jsx(r,{id:"cg-remember",checked:!0,label:"Remember me"})]})}},a={args:{label:"File Sharing",variant:"primary",children:e.jsx(r,{id:"cg-primary",checked:!0,label:"Share this item"})}},t={args:{label:"Access Privileges",variant:"secondary",children:e.jsx(r,{id:"cg-secondary",checked:!0,label:"Allow guests"})}},o={args:{children:e.jsx(r,{id:"cg-untitled",checked:!0,label:"Enabled"})}},l={args:{checkboxTitle:{id:"cg-cb-title",checked:!0,label:"Use custom settings"},children:e.jsxs(e.Fragment,{children:[e.jsx(b,{id:"cg-cb-detail",labelTitle:"Server"}),e.jsx(r,{id:"cg-cb-secure",checked:!0,label:"Use SSL"})]})}},n={args:{popUpMenuTitle:{id:"cg-popup-title",options:[{value:"startup",label:"Startup Disk"},{value:"network",label:"Network"}],selected:"startup"},children:e.jsx(r,{id:"cg-popup-detail",checked:!0,label:"Show in Finder"})}},c={args:{label:"Options",columns:!0,children:e.jsxs(e.Fragment,{children:[e.jsx(r,{id:"cg-a",checked:!0,label:"Sound"}),e.jsx(r,{id:"cg-b",label:"Speech"}),e.jsx(r,{id:"cg-c",label:"Alerts"})]})},render:g=>e.jsxs("div",{style:{display:"flex",width:420},children:[e.jsx(m,{...g}),e.jsxs(m,{label:"Feedback",columns:!0,children:[e.jsx(r,{id:"cg-d",checked:!0,label:"Flash menu bar"}),e.jsx(r,{id:"cg-e",label:"Speak alerts"})]})]})},i={args:{label:"On a White Surface",backgroundColor:"#ffffff",children:e.jsx(r,{id:"cg-custom",checked:!0,label:"Enabled"})},decorators:[g=>e.jsx("div",{style:{background:"#ffffff",padding:"16px"},children:e.jsx(g,{})})]},d={args:{label:"Server",layout:"form",children:e.jsxs(e.Fragment,{children:[e.jsx(b,{id:"cg-form-host",labelTitle:"Host",labelPosition:"left"}),e.jsx(b,{id:"cg-form-user",labelTitle:"User name",labelPosition:"left"})]})}},u={args:{label:"Screen Saver",layout:"form",children:e.jsxs(e.Fragment,{children:[e.jsx(y,{children:e.jsx(r,{id:"cg-rows-enabled",checked:!0,label:"Start screen saver when idle"})}),e.jsx(C,{id:"cg-rows-saver",label:"Screen saver",labelPosition:"left",options:[{value:"toasters",label:"Flying Toasters"},{value:"fish",label:"Fish"}],selected:"toasters"}),e.jsx(f,{id:"cg-rows-minutes",labelTitle:"Minutes of inactivity",labelPosition:"left",minValue:1,maxValue:240,prefillValue:5}),e.jsx(y,{justify:"end",children:e.jsx(x,{children:"Test"})})]})}},p={args:{label:"General",children:null},render:()=>e.jsxs(k,{children:[e.jsx(m,{label:"General",layout:"form",children:e.jsx(b,{id:"cg-stack-name",labelTitle:"Name",labelPosition:"left"})}),e.jsx(m,{label:"Options",layout:"form",children:e.jsx(y,{children:e.jsx(r,{id:"cg-stack-verify",checked:!0,label:"Verify on startup"})})})]})},h={args:{title:e.jsx("strong",{children:"Startup Disk"}),children:e.jsx(r,{id:"cg-rich",checked:!0,label:"Verify on startup"})}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Connection",
    children: <>
                <ClassicyInput id="cg-host" labelTitle="Host" />
                <ClassicyCheckbox id="cg-remember" checked={true} label="Remember me" />
            </>
  }
}`,...s.parameters?.docs?.source},description:{story:"A titled primary group box holding a text field and a checkbox.",...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    label: "File Sharing",
    variant: "primary",
    children: <ClassicyCheckbox id="cg-primary" checked={true} label="Share this item" />
  }
}`,...a.parameters?.docs?.source},description:{story:'`variant="primary"`: the 2px etched frame — the default look.',...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Access Privileges",
    variant: "secondary",
    children: <ClassicyCheckbox id="cg-secondary" checked={true} label="Allow guests" />
  }
}`,...t.parameters?.docs?.source},description:{story:'`variant="secondary"`: a single 1px line, for lighter or nested grouping.',...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    children: <ClassicyCheckbox id="cg-untitled" checked={true} label="Enabled" />
  }
}`,...o.parameters?.docs?.source},description:{story:"An untitled group box: with no title prop set, no `<legend>` is rendered.",...o.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source},description:{story:"`checkboxTitle`: the title is a `ClassicyCheckbox` (props passed through).\nBy HIG convention it governs the group's controls; wiring that enablement\nis up to the caller.",...l.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:"`popUpMenuTitle`: the title is a `ClassicyPopUpMenu` (props passed through)\nwhose choice decides what the group shows; swapping the content is up to the\ncaller.",...n.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
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
}`,...c.parameters?.docs?.source},description:{story:"`columns` lets a group grow to fill its flex row, so groups placed side by\nside share the width as columns.",...c.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
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
}`,...d.parameters?.docs?.source},description:{story:'`layout="form"` turns the content into a two-column grid: each\n`ClassicyInput`\'s label and field become one row, so the fields line up.',...d.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Screen Saver",
    layout: "form",
    children: <>
                <ClassicyControlGroupFormRow>
                    <ClassicyCheckbox id="cg-rows-enabled" checked={true} label="Start screen saver when idle" />
                </ClassicyControlGroupFormRow>
                <ClassicyPopUpMenu id="cg-rows-saver" label="Screen saver" labelPosition="left" options={[{
        value: "toasters",
        label: "Flying Toasters"
      }, {
        value: "fish",
        label: "Fish"
      }]} selected="toasters" />
                <ClassicySpinner id="cg-rows-minutes" labelTitle="Minutes of inactivity" labelPosition="left" minValue={1} maxValue={240} prefillValue={5} />
                <ClassicyControlGroupFormRow justify="end">
                    <ClassicyButton>Test</ClassicyButton>
                </ClassicyControlGroupFormRow>
            </>
  }
}`,...u.parameters?.docs?.source},description:{story:'Rows that are not a label/control pair — a checkbox, a push button — go in a\n`ClassicyControlGroupFormRow`, which spans both columns; `justify="end"`\nputs a button at the group\'s lower right (HIGOS8 p.72). Mixed controls\n(pop-up, spinner, text field) share one control column.',...u.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    label: "General",
    children: null
  },
  render: () => <ClassicyControlGroupStack>
            <ClassicyControlGroup label="General" layout="form">
                <ClassicyInput id="cg-stack-name" labelTitle="Name" labelPosition="left" />
            </ClassicyControlGroup>
            <ClassicyControlGroup label="Options" layout="form">
                <ClassicyControlGroupFormRow>
                    <ClassicyCheckbox id="cg-stack-verify" checked={true} label="Verify on startup" />
                </ClassicyControlGroupFormRow>
            </ClassicyControlGroup>
        </ClassicyControlGroupStack>
}`,...p.parameters?.docs?.source},description:{story:"`ClassicyControlGroupStack` stacks group boxes 12px frame to frame (HIGOS8\nFigure 3-29); a lower group's title overhangs into that gap instead of\nwidening it.",...p.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    title: <strong>Startup Disk</strong>,
    children: <ClassicyCheckbox id="cg-rich" checked={true} label="Verify on startup" />
  }
}`,...h.parameters?.docs?.source},description:{story:"`title` takes any node — here a bold run — when plain text is not enough.",...h.parameters?.docs?.description}}};const v=["Default","Primary","Secondary","Untitled","CheckboxTitle","PopUpMenuTitle","Columns","CustomBackground","FormLayout","FormLayoutWithRows","Stacked","RichTitle"];export{l as CheckboxTitle,c as Columns,i as CustomBackground,s as Default,d as FormLayout,u as FormLayoutWithRows,n as PopUpMenuTitle,a as Primary,h as RichTitle,t as Secondary,p as Stacked,o as Untitled,v as __namedExportsOrder,j as default};
