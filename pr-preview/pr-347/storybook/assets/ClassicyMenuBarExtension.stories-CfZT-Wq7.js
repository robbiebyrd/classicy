import{d as n,bI as S,j as e,by as T,bx as j,aZ as h,B,bF as A}from"./iframe-Bzba_oS8.js";import{d as O}from"./helpers-CYJoDGsp.js";import"./preload-helper-CiDKIbga.js";const o=({id:y,order:g=0,icon:c,title:l,menuItems:a,onClick:f,children:k,className:x,style:w})=>{const[d,b]=n.useState(null),u=n.useRef(null),[C,p]=n.useState(!1),[r,E]=n.useState({left:0,bottom:0,right:0}),m=!!a&&a.length>0,M=S().menuBar.placement;n.useEffect(()=>{b(document.getElementById("classicyDesktopMenuExtensions"))},[M]);const v=()=>{if(m){const i=u.current?.getBoundingClientRect();i&&E({left:i.left,bottom:i.bottom,right:i.right}),p(!0)}f?.()};if(!d)return null;const D=e.jsx("li",{ref:u,className:j("classicyMenuItem","classicyDesktopMenuExtension",x),style:{order:g,...w},children:e.jsx("button",{type:"button",className:"classicyDesktopMenuExtensionTrigger","aria-label":l,onClick:v,children:k??(c?e.jsx(T,{src:c,alt:l??""}):null)})}),I=document.getElementById("classicyDesktop")??document.body;return e.jsxs(e.Fragment,{children:[h.createPortal(D,d),C&&m&&h.createPortal(e.jsx(B,{name:`menubar-ext-${y}`,menuItems:a,position:[r.left,r.bottom],flipLeftTo:r.right,onClose:()=>p(!1)}),I)]})};o.__docgenInfo={description:`Adds an item to the right-hand side of the menu bar, to the left of the
clock \u2014 the place for an app's status icon or account menu. Use it instead of
a raw \`<menu>\` for menu-bar items.

Render it anywhere inside a \`ClassicyDesktop\` (typically inside your
\`ClassicyApp\`): it portals into the menu bar's \`#classicyDesktopMenuExtensions\`
region, and renders nothing when that region is not in the document \u2014 as
under an Appearance Package whose \`layout.menuBar.placement\` is \`"window"\`,
which draws no screen bar. It looks the region up again whenever the
package layout's placement changes, so it reappears when the bar does; a
bar forced to \`placement="screen"\` under a window-placement package is not
re-queried. The item
is a real \`<button>\`, so Enter and Space activate it. With \`menuItems\`, a
click drops a Platinum menu below the item, which closes on a selection or a
click outside. The menu hangs from the item's left side, or, where that
would pass the desktop's right edge, with its right side under the item's
right side, as a menu bar title's pull-down does; one still too wide is
pinned inside the desktop.

\`\`\`tsx
<ClassicyMenuBarExtension id="myapp_menu" order={1} title={appName} menuItems={items}>
  <img src={appIcon} alt={appName} />
</ClassicyMenuBarExtension>
\`\`\``,methods:[],displayName:"ClassicyMenuBarExtension",props:{id:{required:!0,tsType:{name:"string"},description:"Unique id; also names the item's dropdown menu."},order:{required:!1,tsType:{name:"number"},description:"CSS flex `order` among the menu bar's extension items. Defaults to `0`.",defaultValue:{value:"0",computed:!1}},icon:{required:!1,tsType:{name:"string"},description:"Icon drawn in the menu bar when no `children` are given."},title:{required:!1,tsType:{name:"string"},description:"Accessible name of the item's button (and the icon's alt text)."},menuItems:{required:!1,tsType:{name:"Array",elements:[{name:"ClassicyMenuItem"}],raw:"ClassicyMenuItem[]"},description:"Menu dropped down below the item when it is clicked."},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Called on every click, whether or not the item has a menu."},children:{required:!1,tsType:{name:"ReactNode"},description:"Custom item content, drawn instead of `icon`."},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the item's `<li>` after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the item's `<li>` after the component's own (`order`)."}}};const{fn:N}=__STORYBOOK_MODULE_TEST__,P={title:"Desktop/MenuBar/Extension",component:o},t={render:()=>e.jsxs("div",{id:"classicyDesktop",style:{position:"relative",minHeight:200},children:[e.jsx("div",{style:{background:"var(--color-black)",height:"var(--window-control-size)",display:"flex",justifyContent:"flex-end"},children:e.jsx("ul",{id:"classicyDesktopMenuExtensions",className:"classicyDesktopMenuExtensions",style:{display:"flex",margin:0,padding:0,listStyle:"none"}})}),e.jsx(o,{id:"user",order:10,icon:A("icons","system.network.userDirectory"),title:"Account",menuItems:[{id:"account",title:"Account\u2026",onClickFunc:()=>{}},{id:"logout",title:"Log Out\u2026",onClickFunc:()=>{}}]})]})},s={parameters:O,render:()=>e.jsx(o,{id:"status",title:"Status",onClick:N(),children:e.jsx("span",{style:{padding:"0 4px"},children:"Online"})})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
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
      title: "Account\u2026",
      onClickFunc: () => {}
    }, {
      id: "logout",
      title: "Log Out\u2026",
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
}`,...s.parameters?.docs?.source},description:{story:"On a real desktop, the item lands in the menu bar to the left of the clock.\nHere it shows custom `children` in place of an icon and has no menu, so a\nclick only calls `onClick`.",...s.parameters?.docs?.description}}};const F=["UserMenu","OnDesktop"];export{s as OnDesktop,t as UserMenu,F as __namedExportsOrder,P as default};
