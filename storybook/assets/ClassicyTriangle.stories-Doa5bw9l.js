import{an as n,i as l,j as e}from"./iframe-CCrHCQmw.js";import"./preload-helper-PPVm8Dsz.js";const{fn:d}=__STORYBOOK_MODULE_TEST__,m={title:"Controls/Triangle",component:n,args:{onToggle:d()}},r={args:{defaultOpen:!1}},t={render:()=>e.jsxs("div",{style:{display:"flex",gap:"1em"},children:[e.jsx(n,{direction:"up",interactive:!1}),e.jsx(n,{direction:"right",interactive:!1}),e.jsx(n,{direction:"down",interactive:!1}),e.jsx(n,{direction:"left",interactive:!1})]})},s={render:function(i){const[o,c]=l.useState(!0);return e.jsxs("div",{children:[e.jsx(n,{...i,open:o,onToggle:a=>{i.onToggle?.(a),c(a)}}),o&&e.jsx("p",{style:{margin:0},children:"Detail shown while open."})]})}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    defaultOpen: false
  }
}`,...r.parameters?.docs?.source},description:{story:`An uncontrolled, interactive triangle: click it (or focus it and press
Enter/Space) to turn it between closed (right) and open (down).`,...r.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: "1em"
  }}>
            <ClassicyTriangle direction="up" interactive={false} />
            <ClassicyTriangle direction="right" interactive={false} />
            <ClassicyTriangle direction="down" interactive={false} />
            <ClassicyTriangle direction="left" interactive={false} />
        </div>
}`,...t.parameters?.docs?.source},description:{story:"The four closed `direction`s, drawn as bare non-interactive SVGs. Right is\nthe HIG's standard closed triangle.",...t.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: function Render(args) {
    const [open, setOpen] = useState(true);
    return <div>
                <ClassicyTriangle {...args} open={open} onToggle={next => {
        args.onToggle?.(next);
        setOpen(next);
      }} />
                {open && <p style={{
        margin: 0
      }}>Detail shown while open.</p>}
            </div>;
  }
}`,...s.parameters?.docs?.source},description:{story:"Controlled use: the parent owns `open` and updates it from `onToggle`, here\nshowing a line of detail while open.",...s.parameters?.docs?.description}}};const f=["Interactive","Directions","Controlled"];export{s as Controlled,t as Directions,r as Interactive,f as __namedExportsOrder,m as default};
