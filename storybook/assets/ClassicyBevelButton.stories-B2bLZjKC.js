import{q as t,j as s,i as A,s as w,m as O}from"./iframe-IeJ-rV85.js";import"./preload-helper-PPVm8Dsz.js";const{fn:x}=__STORYBOOK_MODULE_TEST__,F={title:"Controls/BevelButton",component:t,args:{children:"Tool",onClickFunc:x(),onChangeFunc:x()}},a={},i={args:{bevelWidth:"small",children:"Small bevel"}},c={args:{bevelWidth:"medium",children:"Medium bevel"}},l={args:{bevelWidth:"large",children:"Large bevel"}},d={args:{square:!0,children:"⌘"}},p={args:{square:!0,mode:"toggle",on:!0,children:"B"}},u={args:{mode:"toggle",on:!0,children:"Bold"}},m={args:{mode:"toggle",on:!1,children:"Bold"}},g={args:{mode:"radio",on:!0,children:"Left"}},h={args:{mode:"toggle",mixed:!0,children:"Mixed"}},b={args:{disabled:!0,children:"Disabled"}},v={args:{disabled:!0,on:!0,mode:"toggle",children:"Disabled on"}},y={render:e=>s.jsxs("div",{style:{display:"flex",gap:8},children:[s.jsx(t,{...e,icon:O.system.info,children:"Get Info"}),s.jsx(t,{icon:O.system.info,iconAlt:"Get Info",square:!0,onClickFunc:e.onClickFunc})]})},k=(e,r)=>{const[n,I]=A.useState(r),T=e.map(o=>({id:o,title:o,checked:o===n,onClickFunc:()=>I(o)}));return{current:n,menuItems:T}},f={args:{mode:"popup",popupArrow:"large",popupDirection:"vertical"},render:e=>{const{current:r,menuItems:n}=k(["50%","75%","100%","150%","200%"],"100%");return s.jsx(t,{...e,menuItems:n,children:r})}},S={args:{mode:"popup",popupArrow:"small",popupDirection:"horizontal"},render:e=>{const{menuItems:r}=k(["Ascending","Descending"],"Ascending");return s.jsx(t,{...e,menuItems:r,children:"Sort"})}},C={args:{mode:"popup",popupArrow:"large",popupDirection:"horizontal"},render:e=>{const[r,n]=A.useState(60);return s.jsxs(t,{...e,"aria-label":"Volume",popupAlign:"center",popupContent:s.jsx(w,{ariaLabel:"Volume level",value:r,onChange:n}),children:["Volume ",r]})}},B={args:{onClickFunc:x(),onChangeFunc:x()},render:()=>{const[e,r]=A.useState("Marquee"),n=k(["Shrink","No Shrink"],"Shrink"),I=k(["Lasso","See Thru Lasso"],"Lasso"),T=[{name:"Marquee",menu:n},{name:"Lasso",menu:I}];return s.jsx("div",{role:"radiogroup","aria-label":"Tools",style:{display:"flex"},children:T.map(({name:o,menu:q})=>s.jsx(t,{mode:"radio",on:e===o,popupArrow:"small",menuItems:q.menuItems,onChangeFunc:()=>r(o),children:`${o}: ${q.current}`},o))})}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:"{}",...a.parameters?.docs?.source},description:{story:"The default `push` mode: a momentary button that pops back up after a click.",...a.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "small",
    children: "Small bevel"
  }
}`,...i.parameters?.docs?.source},description:{story:'`bevelWidth="small"` — the 2px bevel (HIGOS8 p.29).',...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "medium",
    children: "Medium bevel"
  }
}`,...c.parameters?.docs?.source},description:{story:'`bevelWidth="medium"` — the 3px bevel, and the default.',...c.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "large",
    children: "Large bevel"
  }
}`,...l.parameters?.docs?.source},description:{story:'`bevelWidth="large"` — the 4px bevel, for larger picture buttons.',...l.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    square: true,
    children: "⌘"
  }
}`,...d.parameters?.docs?.source},description:{story:"`square` is for icon-only controls in a palette: a fixed box that lines up\nwith `ClassicyButton`'s square shape, so a mixed toolbar stays on one grid.\nInside a `ClassicyButtonToolbar` an icon-only button gets it by default.",...d.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    square: true,
    mode: "toggle",
    on: true,
    children: "B"
  }
}`,...p.parameters?.docs?.source},description:{story:"A square `toggle` button held on — the typical style-palette (Bold) control.",...p.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
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
}`,...h.parameters?.docs?.source},description:{story:'The mixed state, for a setting that is on for part of a selection (`aria-pressed="mixed"`).',...h.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "Disabled"
  }
}`,...b.parameters?.docs?.source},description:{story:"The `disabled-off` state: dimmed, presses ignored.",...b.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    on: true,
    mode: "toggle",
    children: "Disabled on"
  }
}`,...v.parameters?.docs?.source},description:{story:"The `disabled-on` state: a latched toggle that can no longer be changed.",...v.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: args => <div style={{
    display: "flex",
    gap: 8
  }}>
            <ClassicyBevelButton {...args} icon={ClassicyIcons.system.info}>
                Get Info
            </ClassicyBevelButton>
            <ClassicyBevelButton icon={ClassicyIcons.system.info} iconAlt="Get Info" square onClickFunc={args.onClickFunc} />
        </div>
}`,...y.parameters?.docs?.source},description:{story:"`icon` draws a picture before the label; with no label, give the button an\n`iconAlt` (its accessible name). Bevel buttons can carry text, a picture or\nboth.",...y.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
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
}`,...B.parameters?.docs?.source},description:{story:"HIGOS8 Figure 2-15 and p.33: in a tool palette, a click picks the tool and\nholding it past the double-click interval offers that tool's options — the\n`hold` trigger, the default outside `popup` mode.",...B.parameters?.docs?.description}}};const M=["Push","BevelSmall","BevelMedium","BevelLarge","Square","SquareToggleOn","ToggleOn","ToggleOff","Radio","Mixed","DisabledOff","DisabledOn","WithIcon","PopupVertical","PopupHorizontal","PopupSlider","ToolPaletteHoldForOptions"];export{l as BevelLarge,c as BevelMedium,i as BevelSmall,b as DisabledOff,v as DisabledOn,h as Mixed,S as PopupHorizontal,C as PopupSlider,f as PopupVertical,a as Push,g as Radio,d as Square,p as SquareToggleOn,m as ToggleOff,u as ToggleOn,B as ToolPaletteHoldForOptions,y as WithIcon,M as __namedExportsOrder,F as default};
