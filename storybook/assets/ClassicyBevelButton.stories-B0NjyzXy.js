import{i as a,j as s,r as D,k as y}from"./iframe-19DCFRhR.js";import"./preload-helper-PPVm8Dsz.js";const{fn:f}=__STORYBOOK_MODULE_TEST__,k={title:"Controls/BevelButton",component:a,args:{children:"Tool",onClickFunc:f(),onChangeFunc:f()}},t={},l={args:{bevelWidth:"small",children:"Small bevel"}},c={args:{bevelWidth:"medium",children:"Medium bevel"}},u={args:{bevelWidth:"large",children:"Large bevel"}},i={args:{square:!0,children:"⌘"}},d={args:{square:!0,mode:"toggle",on:!0,children:"B"}},p={args:{mode:"toggle",on:!0,children:"Bold"}},m={args:{mode:"toggle",on:!1,children:"Bold"}},g={args:{mode:"radio",on:!0,children:"Left"}},h={args:{mode:"toggle",mixed:!0,children:"Mixed"}},S={args:{disabled:!0,children:"Disabled"}},v={args:{disabled:!0,on:!0,mode:"toggle",children:"Disabled on"}},x=(r,e)=>{const[o,T]=D.useState(e),M=r.map(n=>({id:n,title:n,checked:n===o,onClickFunc:()=>T(n)}));return{current:o,menuItems:M}},B={args:{mode:"popup",popupArrow:"large",popupDirection:"vertical"},render:r=>{const{current:e,menuItems:o}=x(["50%","75%","100%","150%","200%"],"100%");return s.jsx(a,{...r,menuItems:o,children:e})}},C={args:{mode:"popup",popupArrow:"small",popupDirection:"horizontal"},render:r=>{const{menuItems:e}=x(["Ascending","Descending"],"Ascending");return s.jsx(a,{...r,menuItems:e,children:"Sort"})}},b={args:{mode:"popup",popupArrow:"large",popupDirection:"horizontal"},render:r=>{const[e,o]=D.useState(60);return s.jsxs(a,{...r,"aria-label":"Volume",popupAlign:"center",popupContent:s.jsx(y,{ariaLabel:"Volume level",value:e,onChange:o}),children:["Volume ",e]})}},L={args:{onClickFunc:f(),onChangeFunc:f()},render:()=>{const[r,e]=D.useState("Marquee"),o=x(["Shrink","No Shrink"],"Shrink"),T=x(["Lasso","See Thru Lasso"],"Lasso"),M=[{name:"Marquee",menu:o},{name:"Lasso",menu:T}];return s.jsx("div",{role:"radiogroup","aria-label":"Tools",style:{display:"flex"},children:M.map(({name:n,menu:O})=>s.jsx(a,{mode:"radio",on:r===n,popupArrow:"small",menuItems:O.menuItems,onChangeFunc:()=>e(n),children:`${n}: ${O.current}`},n))})}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "small",
    children: "Small bevel"
  }
}`,...l.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "medium",
    children: "Medium bevel"
  }
}`,...c.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "large",
    children: "Large bevel"
  }
}`,...u.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    square: true,
    children: "⌘"
  }
}`,...i.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    square: true,
    mode: "toggle",
    on: true,
    children: "B"
  }
}`,...d.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    on: true,
    children: "Bold"
  }
}`,...p.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    on: false,
    children: "Bold"
  }
}`,...m.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "radio",
    on: true,
    children: "Left"
  }
}`,...g.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    mixed: true,
    children: "Mixed"
  }
}`,...h.parameters?.docs?.source}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "Disabled"
  }
}`,...S.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    on: true,
    mode: "toggle",
    children: "Disabled on"
  }
}`,...v.parameters?.docs?.source}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
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
}`,...C.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
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
}`,...b.parameters?.docs?.source}}};L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
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
}`,...L.parameters?.docs?.source}}};const I=["Push","BevelSmall","BevelMedium","BevelLarge","Square","SquareToggleOn","ToggleOn","ToggleOff","Radio","Mixed","DisabledOff","DisabledOn","PopupVertical","PopupHorizontal","PopupSlider","ToolPaletteHoldForOptions"];export{u as BevelLarge,c as BevelMedium,l as BevelSmall,S as DisabledOff,v as DisabledOn,h as Mixed,C as PopupHorizontal,b as PopupSlider,B as PopupVertical,t as Push,g as Radio,i as Square,d as SquareToggleOn,m as ToggleOff,p as ToggleOn,L as ToolPaletteHoldForOptions,I as __namedExportsOrder,k as default};
