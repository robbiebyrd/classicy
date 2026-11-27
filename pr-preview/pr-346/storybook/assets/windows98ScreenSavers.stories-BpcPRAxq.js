import{aE as y,j as l,aF as h}from"./iframe-iHPPDpHV.js";import"./windows98-DSgLvIor.js";import{WINDOWS98_SCREEN_SAVER_IDS as f}from"./index-BwOSbGtL.js";import"./preload-helper-DhQH6ajB.js";import"./helpers-Bj1UjwsH.js";const v=({saverId:u,config:g})=>{const p=y(u);if(!p)return l.jsxs("p",{children:["No screen saver is registered as \u201C",u,"\u201D."]});const m=p.component;return l.jsx("div",{role:"presentation",style:{position:"relative",width:640,height:480,overflow:"hidden",background:p.transparentBackground?"var(--desktop-background-color, teal)":"var(--color-black, black)"},children:l.jsx(m,{config:h(p,g)})})},W={title:"Appearance/Windows 98/Screen Savers",component:v,argTypes:{saverId:{control:"select",options:[...f]}},parameters:{docs:{description:{component:`Windows 98's screen savers, each a port of its \`.scr\` on the Windows 98
Second Edition CD, with the options its Settings dialog had and the
defaults it read: they run on Windows 98's 55 ms timer tick, draw whole
pixels and erase by drawing in black, show one still frame under reduced
motion and stop while the page is hidden. Offered under Windows 98 only;
Blank Screen is the default.`}}}},e={args:{saverId:"flying-through-space"}},r={args:{saverId:"flying-windows"}},s={args:{saverId:"mystify-your-mind"}},o={args:{saverId:"mystify-your-mind",config:{clearScreen:!1}}},a={args:{saverId:"curves-and-colors",config:{lines:20}}},n={args:{saverId:"scrolling-marquee"}},t={args:{saverId:"3d-pipes",config:{pipes:"Multiple"}}},i={args:{saverId:"3d-pipes",config:{surfaceStyle:"Textured",jointType:"Ball",resolution:200}}},c={args:{saverId:"3d-pipes",config:{pipeStyle:"Flex",pipes:"Multiple"}}},d={args:{saverId:"blank-screen"}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "flying-through-space"
  }
}`,...e.parameters?.docs?.source},description:{story:"White stars streaming out of the center, the warp speeding up.",...e.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "flying-windows"
  }
}`,...r.parameters?.docs?.source},description:{story:"Wingdings' Windows logo, in the default palette's colors.",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "mystify-your-mind"
  }
}`,...s.parameters?.docs?.source},description:{story:"Two polygons trailing their outlines, fading from color to color.",...s.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "mystify-your-mind",
    config: {
      clearScreen: false
    }
  }
}`,...o.parameters?.docs?.source},description:{story:"Mystify with Clear screen off: it draws over (here) the teal desktop.",...o.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "curves-and-colors",
    config: {
      lines: 20
    }
  }
}`,...a.parameters?.docs?.source},description:{story:"A closed Bezier curve and its trail, stepping through the hues.",...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "scrolling-marquee"
  }
}`,...n.parameters?.docs?.source},description:{story:'"Where do you want to go today?" in red 72-point Arial, at random heights.',...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "3d-pipes",
    config: {
      pipes: "Multiple"
    }
  }
}`,...t.parameters?.docs?.source},description:{story:"Pipes growing through space (WebGL).",...t.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "3d-pipes",
    config: {
      surfaceStyle: "Textured",
      jointType: "Ball",
      resolution: 200
    }
  }
}`,...i.parameters?.docs?.source},description:{story:"Textured pipes, the .scr's own red and white stripes.",...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "3d-pipes",
    config: {
      pipeStyle: "Flex",
      pipes: "Multiple"
    }
  }
}`,...c.parameters?.docs?.source},description:{story:"Flex pipes, bending in wide arcs.",...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    saverId: "blank-screen"
  }
}`,...d.parameters?.docs?.source},description:{story:"The default: the screen black.",...d.parameters?.docs?.description}}};const T=["FlyingThroughSpace","FlyingWindows","MystifyYourMind","MystifyOverTheDesktop","CurvesAndColors","ScrollingMarquee","Pipes","TexturedPipes","FlexPipes","BlankScreen"];export{d as BlankScreen,a as CurvesAndColors,c as FlexPipes,e as FlyingThroughSpace,r as FlyingWindows,o as MystifyOverTheDesktop,s as MystifyYourMind,t as Pipes,n as ScrollingMarquee,i as TexturedPipes,T as __namedExportsOrder,W as default};
