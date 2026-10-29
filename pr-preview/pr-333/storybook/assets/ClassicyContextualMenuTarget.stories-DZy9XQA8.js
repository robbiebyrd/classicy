import{aO as h,j as e,b as a,aP as C}from"./iframe-DRzDiICs.js";import"./preload-helper-shce2T3m.js";const o=({menuItems:r,className:c,style:d,children:u})=>{const{showContextMenu:p}=h(),m=t=>{t.defaultPrevented||(t.preventDefault(),t.stopPropagation(),p(r,[t.clientX,t.clientY]))};return e.jsx("div",{className:["classicyContextualMenuTarget",c].filter(Boolean).join(" "),style:d,onContextMenu:m,children:u})};o.__docgenInfo={description:"Attaches a contextual (right-click) menu to its children (HIGOS8 p.93) — the\nClassicy replacement for the old `contextmenu` attribute. Right-clicking\nanything inside opens `menuItems` 1 px below and right of the pointer.\n\nContextual menus resolve innermost-first: this target wins over its window's\n`contextMenu`, which wins over the app's, which wins over the desktop's\ndefault menu. It claims the right-click (`preventDefault` +\n`stopPropagation`); a child that calls `e.preventDefault()` in its own\n`onContextMenu` keeps it from opening. It wraps its children in a `<div>`\nand needs a `ClassicyContextualMenuProvider` above it, which\n`ClassicyDesktop` mounts.\n\nPer the HIG, a contextual menu should only offer commands that are also in\nthe menu bar, and the provider adds a disabled Help item first unless one is\npresent.",methods:[],displayName:"ClassicyContextualMenuTarget",props:{menuItems:{required:!0,tsType:{name:"Array",elements:[{name:"ClassicyMenuItem"}],raw:"ClassicyMenuItem[]"},description:"The menu to show on right-click. A disabled Help item is put first unless one is included."},className:{required:!1,tsType:{name:"string"},description:"Extra class names for the wrapping `<div>`."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the wrapper after the component's own."}},composes:["PropsWithChildren"]};const{fn:i}=__STORYBOOK_MODULE_TEST__,l=[{id:"cut",title:"Cut",keyboardShortcut:"⌘X",onClickFunc:i()},{id:"copy",title:"Copy",keyboardShortcut:"⌘C",onClickFunc:i()},{id:"paste",title:"Paste",keyboardShortcut:"⌘V",onClickFunc:i()}],x={title:"Controls/ContextualMenuTarget",component:o,decorators:[r=>e.jsx(C,{children:e.jsx("div",{style:{position:"relative",height:260,padding:24},children:e.jsx(r,{})})})]},n={args:{menuItems:l,children:e.jsx(a,{children:"Right-click me"})}},s={args:{menuItems:[{id:"panel-refresh",title:"Refresh Panel",onClickFunc:i()}],children:e.jsx("div",{style:{padding:24,border:"1px solid var(--color-system-05)"},children:e.jsx(o,{menuItems:l,children:e.jsx(a,{children:"Right-click me"})})})}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    menuItems: MENU_ITEMS,
    children: <ClassicyButton>Right-click me</ClassicyButton>
  }
}`,...n.parameters?.docs?.source},description:{story:`Right-click the button to open its menu. The provider puts a disabled Help
item first (the HIG's required leading item) because the menu has none.`,...n.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    menuItems: [{
      id: "panel-refresh",
      title: "Refresh Panel",
      onClickFunc: fn()
    }],
    children: <div style={{
      padding: 24,
      border: "1px solid var(--color-system-05)"
    }}>
                <ClassicyContextualMenuTarget menuItems={MENU_ITEMS}>
                    <ClassicyButton>Right-click me</ClassicyButton>
                </ClassicyContextualMenuTarget>
            </div>
  }
}`,...s.parameters?.docs?.source},description:{story:`Targets nest, and the innermost wins: right-click the button for its own
menu, or the surrounding panel for the panel's.`,...s.parameters?.docs?.description}}};const f=["ControlWithMenu","NestedTargets"];export{n as ControlWithMenu,s as NestedTargets,f as __namedExportsOrder,x as default};
