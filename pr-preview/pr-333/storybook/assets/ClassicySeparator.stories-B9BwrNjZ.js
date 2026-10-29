import{ak as r,j as t,b as e}from"./iframe-DujP1aEX.js";import"./preload-helper-shce2T3m.js";const c={title:"Controls/Separator",component:r},n={args:{orientation:"horizontal"},decorators:[o=>t.jsxs("div",{style:{width:260,padding:16},children:[t.jsx("p",{style:{margin:0},children:"Section above the divider."}),t.jsx(o,{}),t.jsx("p",{style:{margin:0},children:"Section below the divider."})]})]},s={args:{orientation:"vertical"},decorators:[o=>t.jsxs("div",{style:{display:"flex",alignItems:"stretch",height:80,padding:16,gap:8},children:[t.jsx(e,{children:"Left"}),t.jsx(o,{}),t.jsx(e,{children:"Right"})]})]},i={render:()=>t.jsxs("div",{style:{width:260,padding:16},children:[t.jsxs("div",{style:{display:"flex",gap:8,marginBottom:8},children:[t.jsx(e,{children:"Cut"}),t.jsx(e,{children:"Copy"}),t.jsx(e,{children:"Paste"})]}),t.jsx(r,{}),t.jsxs("div",{style:{display:"flex",gap:8,marginTop:8},children:[t.jsx(e,{children:"Undo"}),t.jsx(e,{children:"Redo"})]})]})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    orientation: "horizontal"
  },
  decorators: [Story => <div style={{
    width: 260,
    padding: 16
  }}>
                <p style={{
      margin: 0
    }}>Section above the divider.</p>
                <Story />
                <p style={{
      margin: 0
    }}>Section below the divider.</p>
            </div>]
}`,...n.parameters?.docs?.source},description:{story:"The default horizontal rule, spanning the width of its container between two blocks of content.",...n.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    orientation: "vertical"
  },
  decorators: [Story => <div style={{
    display: "flex",
    alignItems: "stretch",
    height: 80,
    padding: 16,
    gap: 8
  }}>
                <ClassicyButton>Left</ClassicyButton>
                <Story />
                <ClassicyButton>Right</ClassicyButton>
            </div>]
}`,...s.parameters?.docs?.source},description:{story:'`orientation="vertical"` stretches to the height of a flex row to divide side-by-side content.',...s.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: 260,
    padding: 16
  }}>
            <div style={{
      display: "flex",
      gap: 8,
      marginBottom: 8
    }}>
                <ClassicyButton>Cut</ClassicyButton>
                <ClassicyButton>Copy</ClassicyButton>
                <ClassicyButton>Paste</ClassicyButton>
            </div>
            <ClassicySeparator />
            <div style={{
      display: "flex",
      gap: 8,
      marginTop: 8
    }}>
                <ClassicyButton>Undo</ClassicyButton>
                <ClassicyButton>Redo</ClassicyButton>
            </div>
        </div>
}`,...i.parameters?.docs?.source},description:{story:"Separating two rows of controls inside a dialog content region.",...i.parameters?.docs?.description}}};const l=["Horizontal","Vertical","BetweenControlRows"];export{i as BetweenControlRows,n as Horizontal,s as Vertical,l as __namedExportsOrder,c as default};
