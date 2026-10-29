import{b as d,j as c}from"./iframe-x7gCwONF.js";import"./preload-helper-PPVm8Dsz.js";const{fn:u}=__STORYBOOK_MODULE_TEST__,h={title:"Controls/Button",component:d,args:{children:"OK",onClickFunc:u()}},e={},s={args:{isDefault:!0,children:"Save"}},r={args:{disabled:!0,children:"Disabled"}},a={args:{depressed:!0,children:"Pressed"}},t={args:{buttonSize:"small",children:"Small"}},n={args:{buttonShape:"square",children:"▸"}},o={render:l=>c.jsxs("div",{style:{display:"flex"},children:[c.jsx(d,{...l,isDefault:!0,children:"OK"}),c.jsx(d,{...l,isDefault:!1,children:"Cancel"})]}),args:{children:"OK"}},i={args:{isDefault:!0,children:"Press Return"}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source},description:{story:"A standard push button with its default (medium) size and spacing.",...e.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    isDefault: true,
    children: "Save"
  }
}`,...s.parameters?.docs?.source},description:{story:"`isDefault` draws the thick default-button ring that marks the dialog's most\nlikely action (HIGOS8 p.23). The ring is visual; the dialog or form wires\nReturn/Enter to it.",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "Disabled"
  }
}`,...r.parameters?.docs?.source},description:{story:"A dimmed, unclickable button: no click, sound or analytics event fires.",...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    depressed: true,
    children: "Pressed"
  }
}`,...a.parameters?.docs?.source},description:{story:"`depressed` holds the pressed look (and `aria-pressed`) — for a button that\nstands for an ongoing mode, or to show the pressed state for reference.",...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    buttonSize: "small",
    children: "Small"
  }
}`,...t.parameters?.docs?.source},description:{story:'`buttonSize="small"` — the compact size for dense palettes and toolbars.',...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    buttonShape: "square",
    children: "▸"
  }
}`,...n.parameters?.docs?.source},description:{story:'`buttonShape="square"` gives a fixed square box for a single glyph or icon;\n`ClassicyBevelButton square` matches it, so the two line up on one grid.',...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: args => <div style={{
    display: "flex"
  }}>
            <ClassicyButton {...args} isDefault={true}>
                OK
            </ClassicyButton>
            <ClassicyButton {...args} isDefault={false}>
                Cancel
            </ClassicyButton>
        </div>,
  args: {
    children: "OK"
  }
}`,...o.parameters?.docs?.source},description:{story:'Short-labelled buttons still honor the HIG minimum width (58px), so an\n"OK"/"Cancel" pair lines up at a consistent size. In a real dialog, wrap the\npair in `ClassicyFormButtonRow` for the HIG spacing.',...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    isDefault: true,
    children: "Press Return"
  }
}`,...i.parameters?.docs?.source},description:{story:`Focus the button and press Return/Enter (or Space) to see the ~8-tick
keyboard-activation highlight and hear the click sounds, matching a mouse
press.`,...i.parameters?.docs?.description}}};const g=["Default","DefaultAction","Disabled","Depressed","Small","Square","OkCancelRow","KeyboardActivation"];export{e as Default,s as DefaultAction,a as Depressed,r as Disabled,i as KeyboardActivation,o as OkCancelRow,t as Small,n as Square,g as __namedExportsOrder,h as default};
