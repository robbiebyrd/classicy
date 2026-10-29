import{l,g,j as c,d as m}from"./iframe-DyCxAP_t.js";import"./preload-helper-shce2T3m.js";const u=({saverId:t,config:d})=>{const i=g(t);if(!i)return c.jsxs("p",{children:["No screen saver is registered as “",t,"”."]});const p=i.component;return c.jsx("div",{role:"presentation",style:{position:"relative",width:480,height:300,overflow:"hidden",background:i.transparentBackground?"var(--desktop-background-color, #6666cc)":"var(--color-black, #000)"},children:c.jsx(p,{config:m(i,d)})})},f={title:"Extensions/ScreenSaver",component:u,argTypes:{saverId:{control:"select",options:l().map(t=>t.id)}},parameters:{docs:{description:{component:"`ScreenSaver.app` — an extension `ClassicyDesktop` mounts automatically.\nAfter `timeoutMinutes` (default 5) of real-world inactivity (wall clock,\nindependent of the Date & Time virtual clock) it covers the desktop with\nthe selected saver; any input wakes it, and the waking keystroke or click\nis swallowed. Users pick a saver, timeout and options in the Screen Saver\ncontrol panel; the Control Strip module offers Sleep Now and an on/off\ntoggle. Apps can dispatch\n`ClassicyAppScreenSaverActivate`, `…SetSaver { saverId }`,\n`…SetTimeout { minutes }`, `…SetEnabled { enabled }` and\n`…SetConfig { saverId, config }`.\n\nSavers are plain components registered at module scope with\n`registerClassicyScreenSaver({ id, name, component, configSchema?,\ndefaultConfig?, configComponent?, transparentBackground? })`;\nre-registering an id replaces it. These stories render built-in savers\n(ported from bryanbraun/after-dark-css) in a box rather than the real\nfull-viewport overlay, which also pauses animation for reduced-motion users."}}}},e={args:{saverId:"bouncing-ball",config:{balls:5}}},s={args:{saverId:"flying-toasters",config:{toasters:12,toast:6}}},r={args:{saverId:"fish"}},a={args:{saverId:"messages",config:{text:"BACK IN FIVE MINUTES",speedSeconds:8}}},o={args:{saverId:"warp"}},n={args:{saverId:"spotlight"}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "bouncing-ball",
    config: {
      balls: 5
    }
  }
}`,...e.parameters?.docs?.source},description:{story:"The default saver (`bouncing-ball`). Its `balls` option (1–12, default 3)\nis edited through a custom `configComponent` — the reference example for\nsaver authors.",...e.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "flying-toasters",
    config: {
      toasters: 12,
      toast: 6
    }
  }
}`,...s.parameters?.docs?.source},description:{story:"After Dark's best-known saver. `toasters` (1–37) and `toast` (0–12) come\nfrom its zod `configSchema`, so the control panel derives the options form.",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "fish"
  }
}`,...r.parameters?.docs?.source},description:{story:"An aquarium of sprite fish over a sea floor; `fish` sets how many (1–16).",...r.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "messages",
    config: {
      text: "BACK IN FIVE MINUTES",
      speedSeconds: 8
    }
  }
}`,...a.parameters?.docs?.source},description:{story:"A marquee crawling across the screen. `text` and `speedSeconds` are a\nstring and a number in the schema, so the derived form shows an input and\na spinner.",...a.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "warp"
  }
}`,...o.parameters?.docs?.source},description:{story:"A starfield flying toward the viewer; `layers` (3–9) sets the density.",...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "spotlight"
  }
}`,...n.parameters?.docs?.source},description:{story:"A `transparentBackground` saver: the overlay skips its black fill so the\nlive desktop shows through the moving spotlight. Here a flat colour stands\nin for the desktop.",...n.parameters?.docs?.description}}};const S=["BouncingBall","FlyingToasters","Fish","Messages","Warp","Spotlight"];export{e as BouncingBall,r as Fish,s as FlyingToasters,a as Messages,n as Spotlight,o as Warp,S as __namedExportsOrder,f as default};
