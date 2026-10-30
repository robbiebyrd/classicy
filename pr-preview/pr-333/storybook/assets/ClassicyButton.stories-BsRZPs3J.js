import{J as l,j as d}from"./iframe-DaKszo_D.js";import{a as u,C as m}from"./ClassicyAppearanceProbe-CrIQrA0s.js";import"./preload-helper-shce2T3m.js";const{fn:h}=__STORYBOOK_MODULE_TEST__,b={title:"Controls/Button",component:l,args:{children:"OK",onClickFunc:h()}},e={},r={args:{isDefault:!0,children:"Save"}},s={args:{disabled:!0,children:"Disabled"}},a={args:{depressed:!0,children:"Pressed"}},t={args:{buttonSize:"small",children:"Small"}},o={args:{buttonShape:"square",children:"\u25B8"}},n={render:p=>d.jsxs("div",{style:{display:"flex"},children:[d.jsx(l,{...p,isDefault:!0,children:"OK"}),d.jsx(l,{...p,isDefault:!1,children:"Cancel"})]}),args:{children:"OK"}},i={args:{isDefault:!0,children:"Press Return"}},c={args:e.args,render:p=>d.jsx(m,{children:d.jsx(l,{...p})}),parameters:u()};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:"{}",...e.parameters?.docs?.source},description:{story:"A standard push button with its default (medium) size and spacing.",...e.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    isDefault: true,
    children: "Save"
  }
}`,...r.parameters?.docs?.source},description:{story:"`isDefault` draws the thick default-button ring that marks the dialog's most\nlikely action (HIGOS8 p.23). The ring is visual; the dialog or form wires\nReturn/Enter to it.",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "Disabled"
  }
}`,...s.parameters?.docs?.source},description:{story:"A dimmed, unclickable button: no click, sound or analytics event fires.",...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    depressed: true,
    children: "Pressed"
  }
}`,...a.parameters?.docs?.source},description:{story:"`depressed` holds the pressed look (and `aria-pressed`) \u2014 for a button that\nstands for an ongoing mode, or to show the pressed state for reference.",...a.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    buttonSize: "small",
    children: "Small"
  }
}`,...t.parameters?.docs?.source},description:{story:'`buttonSize="small"` \u2014 the compact size for dense palettes and toolbars.',...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    buttonShape: "square",
    children: "\u25B8"
  }
}`,...o.parameters?.docs?.source},description:{story:'`buttonShape="square"` gives a fixed square box for a single glyph or icon;\n`ClassicyBevelButton square` matches it, so the two line up on one grid.',...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:'Short-labelled buttons still honor the HIG minimum width (58px), so an\n"OK"/"Cancel" pair lines up at a consistent size. In a real dialog, wrap the\npair in `ClassicyFormButtonRow` for the HIG spacing.',...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    isDefault: true,
    children: "Press Return"
  }
}`,...i.parameters?.docs?.source},description:{story:`Focus the button and press Return/Enter (or Space) to see the ~8-tick
keyboard-activation highlight and hear the click sounds, matching a mouse
press.`,...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyButton>) => <ClassicyAppearanceProbe>
            <ClassicyButton {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...c.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...c.parameters?.docs?.description}}};const S=["Default","DefaultAction","Disabled","Depressed","Small","Square","OkCancelRow","KeyboardActivation","AppearanceHooks"];export{c as AppearanceHooks,e as Default,r as DefaultAction,a as Depressed,s as Disabled,i as KeyboardActivation,n as OkCancelRow,t as Small,o as Square,S as __namedExportsOrder,b as default};
