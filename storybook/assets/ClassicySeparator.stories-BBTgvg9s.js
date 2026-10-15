import{_ as a,j as n,h as t}from"./iframe-CygXGd__.js";import"./preload-helper-PPVm8Dsz.js";const l={title:"Controls/Separator",component:a},s={args:{orientation:"horizontal"},decorators:[r=>n.jsxs("div",{style:{width:260,padding:16},children:[n.jsx("p",{style:{margin:0},children:"Section above the divider."}),n.jsx(r,{}),n.jsx("p",{style:{margin:0},children:"Section below the divider."})]})]},e={args:{orientation:"vertical"},decorators:[r=>n.jsxs("div",{style:{display:"flex",alignItems:"stretch",height:80,padding:16,gap:8},children:[n.jsx(t,{children:"Left"}),n.jsx(r,{}),n.jsx(t,{children:"Right"})]})]},i={render:()=>n.jsxs("div",{style:{width:260,padding:16},children:[n.jsxs("div",{style:{display:"flex",gap:8,marginBottom:8},children:[n.jsx(t,{children:"Cut"}),n.jsx(t,{children:"Copy"}),n.jsx(t,{children:"Paste"})]}),n.jsx(a,{}),n.jsxs("div",{style:{display:"flex",gap:8,marginTop:8},children:[n.jsx(t,{children:"Undo"}),n.jsx(t,{children:"Redo"})]})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
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
}`,...e.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
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
}`,...i.parameters?.docs?.source}}};const c=["Horizontal","Vertical","BetweenControlRows"];export{i as BetweenControlRows,s as Horizontal,e as Vertical,c as __namedExportsOrder,l as default};
