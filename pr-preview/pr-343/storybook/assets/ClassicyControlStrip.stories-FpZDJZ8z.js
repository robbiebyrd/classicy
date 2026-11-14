import{F as r,j as t,h as d,G as M,g as S,H as x,I as w,u as v}from"./iframe-CWe0op1t.js";import{a as I,C as D}from"./ClassicyAppearanceProbe-BIWSymkt.js";import{d as P}from"./helpers-Cv7WlonI.js";import"./preload-helper-CxPGPiBr.js";const{fn:T}=__STORYBOOK_MODULE_TEST__,_={title:"Desktop/ControlStrip",component:r,parameters:{...P,classicy:{desktop:!0,controlStrip:!1}}},g=e=>{d.useEffect(()=>{for(const s of e)x(s);return()=>{for(const s of e)w(s.id)}},[e])},f={id:"story-file-sharing",label:"File Sharing",icon:S.system.controlStrip.fileSharing,order:1,menuItems:()=>{const[e,s]=d.useState(!1);return[{id:"file-sharing-status",title:e?"1 User Connected":"No Users Connected",disabled:!0,className:"classicyControlStripStatus"},{id:"spacer"},{id:"file-sharing-open",title:"Open File Sharing Control Panel",onClickFunc:T()},{id:"spacer"},{id:"file-sharing-toggle",title:e?"Turn File Sharing Off":"Turn File Sharing On",onClickFunc:()=>s(o=>!o)}]}},b={id:"story-cd",label:"CD",icon:S.system.controlStrip.cd,order:2,menuItems:[{id:"cd-status",title:"No Audio CD",disabled:!0,className:"classicyControlStripStatus"}]},n={},a={render:e=>(d.useEffect(()=>{let s=0,o=0;const p=window.setInterval(()=>{s+=1;const C=document.querySelector(".classicyBevelButtonPopup");(s>25||C&&o++>2)&&window.clearInterval(p),!C&&(o=0,document.querySelector('.classicyControlStripModule[aria-label="Screen Saver"]')?.click())},400);return()=>window.clearInterval(p)},[]),t.jsx(r,{...e}))},k=[f,b],u={render:e=>(g(k),t.jsx(r,{...e}))},j={id:"story-weather",appId:"StoryWeather.app",label:"Weather",icon:S.system.controlStrip.sleep,menuItems:[{id:"weather-status",title:"Clear, 72\xB0",disabled:!0,className:"classicyControlStripStatus"}]},A=[j],m={render:e=>{g(A);const[s,o]=d.useState(!0);return t.jsxs(t.Fragment,{children:[s&&t.jsx(M,{id:"StoryWeather.app",name:"Weather",icon:S.system.extension,extension:!0}),t.jsxs("button",{type:"button",onClick:()=>o(p=>!p),children:[s?"Remove":"Install"," the Weather extension"]}),t.jsx(r,{...e})]})}},i={args:{disabledModules:["classicy-sound","classicy-screen-saver"]},render:e=>(g(k),t.jsx(r,{...e}))},E=Array.from({length:6},(e,s)=>({...s%2?b:f,id:`story-module-${s}`})),h={args:{defaultWidth:90},render:e=>(g(E),t.jsx(r,{...e}))},y={args:{defaultCollapsed:!0}},c={render:e=>{const s=v();return d.useEffect(()=>(s({type:"ClassicyDesktopControlStripSetPosition",edge:"right",bottom:160}),()=>s({type:"ClassicyDesktopControlStripSetPosition",edge:"left",bottom:0})),[s]),t.jsx(r,{...e})}},l={args:n.args,render:e=>t.jsx(D,{children:t.jsx(r,{...e})}),parameters:I("600px")};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:"{}",...n.parameters?.docs?.source},description:{story:`The built-in modules: Sound pops up Figure 2-16's volume slider; Screen
Saver (contributed by the desktop's Screen Saver extension) is a menu.`,...n.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: args => {
    // The Screen Saver extension registers its module once the desktop
    // has mounted, and the story frame may still resize as it settles,
    // which closes an open pop-up: click the module as the user would
    // until its menu stays open.
    useEffect(() => {
      let tries = 0;
      let openTicks = 0;
      const timer = window.setInterval(() => {
        tries += 1;
        // Open: once it has stayed open a beat, the story is done.
        const opened = document.querySelector(".classicyBevelButtonPopup");
        if (tries > 25 || opened && openTicks++ > 2) {
          window.clearInterval(timer);
        }
        if (opened) return;
        openTicks = 0;
        document.querySelector<HTMLElement>('.classicyControlStripModule[aria-label="Screen Saver"]')?.click();
      }, 400);
      return () => window.clearInterval(timer);
    }, []);
    return <ClassicyControlStrip {...args} />;
  }
}`,...a.parameters?.docs?.source},description:{story:`The Screen Saver module's menu open: the strip sits at the bottom of the
screen, so the menu, placed below its module first, flips up above it,
and its scroll cap follows it there, so all of its items show.`,...a.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: args => {
    useStoryModules(customModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...u.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: args => {
    useStoryModules(extensionModules);
    const [installed, setInstalled] = useState(true);
    return <>
                {installed && <ClassicyApp id="StoryWeather.app" name="Weather" icon={ClassicyIcons.system.extension} extension />}
                <button type="button" onClick={() => setInstalled(i => !i)}>
                    {installed ? "Remove" : "Install"} the Weather extension
                </button>
                <ClassicyControlStrip {...args} />
            </>;
  }
}`,...m.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    disabledModules: ["classicy-sound", "classicy-screen-saver"]
  },
  render: args => {
    useStoryModules(customModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...i.parameters?.docs?.source},description:{story:"Built-ins turned off by the host: only the registered modules show.",...i.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    defaultWidth: 90
  },
  render: args => {
    useStoryModules(manyModules);
    return <ClassicyControlStrip {...args} />;
  }
}`,...h.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    defaultCollapsed: true
  }
}`,...y.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: args => {
    const dispatch = useAppManagerDispatch();
    useEffect(() => {
      dispatch({
        type: "ClassicyDesktopControlStripSetPosition",
        edge: "right",
        bottom: 160
      });
      return () => dispatch({
        type: "ClassicyDesktopControlStripSetPosition",
        edge: "left",
        bottom: 0
      });
    }, [dispatch]);
    return <ClassicyControlStrip {...args} />;
  }
}`,...c.parameters?.docs?.source},description:{story:`Control-drag the collapse box to move the strip: it follows the pointer up
and down and docks to the edge on the pointer's half of the desktop. Docked
right it is mirrored \u2014 the tab leads and points left. This story starts it
there, part-way up, and puts it back at the lower left when it closes.`,...c.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: Default.args,
  render: (args: ComponentProps<typeof ClassicyControlStrip>) => <ClassicyAppearanceProbe>
            <ClassicyControlStrip {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters("600px")
}`,...l.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...l.parameters?.docs?.description}}};const H=["Default","ModuleMenuOpen","CustomModules","ExtensionModule","DisabledBuiltIns","Scrolling","Collapsed","DockedRight","AppearanceHooks"];export{l as AppearanceHooks,y as Collapsed,u as CustomModules,n as Default,i as DisabledBuiltIns,c as DockedRight,m as ExtensionModule,a as ModuleMenuOpen,h as Scrolling,H as __namedExportsOrder,_ as default};
