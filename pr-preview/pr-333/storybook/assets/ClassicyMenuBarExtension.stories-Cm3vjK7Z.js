import{r as n,br as j,j as e,be as B,bc as m,a1 as T,bk as A}from"./iframe-Ve2izGDf.js";import{d as I}from"./helpers-DPol6M7t.js";import"./preload-helper-shce2T3m.js";const i=({id:y,order:h=0,icon:r,title:c,menuItems:o,onClick:g,children:f,className:k,style:x})=>{const[l,w]=n.useState(null),d=n.useRef(null),[C,u]=n.useState(!1),[b,E]=n.useState([0,0]),p=!!o&&o.length>0,M=j().menuBar.placement;n.useEffect(()=>{w(document.getElementById("classicyDesktopMenuExtensions"))},[M]);const v=()=>{if(p){const a=d.current?.getBoundingClientRect();a&&E([a.left,a.bottom]),u(!0)}g?.()};if(!l)return null;const D=e.jsx("li",{ref:d,className:B("classicyMenuItem","classicyDesktopMenuExtension",k),style:{order:h,...x},children:e.jsx("button",{type:"button",className:"classicyDesktopMenuExtensionTrigger","aria-label":c,onClick:v,children:f??(r?e.jsx("img",{src:r,alt:c??""}):null)})}),S=document.getElementById("classicyDesktop")??document.body;return e.jsxs(e.Fragment,{children:[m.createPortal(D,l),C&&p&&m.createPortal(e.jsx(T,{name:`menubar-ext-${y}`,menuItems:o,position:b,onClose:()=>u(!1)}),S)]})};i.__docgenInfo={description:'Adds an item to the right-hand side of the menu bar, to the left of the\nclock — the place for an app\'s status icon or account menu. Use it instead of\na raw `<menu>` for menu-bar items.\n\nRender it anywhere inside a `ClassicyDesktop` (typically inside your\n`ClassicyApp`): it portals into the menu bar\'s `#classicyDesktopMenuExtensions`\nregion, and renders nothing when that region is not in the document — as\nunder an Appearance Package whose `layout.menuBar.placement` is `"window"`,\nwhich draws no screen bar. It looks the region up again whenever the\npackage layout\'s placement changes, so it reappears when the bar does; a\nbar forced to `placement="screen"` under a window-placement package is not\nre-queried. The item\nis a real `<button>`, so Enter and Space activate it. With `menuItems`, a\nclick drops a Platinum menu below the item, which closes on a selection or a\nclick outside.\n\n```tsx\n<ClassicyMenuBarExtension id="myapp_menu" order={1} title={appName} menuItems={items}>\n  <img src={appIcon} alt={appName} />\n</ClassicyMenuBarExtension>\n```',methods:[],displayName:"ClassicyMenuBarExtension",props:{id:{required:!0,tsType:{name:"string"},description:"Unique id; also names the item's dropdown menu."},order:{required:!1,tsType:{name:"number"},description:"CSS flex `order` among the menu bar's extension items. Defaults to `0`.",defaultValue:{value:"0",computed:!1}},icon:{required:!1,tsType:{name:"string"},description:"Icon drawn in the menu bar when no `children` are given."},title:{required:!1,tsType:{name:"string"},description:"Accessible name of the item's button (and the icon's alt text)."},menuItems:{required:!1,tsType:{name:"Array",elements:[{name:"ClassicyMenuItem"}],raw:"ClassicyMenuItem[]"},description:"Menu dropped down below the item when it is clicked."},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Called on every click, whether or not the item has a menu."},children:{required:!1,tsType:{name:"ReactNode"},description:"Custom item content, drawn instead of `icon`."},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the item's `<li>` after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the item's `<li>` after the component's own (`order`)."}}};const{fn:O}=__STORYBOOK_MODULE_TEST__,P={title:"Desktop/MenuBar/Extension",component:i},t={render:()=>e.jsxs("div",{id:"classicyDesktop",style:{position:"relative",minHeight:200},children:[e.jsx("div",{style:{background:"var(--color-black)",height:"var(--window-control-size)",display:"flex",justifyContent:"flex-end"},children:e.jsx("ul",{id:"classicyDesktopMenuExtensions",className:"classicyDesktopMenuExtensions",style:{display:"flex",margin:0,padding:0,listStyle:"none"}})}),e.jsx(i,{id:"user",order:10,icon:A("icons","system.network.userDirectory"),title:"Account",menuItems:[{id:"account",title:"Account…",onClickFunc:()=>{}},{id:"logout",title:"Log Out…",onClickFunc:()=>{}}]})]})},s={parameters:I,render:()=>e.jsx(i,{id:"status",title:"Status",onClick:O(),children:e.jsx("span",{style:{padding:"0 4px"},children:"Online"})})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <div id="classicyDesktop" style={{
    position: "relative",
    minHeight: 200
  }}>
            <div style={{
      background: "var(--color-black)",
      height: "var(--window-control-size)",
      display: "flex",
      justifyContent: "flex-end"
    }}>
                <ul id="classicyDesktopMenuExtensions" className="classicyDesktopMenuExtensions" style={{
        display: "flex",
        margin: 0,
        padding: 0,
        listStyle: "none"
      }} />
            </div>
            <ClassicyMenuBarExtension id="user" order={10} icon={resolveClassicyAsset("icons", "system.network.userDirectory")} title="Account" menuItems={[{
      id: "account",
      title: "Account…",
      onClickFunc: () => {}
    }, {
      id: "logout",
      title: "Log Out…",
      onClickFunc: () => {}
    }]} />
        </div>
}`,...t.parameters?.docs?.source},description:{story:"An icon item with a dropdown menu, in a stand-in menu bar strip (the story\nsupplies the `#classicyDesktopMenuExtensions` region and `#classicyDesktop`\nthe component portals into). Click the icon to drop the menu below it.",...t.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  parameters: desktopParameters,
  render: () => <ClassicyMenuBarExtension id="status" title="Status" onClick={fn()}>
            <span style={{
      padding: "0 4px"
    }}>Online</span>
        </ClassicyMenuBarExtension>
}`,...s.parameters?.docs?.source},description:{story:"On a real desktop, the item lands in the menu bar to the left of the clock.\nHere it shows custom `children` in place of an icon and has no menu, so a\nclick only calls `onClick`.",...s.parameters?.docs?.description}}};const R=["UserMenu","OnDesktop"];export{s as OnDesktop,t as UserMenu,R as __namedExportsOrder,P as default};
