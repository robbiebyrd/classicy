import{i as n,j as e,aD as S,aB as p,z as j,aJ as T}from"./iframe-DyCxAP_t.js";import{d as B}from"./helpers-DJI2BwMl.js";import"./preload-helper-shce2T3m.js";const i=({id:y,order:h=0,icon:r,title:c,menuItems:o,onClick:f,children:x,className:g,style:k})=>{const[l,C]=n.useState(null),d=n.useRef(null),[E,u]=n.useState(!1),[w,M]=n.useState([0,0]),m=!!o&&o.length>0;n.useEffect(()=>{C(document.getElementById("classicyDesktopMenuExtensions"))},[]);const b=()=>{if(m){const a=d.current?.getBoundingClientRect();a&&M([a.left,a.bottom]),u(!0)}f?.()};if(!l)return null;const D=e.jsx("li",{ref:d,className:S("classicyMenuItem","classicyDesktopMenuExtension",g),style:{order:h,...k},children:e.jsx("button",{type:"button",className:"classicyDesktopMenuExtensionTrigger","aria-label":c,onClick:b,children:x??(r?e.jsx("img",{src:r,alt:c??""}):null)})}),v=document.getElementById("classicyDesktop")??document.body;return e.jsxs(e.Fragment,{children:[p.createPortal(D,l),E&&m&&p.createPortal(e.jsx(j,{name:`menubar-ext-${y}`,menuItems:o,position:w,onClose:()=>u(!1)}),v)]})};i.__docgenInfo={description:"Adds an item to the right-hand side of the menu bar, to the left of the\nclock — the place for an app's status icon or account menu. Use it instead of\na raw `<menu>` for menu-bar items.\n\nRender it anywhere inside a `ClassicyDesktop` (typically inside your\n`ClassicyApp`): it portals into the menu bar's `#classicyDesktopMenuExtensions`\nregion, and renders nothing when that region is not in the document. The item\nis a real `<button>`, so Enter and Space activate it. With `menuItems`, a\nclick drops a Platinum menu below the item, which closes on a selection or a\nclick outside.\n\n```tsx\n<ClassicyMenuBarExtension id=\"myapp_menu\" order={1} title={appName} menuItems={items}>\n  <img src={appIcon} alt={appName} />\n</ClassicyMenuBarExtension>\n```",methods:[],displayName:"ClassicyMenuBarExtension",props:{id:{required:!0,tsType:{name:"string"},description:"Unique id; also names the item's dropdown menu."},order:{required:!1,tsType:{name:"number"},description:"CSS flex `order` among the menu bar's extension items. Defaults to `0`.",defaultValue:{value:"0",computed:!1}},icon:{required:!1,tsType:{name:"string"},description:"Icon drawn in the menu bar when no `children` are given."},title:{required:!1,tsType:{name:"string"},description:"Accessible name of the item's button (and the icon's alt text)."},menuItems:{required:!1,tsType:{name:"Array",elements:[{name:"ClassicyMenuItem"}],raw:"ClassicyMenuItem[]"},description:"Menu dropped down below the item when it is clicked."},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Called on every click, whether or not the item has a menu."},children:{required:!1,tsType:{name:"ReactNode"},description:"Custom item content, drawn instead of `icon`."},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the item's `<li>` after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the item's `<li>` after the component's own (`order`)."}}};const{fn:O}=__STORYBOOK_MODULE_TEST__,_={title:"Desktop/MenuBar/Extension",component:i},t={render:()=>e.jsxs("div",{id:"classicyDesktop",style:{position:"relative",minHeight:200},children:[e.jsx("div",{style:{background:"var(--color-black)",height:"var(--window-control-size)",display:"flex",justifyContent:"flex-end"},children:e.jsx("ul",{id:"classicyDesktopMenuExtensions",className:"classicyDesktopMenuExtensions",style:{display:"flex",margin:0,padding:0,listStyle:"none"}})}),e.jsx(i,{id:"user",order:10,icon:T("icons","system.network.userDirectory"),title:"Account",menuItems:[{id:"account",title:"Account…",onClickFunc:()=>{}},{id:"logout",title:"Log Out…",onClickFunc:()=>{}}]})]})},s={parameters:B,render:()=>e.jsx(i,{id:"status",title:"Status",onClick:O(),children:e.jsx("span",{style:{padding:"0 4px"},children:"Online"})})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source},description:{story:"On a real desktop, the item lands in the menu bar to the left of the clock.\nHere it shows custom `children` in place of an icon and has no menu, so a\nclick only calls `onClick`.",...s.parameters?.docs?.description}}};const q=["UserMenu","OnDesktop"];export{s as OnDesktop,t as UserMenu,q as __namedExportsOrder,_ as default};
