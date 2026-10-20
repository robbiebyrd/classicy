import{a0 as i,j as e,i as p}from"./iframe-Dma6PRx5.js";import"./preload-helper-PPVm8Dsz.js";const{fn:d}=__STORYBOOK_MODULE_TEST__,g={display:"inline-block",padding:4,background:"var(--color-system-03)","--classicy-pager-band":"var(--color-system-03)"},h={title:"Controls/Pager",component:i,args:{onPageChange:d()},decorators:[a=>e.jsx("div",{style:g,children:e.jsx(a,{})})]},l=()=>{const[a,c]=p.useState(0);return e.jsx(i,{page:a,pageCount:5,onPageChange:c})},r={args:{page:0,pageCount:5},render:()=>e.jsx(l,{})},s={args:{page:2,pageCount:5}},o={args:{page:4,pageCount:5}},t={args:{page:0,pageCount:1}},n={args:{page:0,pageCount:3},decorators:[a=>e.jsx("div",{style:{display:"inline-block",padding:4,background:"var(--color-system-01)","--classicy-pager-band":"initial"},children:e.jsx(a,{})})]};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    page: 0,
    pageCount: 5
  },
  render: () => <InteractivePager />
}`,...r.parameters?.docs?.source},description:{story:"A working five-page pager: the owner stores `page` from `onPageChange`.\nThe back arrow is disabled on page 1 and the forward arrow on page 5.",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    page: 2,
    pageCount: 5
  }
}`,...s.parameters?.docs?.source},description:{story:"Mid-way through a topic, both arrows are enabled. Being controlled, the\npager only reports the requested page (see the Actions panel) — with a\nfixed `page` nothing moves.",...s.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    page: 4,
    pageCount: 5
  }
}`,...o.parameters?.docs?.source},description:{story:"On the last page the forward arrow is disabled and drawn hollow.",...o.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    page: 0,
    pageCount: 1
  }
}`,...t.parameters?.docs?.source},description:{story:`A one-page topic needs no special case: both arrows derive their state
from position, so both render disabled.`,...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    page: 0,
    pageCount: 3
  },
  decorators: [Story => <div style={{
    display: "inline-block",
    padding: 4,
    background: "var(--color-system-01)",
    // Unset the meta decorator's override so the fallback applies.
    "--classicy-pager-band": "initial"
  } as CSSProperties}>
                <Story />
            </div>]
}`,...n.parameters?.docs?.source},description:{story:"On its default band, `--color-system-01`, no override is needed: the\nhollow arrows punch out in the pager's built-in fallback colour.",...n.parameters?.docs?.description}}};const y=["Interactive","MiddlePage","LastPage","SinglePage","DefaultBand"];export{n as DefaultBand,r as Interactive,o as LastPage,s as MiddlePage,t as SinglePage,y as __namedExportsOrder,h as default};
