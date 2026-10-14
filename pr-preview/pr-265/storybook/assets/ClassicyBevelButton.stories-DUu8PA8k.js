import{i as t,j as s,r as M,k as O}from"./iframe-D1zGhoeH.js";import"./preload-helper-ebRTegvm.js";const{fn:L}=__STORYBOOK_MODULE_TEST__,A={title:"Controls/BevelButton",component:t,args:{children:"Tool",onClickFunc:L(),onChangeFunc:L()}},l={},c={args:{bevelWidth:"small",children:"Small bevel"}},u={args:{bevelWidth:"medium",children:"Medium bevel"}},i={args:{bevelWidth:"large",children:"Large bevel"}},d={args:{square:!0,children:"⌘"}},m={args:{square:!0,mode:"toggle",on:!0,children:"B"}},p={args:{mode:"toggle",on:!0,children:"Bold"}},g={args:{mode:"toggle",on:!1,children:"Bold"}},h={args:{mode:"radio",on:!0,children:"Left"}},v={args:{mode:"toggle",mixed:!0,children:"Mixed"}},S={args:{disabled:!0,children:"Disabled"}},b={args:{disabled:!0,on:!0,mode:"toggle",children:"Disabled on"}},T=(r,e)=>{const[n,a]=M.useState(e),y=r.map(o=>({id:o,title:o,checked:o===n,onClickFunc:()=>a(o)}));return{current:n,menuItems:y}},B={args:{mode:"popup",popupArrow:"large",popupDirection:"vertical"},render:r=>{const{current:e,menuItems:n}=T(["50%","75%","100%","150%","200%"],"100%");return s.jsx(t,{...r,menuItems:n,children:e})}},C={args:{mode:"popup",popupArrow:"small",popupDirection:"horizontal"},render:r=>{const{menuItems:e}=T(["Ascending","Descending"],"Ascending");return s.jsx(t,{...r,menuItems:e,children:"Sort"})}},f={args:{mode:"popup",popupArrow:"large",popupDirection:"horizontal"},render:r=>{const[e,n]=M.useState(60);return s.jsxs(t,{...r,"aria-label":"Volume",popupContent:s.jsx("div",{style:{height:120,paddingBottom:20},children:s.jsx(O,{id:"bevel-popup-volume",ariaLabel:"Volume level",orientation:"vertical",value:e,onChangeFunc:a=>n(Number(a.target.value))})}),children:["Volume ",e]})}},x={args:{onClickFunc:L(),onChangeFunc:L()},render:()=>{const[r,e]=M.useState("Marquee"),n=T(["Shrink","No Shrink"],"Shrink"),a=T(["Lasso","See Thru Lasso"],"Lasso"),y=[{name:"Marquee",menu:n},{name:"Lasso",menu:a}];return s.jsx("div",{role:"radiogroup","aria-label":"Tools",style:{display:"flex"},children:y.map(({name:o,menu:D})=>s.jsx(t,{mode:"radio",on:r===o,popupArrow:"small",menuItems:D.menuItems,onChangeFunc:()=>e(o),children:`${o}: ${D.current}`},o))})}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:"{}",...l.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "small",
    children: "Small bevel"
  }
}`,...c.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "medium",
    children: "Medium bevel"
  }
}`,...u.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "large",
    children: "Large bevel"
  }
}`,...i.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    square: true,
    children: "⌘"
  }
}`,...d.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    square: true,
    mode: "toggle",
    on: true,
    children: "B"
  }
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    on: true,
    children: "Bold"
  }
}`,...p.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    on: false,
    children: "Bold"
  }
}`,...g.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "radio",
    on: true,
    children: "Left"
  }
}`,...h.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    mixed: true,
    children: "Mixed"
  }
}`,...v.parameters?.docs?.source}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "Disabled"
  }
}`,...S.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    on: true,
    mode: "toggle",
    children: "Disabled on"
  }
}`,...b.parameters?.docs?.source}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
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
}`,...B.parameters?.docs?.source}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
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
}`,...C.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "popup",
    popupArrow: "large",
    popupDirection: "horizontal"
  },
  render: args => {
    const [level, setLevel] = useState(60);
    return <ClassicyBevelButton {...args} aria-label="Volume" popupContent={
    // A vertical slider fills its container's height, so give it one;
    // the padding holds the value readout drawn beneath the track.
    <div style={{
      height: 120,
      paddingBottom: 20
    }}>
                        <ClassicySlider id="bevel-popup-volume" ariaLabel="Volume level" orientation="vertical" value={level} onChangeFunc={e => setLevel(Number(e.target.value))} />
                    </div>}>
                Volume {level}
            </ClassicyBevelButton>;
  }
}`,...f.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
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
}`,...x.parameters?.docs?.source}}};const F=["Push","BevelSmall","BevelMedium","BevelLarge","Square","SquareToggleOn","ToggleOn","ToggleOff","Radio","Mixed","DisabledOff","DisabledOn","PopupVertical","PopupHorizontal","PopupSlider","ToolPaletteHoldForOptions"];export{i as BevelLarge,u as BevelMedium,c as BevelSmall,S as DisabledOff,b as DisabledOn,v as Mixed,C as PopupHorizontal,f as PopupSlider,B as PopupVertical,l as Push,h as Radio,d as Square,m as SquareToggleOn,g as ToggleOff,p as ToggleOn,x as ToolPaletteHoldForOptions,F as __namedExportsOrder,A as default};
