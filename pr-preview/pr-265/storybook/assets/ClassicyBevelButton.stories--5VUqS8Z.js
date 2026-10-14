import{i as T,j as b,r as q}from"./iframe-BhW-QkVJ.js";import"./preload-helper-ebRTegvm.js";const{fn:C}=__STORYBOOK_MODULE_TEST__,I={title:"Controls/BevelButton",component:T,args:{children:"Tool",onClickFunc:C(),onChangeFunc:C()}},o={},a={args:{bevelWidth:"small",children:"Small bevel"}},t={args:{bevelWidth:"medium",children:"Medium bevel"}},c={args:{bevelWidth:"large",children:"Large bevel"}},l={args:{square:!0,children:"⌘"}},u={args:{square:!0,mode:"toggle",on:!0,children:"B"}},d={args:{mode:"toggle",on:!0,children:"Bold"}},i={args:{mode:"toggle",on:!1,children:"Bold"}},m={args:{mode:"radio",on:!0,children:"Left"}},p={args:{mode:"toggle",mixed:!0,children:"Mixed"}},g={args:{disabled:!0,children:"Disabled"}},h={args:{disabled:!0,on:!0,mode:"toggle",children:"Disabled on"}},f=(r,n)=>{const[s,M]=q.useState(n),x=r.map(e=>({id:e,title:e,checked:e===s,onClickFunc:()=>M(e)}));return{current:s,menuItems:x}},S={args:{mode:"popup",popupArrow:"large",popupDirection:"vertical"},render:r=>{const{current:n,menuItems:s}=f(["50%","75%","100%","150%","200%"],"100%");return b.jsx(T,{...r,menuItems:s,children:n})}},v={args:{mode:"popup",popupArrow:"small",popupDirection:"horizontal"},render:r=>{const{menuItems:n}=f(["Ascending","Descending"],"Ascending");return b.jsx(T,{...r,menuItems:n,children:"Sort"})}},B={args:{onClickFunc:C(),onChangeFunc:C()},render:()=>{const[r,n]=q.useState("Marquee"),s=f(["Shrink","No Shrink"],"Shrink"),M=f(["Lasso","See Thru Lasso"],"Lasso"),x=[{name:"Marquee",menu:s},{name:"Lasso",menu:M}];return b.jsx("div",{role:"radiogroup","aria-label":"Tools",style:{display:"flex"},children:x.map(({name:e,menu:O})=>b.jsx(T,{mode:"radio",on:r===e,popupArrow:"small",menuItems:O.menuItems,onChangeFunc:()=>n(e),children:`${e}: ${O.current}`},e))})}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:"{}",...o.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "small",
    children: "Small bevel"
  }
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "medium",
    children: "Medium bevel"
  }
}`,...t.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    bevelWidth: "large",
    children: "Large bevel"
  }
}`,...c.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    square: true,
    children: "⌘"
  }
}`,...l.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    square: true,
    mode: "toggle",
    on: true,
    children: "B"
  }
}`,...u.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    on: true,
    children: "Bold"
  }
}`,...d.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    on: false,
    children: "Bold"
  }
}`,...i.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "radio",
    on: true,
    children: "Left"
  }
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    mode: "toggle",
    mixed: true,
    children: "Mixed"
  }
}`,...p.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    children: "Disabled"
  }
}`,...g.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    on: true,
    mode: "toggle",
    children: "Disabled on"
  }
}`,...h.parameters?.docs?.source}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
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
}`,...S.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
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
}`,...v.parameters?.docs?.source}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
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
}`,...B.parameters?.docs?.source}}};const k=["Push","BevelSmall","BevelMedium","BevelLarge","Square","SquareToggleOn","ToggleOn","ToggleOff","Radio","Mixed","DisabledOff","DisabledOn","PopupVertical","PopupHorizontal","ToolPaletteHoldForOptions"];export{c as BevelLarge,t as BevelMedium,a as BevelSmall,g as DisabledOff,h as DisabledOn,p as Mixed,v as PopupHorizontal,S as PopupVertical,o as Push,m as Radio,l as Square,u as SquareToggleOn,i as ToggleOff,d as ToggleOn,B as ToolPaletteHoldForOptions,k as __namedExportsOrder,I as default};
