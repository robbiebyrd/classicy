import{r as n,j as e,ae as p,q as j,f as D}from"./iframe-byuwA0vG.js";import"./preload-helper-PPVm8Dsz.js";const o=({id:m,order:y=0,icon:r,title:c,menuItems:t,onClick:x,children:g})=>{const[a,f]=n.useState(null),l=n.useRef(null),[k,u]=n.useState(!1),[C,E]=n.useState([0,0]),d=!!t&&t.length>0;n.useEffect(()=>{f(document.getElementById("classicyDesktopMenuExtensions"))},[]);const M=()=>{if(d){const i=l.current?.getBoundingClientRect();i&&E([i.left,i.bottom]),u(!0)}x?.()};if(!a)return null;const v=e.jsx("li",{ref:l,className:"classicyMenuItem classicyDesktopMenuExtension",style:{order:y},children:e.jsx("button",{type:"button",className:"classicyDesktopMenuExtensionTrigger","aria-label":c,onClick:M,children:g??(r?e.jsx("img",{src:r,alt:c??""}):null)})}),h=document.getElementById("classicyDesktop")??document.body;return e.jsxs(e.Fragment,{children:[p.createPortal(v,a),k&&d&&p.createPortal(e.jsx(j,{name:`menubar-ext-${m}`,menuItems:t,position:C,onClose:()=>u(!1)}),h)]})};o.__docgenInfo={description:"",methods:[],displayName:"ClassicyMenuBarExtension",props:{id:{required:!0,tsType:{name:"string"},description:""},order:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"0",computed:!1}},icon:{required:!1,tsType:{name:"string"},description:""},title:{required:!1,tsType:{name:"string"},description:""},menuItems:{required:!1,tsType:{name:"Array",elements:[{name:"ClassicyMenuItem"}],raw:"ClassicyMenuItem[]"},description:""},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},children:{required:!1,tsType:{name:"ReactNode"},description:""}}};const N={title:"Desktop/MenuBar/Extension",component:o},b=D.system.network.userDirectory,s={render:()=>e.jsxs("div",{id:"classicyDesktop",style:{position:"relative",minHeight:200},children:[e.jsx("div",{style:{background:"var(--color-black)",height:"var(--window-control-size)",display:"flex",justifyContent:"flex-end"},children:e.jsx("ul",{id:"classicyDesktopMenuExtensions",className:"classicyDesktopMenuExtensions",style:{display:"flex",margin:0,padding:0,listStyle:"none"}})}),e.jsx(o,{id:"user",order:10,icon:b,title:"Account",menuItems:[{id:"account",title:"Account…",onClickFunc:()=>{}},{id:"logout",title:"Log Out…",onClickFunc:()=>{}}]})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
            <ClassicyMenuBarExtension id="user" order={10} icon={userIcon} title="Account" menuItems={[{
      id: "account",
      title: "Account…",
      onClickFunc: () => {}
    }, {
      id: "logout",
      title: "Log Out…",
      onClickFunc: () => {}
    }]} />
        </div>
}`,...s.parameters?.docs?.source}}};const T=["UserMenu"];export{s as UserMenu,T as __namedExportsOrder,N as default};
