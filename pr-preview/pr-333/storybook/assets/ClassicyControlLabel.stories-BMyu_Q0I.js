import{S as n,a8 as i}from"./iframe-DdP4fJNi.js";import"./preload-helper-shce2T3m.js";const d={title:"Controls/ControlLabel",component:i},e={args:{label:"Printer Name"}},s={args:{label:"Get Info",icon:n.system.info}},r={args:{label:"Section Heading",labelSize:"large"}},a={args:{label:"Unavailable Option",disabled:!0}},o={args:{label:"Caption",labelSize:"small"}},t={args:{label:"Get Info",icon:n.system.info,iconSize:"sm",direction:"right"}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Printer Name"
  }
}`,...e.parameters?.docs?.source},description:{story:"A plain medium-size label in the theme's UI font.",...e.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Get Info",
    icon: ClassicyIcons.system.info as string
  }
}`,...s.parameters?.docs?.source},description:{story:"`icon` draws a picture before the text (32px by default; `iconSize` takes `sm` or `lg`).",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Section Heading",
    labelSize: "large"
  }
}`,...r.parameters?.docs?.source},description:{story:'`labelSize="large"` — double-size text.',...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Unavailable Option",
    disabled: true
  }
}`,...a.parameters?.docs?.source},description:{story:"`disabled` draws the text in the HIG's dimmed grey, for a label whose control is inactive.",...a.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Caption",
    labelSize: "small"
  }
}`,...o.parameters?.docs?.source},description:{story:'`labelSize="small"` — text at 80% of the UI font size.',...o.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Get Info",
    icon: ClassicyIcons.system.info as string,
    iconSize: "sm",
    direction: "right"
  }
}`,...t.parameters?.docs?.source},description:{story:'`direction="right"` reverses the row, so the icon follows the text.',...t.parameters?.docs?.description}}};const m=["Default","WithIcon","Large","Disabled","Small","IconAfterText"];export{e as Default,a as Disabled,t as IconAfterText,r as Large,o as Small,s as WithIcon,m as __namedExportsOrder,d as default};
