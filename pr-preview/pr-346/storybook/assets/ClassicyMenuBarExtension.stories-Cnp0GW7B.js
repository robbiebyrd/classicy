import{h as t,bw as j,j as e,bn as A,bm as B,aN as y,w as N,a0 as O}from"./iframe-DZDMSFm-.js";import{d as q}from"./helpers-BgxDEQiX.js";import"./preload-helper-DhQH6ajB.js";const i=({id:g,order:f=0,icon:c,title:l,menuItems:o,onClick:k,children:x,className:b,style:w})=>{const[d,C]=t.useState(null),u=t.useRef(null),[E,p]=t.useState(!1),[r,M]=t.useState({left:0,bottom:0,right:0}),m=!!o&&o.length>0,h=j(),v=h.menuBar.placement,D=h.taskbar!==void 0;t.useEffect(()=>{C(document.getElementById("classicyDesktopMenuExtensions"))},[v,D]);const T=()=>{if(m){const a=u.current?.getBoundingClientRect();a&&M({left:a.left,bottom:a.bottom,right:a.right}),p(!0)}k?.()};if(!d)return null;const I=e.jsx("li",{ref:u,className:B("classicyMenuItem","classicyDesktopMenuExtension",b),style:{order:f,...w},children:e.jsx("button",{type:"button",className:"classicyDesktopMenuExtensionTrigger","aria-label":l,onClick:T,children:x??(c?e.jsx(A,{src:c,alt:l??""}):null)})}),S=document.getElementById("classicyDesktop")??document.body;return e.jsxs(e.Fragment,{children:[y.createPortal(I,d),E&&m&&y.createPortal(e.jsx(N,{name:`menubar-ext-${g}`,menuItems:o,position:[r.left,r.bottom],flipLeftTo:r.right,onClose:()=>p(!1)}),S)]})};i.__docgenInfo={description:`Adds an item to the right-hand side of the menu bar, to the left of the
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
taskbar's band, it is pinned upward above the taskbar.

\`\`\`tsx
<ClassicyMenuBarExtension id="myapp_menu" order={1} title={appName} menuItems={items}>
  <img src={appIcon} alt={appName} />
</ClassicyMenuBarExtension>
\`\`\``,methods:[],displayName:"ClassicyMenuBarExtension",props:{id:{required:!0,tsType:{name:"string"},description:"Unique id; also names the item's dropdown menu."},order:{required:!1,tsType:{name:"number"},description:"CSS flex `order` among the menu bar's extension items. Defaults to `0`.",defaultValue:{value:"0",computed:!1}},icon:{required:!1,tsType:{name:"string"},description:"Icon drawn in the menu bar when no `children` are given."},title:{required:!1,tsType:{name:"string"},description:"Accessible name of the item's button (and the icon's alt text)."},menuItems:{required:!1,tsType:{name:"Array",elements:[{name:"ClassicyMenuItem"}],raw:"ClassicyMenuItem[]"},description:"Menu dropped down below the item when it is clicked."},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Called on every click, whether or not the item has a menu."},children:{required:!1,tsType:{name:"ReactNode"},description:"Custom item content, drawn instead of `icon`."},className:{required:!1,tsType:{name:"string"},description:"Extra class names, merged onto the item's `<li>` after the component's own."},style:{required:!1,tsType:{name:"CSSProperties"},description:"Inline style, merged onto the item's `<li>` after the component's own (`order`)."}}};const{fn:_}=__STORYBOOK_MODULE_TEST__,F={title:"Desktop/MenuBar/Extension",component:i},n={render:()=>e.jsxs("div",{id:"classicyDesktop",style:{position:"relative",minHeight:200},children:[e.jsx("div",{style:{background:"var(--color-black)",height:"var(--window-control-size)",display:"flex",justifyContent:"flex-end"},children:e.jsx("ul",{id:"classicyDesktopMenuExtensions",className:"classicyDesktopMenuExtensions",style:{display:"flex",margin:0,padding:0,listStyle:"none"}})}),e.jsx(i,{id:"user",order:10,icon:O("icons","system.network.userDirectory"),title:"Account",menuItems:[{id:"account",title:"Account\u2026",onClickFunc:()=>{}},{id:"logout",title:"Log Out\u2026",onClickFunc:()=>{}}]})]})},s={parameters:q,render:()=>e.jsx(i,{id:"status",title:"Status",onClick:_(),children:e.jsx("span",{style:{padding:"0 4px"},children:"Online"})})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:"An icon item with a dropdown menu, in a stand-in menu bar strip (the story\nsupplies the `#classicyDesktopMenuExtensions` region and `#classicyDesktop`\nthe component portals into). Click the icon to drop the menu below it.",...n.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  parameters: desktopParameters,
  render: () => <ClassicyMenuBarExtension id="status" title="Status" onClick={fn()}>
            <span style={{
      padding: "0 4px"
    }}>Online</span>
        </ClassicyMenuBarExtension>
}`,...s.parameters?.docs?.source},description:{story:"On a real desktop, the item lands in the menu bar to the left of the clock.\nHere it shows custom `children` in place of an icon and has no menu, so a\nclick only calls `onClick`.",...s.parameters?.docs?.description}}};const L=["UserMenu","OnDesktop"];export{s as OnDesktop,n as UserMenu,L as __namedExportsOrder,F as default};
