import{r,b8 as K,b9 as c,ba as S,b5 as C,j as n}from"./iframe-DbAPN-N5.js";const D=({disabled:o=!1,menuItems:i,onClick:d,onSelect:h,children:I,className:j,style:k})=>{const t=Array.isArray(i)&&i.length>0,y=!o&&(t||!!d),[A,l]=r.useState(!1),[a,p]=r.useState(!1),u=r.useRef(null),m=r.useRef(null),s=K("Placard",{disabled:o,pressed:!o&&(A||a)},m),P=s.emit,b=r.useRef(a);r.useEffect(()=>{b.current!==a&&(b.current=a,a||P("close",c()))},[a,P]),r.useEffect(()=>{if(!a)return;const e=f=>{u.current&&!u.current.contains(f.target)&&p(!1)};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[a]);const N=e=>{o||(s.emit("click",c({menu:t})),t&&(p(f=>!f),a||s.emit("open",c())),d&&d(e))},w=e=>e==="Enter"||e===" ",g=e=>{!e.repeat&&w(e.key)&&s.emit("press",c())},E=e=>{w(e.key)&&s.emit("release",c({lost:!1}))},M=S(),R=e=>{e.disabled||(p(!1),h&&h(e.id))},x={className:C("classicyPlacard",s.className,{classicyPlacardInteractive:y,classicyPlacardHasMenu:t}),style:s.style},v=n.jsxs(n.Fragment,{children:[n.jsx("span",{className:"classicyPlacardContent",children:I}),t&&n.jsx("span",{className:"classicyPlacardArrow","aria-hidden":!0})]});return n.jsxs("div",{className:C("classicyPlacardHolder",j),style:k,ref:u,children:[y?n.jsx("button",{...s.attrs,ref:m,type:"button",tabIndex:0,disabled:o,"aria-haspopup":t?"menu":void 0,"aria-expanded":t?a:void 0,...x,onClick:N,onKeyDown:g,onKeyUp:E,onMouseDown:()=>{l(!0),s.emit("press",{input:"pointer"}),M(()=>{l(!1),s.emit("release",{input:"pointer",lost:!0})})},onMouseUp:()=>{l(!1),s.emit("release",{input:"pointer",lost:!1})},onMouseLeave:()=>l(!1),children:v}):n.jsx("div",{...s.attrs,ref:m,...x,children:v}),t&&a&&n.jsx("ul",{className:"classicyPlacardMenu",role:"menu",children:i?.map(e=>n.jsx("li",{role:"none",children:n.jsx("button",{type:"button",role:"menuitem",className:"classicyPlacardMenuItem",disabled:e.disabled,onClick:()=>R(e),children:e.title})},e.id))})]})};D.__docgenInfo={description:`A Platinum placard (HIGOS8 Ch.2 "Placards", p.46): a small beveled
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
\`\`\``,methods:[],displayName:"ClassicyPlacard",props:{disabled:{defaultValue:{value:"false",computed:!1},required:!1}}};export{D as C};
