import{r,b8 as R,b9 as o,b5 as C,j as n}from"./iframe-CwjS3mTc.js";const K=({disabled:c=!1,menuItems:l,onClick:i,onSelect:h,children:I,className:j,style:k})=>{const t=Array.isArray(l)&&l.length>0,y=!c&&(t||!!i),[A,d]=r.useState(!1),[s,p]=r.useState(!1),u=r.useRef(null),m=r.useRef(null),a=R("Placard",{disabled:c,pressed:!c&&(A||s)},m),b=a.emit,w=r.useRef(s);r.useEffect(()=>{w.current!==s&&(w.current=s,s||b("close",o()))},[s,b]),r.useEffect(()=>{if(!s)return;const e=f=>{u.current&&!u.current.contains(f.target)&&p(!1)};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[s]);const N=e=>{c||(a.emit("click",o({menu:t})),t&&(p(f=>!f),s||a.emit("open",o())),i&&i(e))},x=e=>e==="Enter"||e===" ",g=e=>{!e.repeat&&x(e.key)&&a.emit("press",o())},E=e=>{x(e.key)&&a.emit("release",o())},M=e=>{e.disabled||(p(!1),h&&h(e.id))},P={className:C("classicyPlacard",a.className,{classicyPlacardInteractive:y,classicyPlacardHasMenu:t}),style:a.style},v=n.jsxs(n.Fragment,{children:[n.jsx("span",{className:"classicyPlacardContent",children:I}),t&&n.jsx("span",{className:"classicyPlacardArrow","aria-hidden":!0})]});return n.jsxs("div",{className:C("classicyPlacardHolder",j),style:k,ref:u,children:[y?n.jsx("button",{...a.attrs,ref:m,type:"button",tabIndex:0,disabled:c,"aria-haspopup":t?"menu":void 0,"aria-expanded":t?s:void 0,...P,onClick:N,onKeyDown:g,onKeyUp:E,onMouseDown:()=>{d(!0),a.emit("press",{input:"pointer"})},onMouseUp:()=>{d(!1),a.emit("release",{input:"pointer"})},onMouseLeave:()=>d(!1),children:v}):n.jsx("div",{...a.attrs,ref:m,...P,children:v}),t&&s&&n.jsx("ul",{className:"classicyPlacardMenu",role:"menu",children:l?.map(e=>n.jsx("li",{role:"none",children:n.jsx("button",{type:"button",role:"menuitem",className:"classicyPlacardMenuItem",disabled:e.disabled,onClick:()=>M(e),children:e.title})},e.id))})]})};K.__docgenInfo={description:`A Platinum placard (HIGOS8 Ch.2 "Placards", p.46): a small beveled
information panel, normally pinned to a document window's bottom-left
corner beside the horizontal scroll bar \u2014 pass it as \`ClassicyWindow\`'s
\`placard\` prop to put it there. Its children are the displayed text, such
as an item count or the current magnification.

It has three looks: normal, pressed and disabled. A plain placard is
static information (a \`<div>\`). Given \`onClick\` or \`menuItems\` it becomes
a \`<button>\` that plays the button click sounds (the appearance package's
press/release hooks); with \`menuItems\` it shows a down-arrow and opens a
small menu (closed by an outside click) whose choice is reported through
\`onSelect\`.

\`\`\`tsx
<ClassicyWindow
    id="doc" appId={appId}
    placard={
        <ClassicyPlacard menuItems={zoomItems} onSelect={setZoom}>100%</ClassicyPlacard>
    }
/>
\`\`\``,methods:[],displayName:"ClassicyPlacard",props:{disabled:{defaultValue:{value:"false",computed:!1},required:!1}}};export{K as C};
