import{h as a,by as I,j as e,bn as B,aY as D,y as O,bC as _,l as N,bE as L,bF as q,s as R}from"./iframe-BESxYuUA.js";import{d as P}from"./helpers-Cqc7SQ9j.js";import"./preload-helper-DhQH6ajB.js";const F=({title:s,menuItems:i,onActivate:d,onCloseMenu:r,children:o})=>{const u=a.useRef(null),{showContextMenu:f}=_(),g=s!==void 0&&s.trim()!=="",{handlers:n,balloon:p}=N(u,{content:s??"",delay:q},{force:!0}),k=t=>{n.onMouseLeave(),t.button===0&&t.preventDefault()},m=()=>{g&&n.onMouseEnter()},b=t=>{t.preventDefault(),n.onMouseLeave(),r(),!(!i||i.length===0)&&f(i,[t.clientX,t.clientY],{helpItem:!1,keyboard:!0})};return e.jsxs(e.Fragment,{children:[e.jsx("button",{ref:u,type:"button",className:"classicyDesktopMenuExtensionTrigger","aria-label":s,"aria-describedby":n["aria-describedby"],onClick:d,onMouseDown:k,onMouseEnter:m,onMouseLeave:n.onMouseLeave,onContextMenu:b,children:o}),p]})},y=({id:s,order:i=0,icon:d,title:r,menuItems:o,onClick:u,children:f,className:g,style:n})=>{const[p,k]=a.useState(null),m=a.useRef(null),[b,t]=a.useState(!1),[x,T]=a.useState({left:0,bottom:0,right:0}),w=!!o&&o.length>0,M=I(),S=M.menuBar.placement,C=M.taskbar!==void 0;a.useEffect(()=>{k(document.getElementById("classicyDesktopMenuExtensions"))},[S,C]);const v=()=>{if(w){const h=m.current?.getBoundingClientRect();h&&T({left:h.left,bottom:h.bottom,right:h.right}),t(!0)}u?.()};if(!p)return null;const E=f??(d?e.jsx(L,{src:d,alt:r??""}):null),A=e.jsx("li",{ref:m,className:B("classicyMenuItem","classicyDesktopMenuExtension",g),style:{order:i,...n},children:C?e.jsx(F,{title:r,menuItems:w?o:void 0,onActivate:v,onCloseMenu:()=>t(!1),children:E}):e.jsx("button",{type:"button",className:"classicyDesktopMenuExtensionTrigger","aria-label":r,onClick:v,children:E})}),j=document.getElementById("classicyDesktop")??document.body;return e.jsxs(e.Fragment,{children:[D.createPortal(A,p),b&&w&&D.createPortal(e.jsx(O,{name:`menubar-ext-${s}`,menuItems:o,position:[x.left,x.bottom],flipLeftTo:x.right,onClose:()=>t(!1),...C?{keyboard:!0}:{}}),j)]})};y.__docgenInfo={description:`Adds an item to the right-hand side of the menu bar, to the left of the
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
\`\`\``,methods:[],displayName:"ClassicyMenuBarExtension",props:{id:{required:!0,tsType:{name:"string"},description:"Unique id; also names the item's dropdown menu."},order:{required:!1,tsType:{name:"number"},description:"CSS flex `order` among the menu bar's extension items. Defaults to `0`.",defaultValue:{value:"0",computed:!1}},icon:{required:!1,tsType:{name:"string"},description:"Icon drawn in the menu bar when no `children` are given."},title:{required:!1,tsType:{name:"string"},description:"Accessible name of the item's button (and the icon's alt text)."},menuItems:{required:!1,tsType:{name:"Array",elements:[{name:"ClassicyMenuItem"}],raw:"ClassicyMenuItem[]"},description:"Menu dropped down below the item when it is clicked."},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Called on every click, whether or not the item has a menu."},children:{required:!1,tsType:{name:"ReactNode"},description:"Custom item content, drawn instead of `icon`."},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the item's `<li>` after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the item's `<li>` after the component's own (`order`)."}}};const{fn:U}=__STORYBOOK_MODULE_TEST__,z={title:"Desktop/MenuBar/Extension",component:y},c={render:()=>e.jsxs("div",{id:"classicyDesktop",style:{position:"relative",minHeight:200},children:[e.jsx("div",{style:{background:"var(--color-black)",height:"var(--window-control-size)",display:"flex",justifyContent:"flex-end"},children:e.jsx("ul",{id:"classicyDesktopMenuExtensions",className:"classicyDesktopMenuExtensions",style:{display:"flex",margin:0,padding:0,listStyle:"none"}})}),e.jsx(y,{id:"user",order:10,icon:R("icons","system.network.userDirectory"),title:"Account",menuItems:[{id:"account",title:"Account\u2026",onClickFunc:()=>{}},{id:"logout",title:"Log Out\u2026",onClickFunc:()=>{}}]})]})},l={parameters:P,render:()=>e.jsx(y,{id:"status",title:"Status",onClick:U(),children:e.jsx("span",{style:{padding:"0 4px"},children:"Online"})})};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
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
}`,...c.parameters?.docs?.source},description:{story:"An icon item with a dropdown menu, in a stand-in menu bar strip (the story\nsupplies the `#classicyDesktopMenuExtensions` region and `#classicyDesktop`\nthe component portals into). Click the icon to drop the menu below it.",...c.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  parameters: desktopParameters,
  render: () => <ClassicyMenuBarExtension id="status" title="Status" onClick={fn()}>
            <span style={{
      padding: "0 4px"
    }}>Online</span>
        </ClassicyMenuBarExtension>
}`,...l.parameters?.docs?.source},description:{story:"On a real desktop, the item lands in the menu bar to the left of the clock.\nHere it shows custom `children` in place of an icon and has no menu, so a\nclick only calls `onClick`.",...l.parameters?.docs?.description}}};const K=["UserMenu","OnDesktop"];export{l as OnDesktop,c as UserMenu,K as __namedExportsOrder,z as default};
