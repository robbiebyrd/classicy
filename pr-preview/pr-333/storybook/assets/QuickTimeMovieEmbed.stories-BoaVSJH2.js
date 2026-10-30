import{aI as n,aJ as d,j as e,r as p,J as c}from"./iframe-DJ7JmzOQ.js";import"./preload-helper-shce2T3m.js";const h={title:"Controls/QuickTime",component:d,decorators:[o=>e.jsx("div",{style:{width:480},children:e.jsx(o,{})})]},r={args:{appId:"storybook.app",name:"Sample Movie",url:n,type:"video",controlsDocked:!0}},s={args:{appId:"storybook.app",name:"Sample Movie",url:n,type:"video",controlsDocked:!1}},m=()=>{const[o,l]=p.useState(!1),[a,i]=p.useState(.5);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8},children:[e.jsx(d,{appId:"storybook.app",name:"Sample Movie",url:n,type:"video",hideControls:!0,playing:o,onPlayingChange:l,volume:a,onVolumeChange:i}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx(c,{onClickFunc:()=>l(!o),children:o?"Pause":"Play"}),e.jsx(c,{onClickFunc:()=>i(a>0?0:.5),children:a>0?"Mute":"Unmute"})]})]})},t={render:()=>e.jsx(m,{})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    appId: "storybook.app",
    name: "Sample Movie",
    url: sampleMovie,
    type: "video",
    controlsDocked: true
  }
}`,...r.parameters?.docs?.source},description:{story:"The layout Movie Player uses: `controlsDocked` pins the controller bar to\nthe bottom of the nearest positioned container. Keyboard shortcuts are\ninactive here, because they only follow a focused Movie Player window.",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    appId: "storybook.app",
    name: "Sample Movie",
    url: sampleMovie,
    type: "video",
    controlsDocked: false
  }
}`,...s.parameters?.docs?.source},description:{story:"With `controlsDocked` off, the controller bar flows directly beneath the\npicture: play/pause, seek bar and time, ±10 s, volume pop-up, fullscreen.",...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <ExternalTransport />
}`,...t.parameters?.docs?.source},description:{story:"Controlled playback with the built-in chrome hidden: `playing` and\n`volume` are owned by the parent and driven from ordinary buttons, the\npattern for a host that supplies its own transport (`hideControls` also\ndisables the keyboard shortcuts).",...t.parameters?.docs?.description}}};const v=["DockedControls","OverlayControls","ControlledPlayback"];export{t as ControlledPlayback,r as DockedControls,s as OverlayControls,v as __namedExportsOrder,h as default};
