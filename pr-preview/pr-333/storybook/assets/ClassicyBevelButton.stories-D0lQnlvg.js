import{W as a,j as r,r as q,X as P,S as O}from"./iframe-DuYNpJAC.js";import{a as L,C as D}from"./ClassicyAppearanceProbe-Dz2LvQ03.js";import"./preload-helper-shce2T3m.js";const{fn:x}=__STORYBOOK_MODULE_TEST__,H={title:"Controls/BevelButton",component:a,args:{children:"Tool",onClickFunc:x(),onChangeFunc:x()}},t={},c={args:{bevelWidth:"small",children:"Small bevel"}},i={args:{bevelWidth:"medium",children:"Medium bevel"}},l={args:{bevelWidth:"large",children:"Large bevel"}},p={args:{square:!0,children:"⌘"}},d={args:{square:!0,mode:"toggle",on:!0,children:"B"}},u={args:{mode:"toggle",on:!0,children:"Bold"}},m={args:{mode:"toggle",on:!1,children:"Bold"}},g={args:{mode:"radio",on:!0,children:"Left"}},h={args:{mode:"toggle",mixed:!0,children:"Mixed"}},y={args:{disabled:!0,children:"Disabled"}},b={args:{disabled:!0,on:!0,mode:"toggle",children:"Disabled on"}},v={render:e=>r.jsxs("div",{style:{display:"flex",gap:8},children:[r.jsx(a,{...e,icon:O.system.info,children:"Get Info"}),r.jsx(a,{icon:O.system.info,iconAlt:"Get Info",square:!0,onClickFunc:e.onClickFunc})]})},A=(e,o)=>{const[n,T]=q.useState(o),I=e.map(s=>({id:s,title:s,checked:s===n,onClickFunc:()=>T(s)}));return{current:n,menuItems:I}},f={args:{mode:"popup",popupArrow:"large",popupDirection:"vertical"},render:e=>{const{current:o,menuItems:n}=A(["50%","75%","100%","150%","200%"],"100%");return r.jsx(a,{...e,menuItems:n,children:o})}},S={args:{mode:"popup",popupArrow:"small",popupDirection:"horizontal"},render:e=>{const{menuItems:o}=A(["Ascending","Descending"],"Ascending");return r.jsx(a,{...e,menuItems:o,children:"Sort"})}},C={args:{mode:"popup",popupArrow:"large",popupDirection:"horizontal"},render:e=>{const[o,n]=q.useState(60);return r.jsxs(a,{...e,"aria-label":"Volume",popupAlign:"center",popupContent:r.jsx(P,{ariaLabel:"Volume level",value:o,onChange:n}),children:["Volume ",o]})}},B={args:{onClickFunc:x(),onChangeFunc:x()},render:()=>{const[e,o]=q.useState("Marquee"),n=A(["Shrink","No Shrink"],"Shrink"),T=A(["Lasso","See Thru Lasso"],"Lasso"),I=[{name:"Marquee",menu:n},{name:"Lasso",menu:T}];return r.jsx("div",{role:"radiogroup","aria-label":"Tools",style:{display:"flex"},children:I.map(({name:s,menu:w})=>r.jsx(a,{mode:"radio",on:e===s,popupArrow:"small",menuItems:w.menuItems,onChangeFunc:()=>o(s),children:`${s}: ${w.current}`},s))})}},k={args:t.args,render:e=>r.jsx(D,{children:r.jsx(a,{...e})}),parameters:L()};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source},description:{story:"The default `push` mode: a momentary button that pops back up after a click.",...t.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "small",
    children: "Small bevel"
  }
}`,...c.parameters?.docs?.source},description:{story:'`bevelWidth="small"` — the 2px bevel (HIGOS8 p.29).',...c.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "medium",
    children: "Medium bevel"
  }
}`,...i.parameters?.docs?.source},description:{story:'`bevelWidth="medium"` — the 3px bevel, and the default.',...i.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "large",
    children: "Large bevel"
  }
}`,...l.parameters?.docs?.source},description:{story:'`bevelWidth="large"` — the 4px bevel, for larger picture buttons.',...l.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    square: true,
    children: "⌘"
  }
}`,...p.parameters?.docs?.source},description:{story:"`square` is for icon-only controls in a palette: a fixed box that lines up\nwith `ClassicyButton`'s square shape, so a mixed toolbar stays on one grid.\nInside a `ClassicyButtonToolbar` an icon-only button gets it by default.",...p.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    square: true,
    mode: "toggle",
    on: true,
    children: "B"
  }
}`,...d.parameters?.docs?.source},description:{story:"A square `toggle` button held on — the typical style-palette (Bold) control.",...d.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    on: true,
    children: "Bold"
  }
}`,...u.parameters?.docs?.source},description:{story:'`mode="toggle"` in its on state: it behaves like a checkbox, each click flipping `on`.',...u.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    on: false,
    children: "Bold"
  }
}`,...m.parameters?.docs?.source},description:{story:'`mode="toggle"` in its off state; click it to latch it on (`onChangeFunc` fires).',...m.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "radio",
    on: true,
    children: "Left"
  }
}`,...g.parameters?.docs?.source},description:{story:'`mode="radio"` turns on and stays on; clicking it again does nothing. A real\ngroup shares one state value — see the ButtonToolbar `ToggleAndRadioGroups`\nstory.',...g.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    mixed: true,
    children: "Mixed"
  }
}`,...h.parameters?.docs?.source},description:{story:'The mixed state, for a setting that is on for part of a selection (`aria-pressed="mixed"`).',...h.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "Disabled"
  }
}`,...y.parameters?.docs?.source},description:{story:"The `disabled-off` state: dimmed, presses ignored.",...y.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    on: true,
    mode: "toggle",
    children: "Disabled on"
  }
}`,...b.parameters?.docs?.source},description:{story:"The `disabled-on` state: a latched toggle that can no longer be changed.",...b.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: args => <div style={{
    display: "flex",
    gap: 8
  }}>
            <ClassicyBevelButton {...args} icon={ClassicyIcons.system.info}>
                Get Info
            </ClassicyBevelButton>
            <ClassicyBevelButton icon={ClassicyIcons.system.info} iconAlt="Get Info" square onClickFunc={args.onClickFunc} />
        </div>
}`,...v.parameters?.docs?.source},description:{story:"`icon` draws a picture before the label; with no label, give the button an\n`iconAlt` (its accessible name). Bevel buttons can carry text, a picture or\nboth.",...v.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "popup",
    popupArrow: "large",
    popupDirection: "vertical"
  },
  render: args => {
    const {
      current,
      menuItems
    } = useChoiceMenu(["50%", "75%", "100%", "150%", "200%"], "100%");
    return <ClassicyBevelButton {...args} menuItems={menuItems}>
                {current}
            </ClassicyBevelButton>;
  }
}`,...f.parameters?.docs?.source},description:{story:"HIGOS8 p.32: clicking shows the menu directly below a down-arrow button. A\nquick click leaves it open (sticky); press and drag to choose in one motion.\nThe checkmark follows the current choice via each item's `checked`.",...f.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "popup",
    popupArrow: "small",
    popupDirection: "horizontal"
  },
  render: args => {
    const {
      menuItems
    } = useChoiceMenu(["Ascending", "Descending"], "Ascending");
    return <ClassicyBevelButton {...args} menuItems={menuItems}>
                Sort
            </ClassicyBevelButton>;
  }
}`,...S.parameters?.docs?.source},description:{story:'A right-arrow button (`popupDirection="horizontal"`) opens its menu to the\nright, flipping left when there is no room.',...S.parameters?.docs?.description}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "popup",
    popupArrow: "large",
    popupDirection: "horizontal"
  },
  render: args => {
    const [level, setLevel] = useState(60);
    return <ClassicyBevelButton {...args} aria-label="Volume" popupAlign="center" popupContent={<ClassicyPopUpSlider ariaLabel="Volume level" value={level} onChange={setLevel} />}>
                Volume {level}
            </ClassicyBevelButton>;
  }
}`,...C.parameters?.docs?.source},description:{story:'HIGOS8 Figure 2-16: a pop-up bevel button can show a control other than a\nmenu — here a `ClassicyPopUpSlider` passed as `popupContent`, centred on the\nbutton with `popupAlign="center"`.',...C.parameters?.docs?.description}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  args: {
    onClickFunc: fn(),
    onChangeFunc: fn()
  },
  render: () => {
    const [tool, setTool] = useState("Marquee");
    const marquee = useChoiceMenu(["Shrink", "No Shrink"], "Shrink");
    const lasso = useChoiceMenu(["Lasso", "See Thru Lasso"], "Lasso");
    const tools = [{
      name: "Marquee",
      menu: marquee
    }, {
      name: "Lasso",
      menu: lasso
    }];
    return <div role="radiogroup" aria-label="Tools" style={{
      display: "flex"
    }}>
                {tools.map(({
        name,
        menu
      }) => <ClassicyBevelButton key={name} mode="radio" on={tool === name} popupArrow="small" menuItems={menu.menuItems} onChangeFunc={() => setTool(name)}>
                        {\`\${name}: \${menu.current}\`}
                    </ClassicyBevelButton>)}
            </div>;
  }
}`,...B.parameters?.docs?.source},description:{story:"HIGOS8 Figure 2-15 and p.33: in a tool palette, a click picks the tool and\nholding it past the double-click interval offers that tool's options — the\n`hold` trigger, the default outside `popup` mode.",...B.parameters?.docs?.description}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: Push.args,
  render: (args: ComponentProps<typeof ClassicyBevelButton>) => <ClassicyAppearanceProbe>
            <ClassicyBevelButton {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...k.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...k.parameters?.docs?.description}}};const W=["Push","BevelSmall","BevelMedium","BevelLarge","Square","SquareToggleOn","ToggleOn","ToggleOff","Radio","Mixed","DisabledOff","DisabledOn","WithIcon","PopupVertical","PopupHorizontal","PopupSlider","ToolPaletteHoldForOptions","AppearanceHooks"];export{k as AppearanceHooks,l as BevelLarge,i as BevelMedium,c as BevelSmall,y as DisabledOff,b as DisabledOn,h as Mixed,S as PopupHorizontal,C as PopupSlider,f as PopupVertical,t as Push,g as Radio,p as Square,d as SquareToggleOn,m as ToggleOff,u as ToggleOn,B as ToolPaletteHoldForOptions,v as WithIcon,W as __namedExportsOrder,H as default};
