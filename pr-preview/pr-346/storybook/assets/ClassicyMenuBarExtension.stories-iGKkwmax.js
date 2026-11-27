import{h as o,bx as B,j as e,bE as D,g as O,bm as _,aX as T,y as N,bC as L,l as q,bF as R,s as P}from"./iframe-BIE7b929.js";import{d as F}from"./helpers-BWr4ZsI6.js";import"./preload-helper-DhQH6ajB.js";const U=({title:s,menuItems:i,onActivate:r,onCloseMenu:c,children:a})=>{const u=o.useRef(null),{showContextMenu:g}=L(),k=s!==void 0&&s.trim()!=="",{handlers:n,balloon:p}=q(u,{content:s??"",delay:R},{force:!0}),b=t=>{n.onMouseLeave(),t.button===0&&t.preventDefault()},m=()=>{k&&n.onMouseEnter()},x=t=>{t.preventDefault(),n.onMouseLeave(),c(),!(!i||i.length===0)&&g(i,[t.clientX,t.clientY],{helpItem:!1,keyboard:!0})};return e.jsxs(e.Fragment,{children:[e.jsx("button",{ref:u,type:"button",className:"classicyDesktopMenuExtensionTrigger","aria-label":s,"aria-describedby":n["aria-describedby"],onClick:r,onMouseDown:b,onMouseEnter:m,onMouseLeave:n.onMouseLeave,onContextMenu:x,children:a}),p]})},f=({id:s,order:i=0,icon:r,title:c,menuItems:a,onClick:u,children:g,className:k,style:n})=>{const[p,b]=o.useState(null),m=o.useRef(null),[x,t]=o.useState(!1),[w,I]=o.useState({left:0,bottom:0,right:0}),C=!!a&&a.length>0,M=B(),S=M.menuBar.placement,h=M.taskbar!==void 0;o.useEffect(()=>{b(document.getElementById("classicyDesktopMenuExtensions"))},[S,h]);const v=()=>{if(C){const y=m.current?.getBoundingClientRect();y&&I({left:y.left,bottom:y.bottom,right:y.right}),t(!0)}u?.()};if(!p)return null;const E=h?e.jsx(D,{src:r??O.system.files.application,alt:"",draggable:!1}):g??(r?e.jsx(D,{src:r,alt:c??""}):null),j=e.jsx("li",{ref:m,className:_("classicyMenuItem","classicyDesktopMenuExtension",k),style:{order:i,...n},children:h?e.jsx(U,{title:c,menuItems:C?a:void 0,onActivate:v,onCloseMenu:()=>t(!1),children:E}):e.jsx("button",{type:"button",className:"classicyDesktopMenuExtensionTrigger","aria-label":c,onClick:v,children:E})}),A=document.getElementById("classicyDesktop")??document.body;return e.jsxs(e.Fragment,{children:[T.createPortal(j,p),x&&C&&T.createPortal(e.jsx(N,{name:`menubar-ext-${s}`,menuItems:a,position:[w.left,w.bottom],flipLeftTo:w.right,onClose:()=>t(!1),...h?{keyboard:!0}:{}}),A)]})};f.__docgenInfo={description:`Adds an item to the right-hand side of the menu bar, to the left of the
clock \u2014 the place for an app's status icon or account menu. Use it instead of
a raw \`<menu>\` for menu-bar items.

Render it anywhere inside a \`ClassicyDesktop\` (typically inside your
\`ClassicyApp\`): it portals into the menu bar's \`#classicyDesktopMenuExtensions\`
region, and renders nothing when that region is not in the document \u2014 as
under an Appearance Package whose \`layout.menuBar.placement\` is \`"window"\`,
which draws no screen bar. Under a package whose layout declares
\`taskbar\` (the Windows 95/98 shell) the region is the taskbar's status
area's, beside the notification icons, so the item is a tray icon there.
It looks the region up again whenever the package layout's placement or
its taskbar's presence changes, so it reappears when the bar or the
taskbar does; a bar forced to \`placement="screen"\` under a
window-placement package is not re-queried. The item
is a real \`<button>\`, so Enter and Space activate it. With \`menuItems\`, a
click drops a Platinum menu below the item, which closes on a selection or a
click outside. The menu hangs from the item's left side, or, where that
would pass the desktop's right edge, with its right side under the item's
right side, as a menu bar title's pull-down does; one still too wide is
pinned inside the desktop. In the taskbar's status area it hangs from the
item's bottom too, and so, kept to the menu bounds, which end at the
taskbar's band, it is pinned upward above the taskbar; there it takes the
arrow keys and never times out, and the item is a status indicator (WIG
Ch.10 "Status Notification", pp.212\u2013213): its \`title\` is a tooltip after
500 ms whatever Balloon Help says, put away by a press, button 2 opens
its menu at the pointer (nothing without one), and a pointer press takes
no focus.

\`\`\`tsx
<ClassicyMenuBarExtension id="myapp_menu" order={1} title={appName} menuItems={items}>
  <img src={appIcon} alt={appName} />
</ClassicyMenuBarExtension>
\`\`\``,methods:[],displayName:"ClassicyMenuBarExtension",props:{id:{required:!0,tsType:{name:"string"},description:"Unique id; also names the item's dropdown menu."},order:{required:!1,tsType:{name:"number"},description:"CSS flex `order` among the menu bar's extension items. Defaults to `0`.",defaultValue:{value:"0",computed:!1}},icon:{required:!1,tsType:{name:"string"},description:"Icon drawn in the menu bar when no `children` are given. In the\ntaskbar's status area (`layout.taskbar`) it is always the item's\ncontent, at 16 px: the active package's generic application icon\nstands in for it when none is given."},title:{required:!1,tsType:{name:"string"},description:`Accessible name of the item's button (and the icon's alt text). In the
taskbar's status area, its tooltip too, and never drawn as text.`},menuItems:{required:!1,tsType:{name:"Array",elements:[{name:"ClassicyMenuItem"}],raw:"ClassicyMenuItem[]"},description:"Menu dropped down below the item when it is clicked."},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Called on every click, whether or not the item has a menu."},children:{required:!1,tsType:{name:"ReactNode"},description:"Custom item content, drawn instead of `icon`; not drawn in the\ntaskbar's status area, which shows an icon alone (WIG Ch.10 p.211)."},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the item's `<li>` after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the item's `<li>` after the component's own (`order`)."}}};const{fn:H}=__STORYBOOK_MODULE_TEST__,G={title:"Desktop/MenuBar/Extension",component:f},l={render:()=>e.jsxs("div",{id:"classicyDesktop",style:{position:"relative",minHeight:200},children:[e.jsx("div",{style:{background:"var(--color-black)",height:"var(--window-control-size)",display:"flex",justifyContent:"flex-end"},children:e.jsx("ul",{id:"classicyDesktopMenuExtensions",className:"classicyDesktopMenuExtensions",style:{display:"flex",margin:0,padding:0,listStyle:"none"}})}),e.jsx(f,{id:"user",order:10,icon:P("icons","system.network.userDirectory"),title:"Account",menuItems:[{id:"account",title:"Account\u2026",onClickFunc:()=>{}},{id:"logout",title:"Log Out\u2026",onClickFunc:()=>{}}]})]})},d={parameters:F,render:()=>e.jsx(f,{id:"status",title:"Status",onClick:H(),children:e.jsx("span",{style:{padding:"0 4px"},children:"Online"})})};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source},description:{story:"An icon item with a dropdown menu, in a stand-in menu bar strip (the story\nsupplies the `#classicyDesktopMenuExtensions` region and `#classicyDesktop`\nthe component portals into). Click the icon to drop the menu below it.",...l.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  parameters: desktopParameters,
  render: () => <ClassicyMenuBarExtension id="status" title="Status" onClick={fn()}>
            <span style={{
      padding: "0 4px"
    }}>Online</span>
        </ClassicyMenuBarExtension>
}`,...d.parameters?.docs?.source},description:{story:"On a real desktop, the item lands in the menu bar to the left of the clock.\nHere it shows custom `children` in place of an icon and has no menu, so a\nclick only calls `onClick`.",...d.parameters?.docs?.description}}};const K=["UserMenu","OnDesktop"];export{d as OnDesktop,l as UserMenu,K as __namedExportsOrder,G as default};
