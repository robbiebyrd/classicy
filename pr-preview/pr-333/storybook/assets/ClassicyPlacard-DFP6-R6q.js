import{k as r,b9 as D,ba as d,bb as L,bc as H,b6 as C,j as n}from"./iframe-DWyx1tFi.js";const U=({disabled:c=!1,menuItems:u,onClick:p,onSelect:y,children:k,className:I,style:j})=>{const t=Array.isArray(u)&&u.length>0,h=!c&&(t||!!p),[N,o]=r.useState(!1),[a,m]=r.useState(!1),f=r.useRef(null),l=r.useRef(null),s=D("Placard",{disabled:c,pressed:!c&&(N||a)},l),b=s.emit,P=r.useRef(a);r.useEffect(()=>{P.current!==a&&(P.current=a,a||b("close",d()))},[a,b]),r.useEffect(()=>{if(!a)return;const e=i=>{f.current&&!f.current.contains(i.target)&&m(!1)};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[a]);const A=e=>{c||(s.emit("click",d({menu:t})),t&&(m(i=>!i),a||s.emit("open",d())),p&&p(e))},{watchKeyPress:E,releaseKey:K}=L(l),v=e=>e==="Enter"||e===" ",R=e=>{!e.repeat&&v(e.key)&&(s.emit("press",d()),E(e.key,i=>s.emit("release",{input:"keyboard",lost:i,canceled:!0})))},M=e=>{v(e.key)&&K(e)&&s.emit("release",d({lost:!1,canceled:!1}))},{watchPress:g,releasedOver:O}=H(),S=e=>{e.disabled||(m(!1),y&&y(e.id))},w={className:C("classicyPlacard",s.className,{classicyPlacardInteractive:h,classicyPlacardHasMenu:t}),style:s.style},x=n.jsxs(n.Fragment,{children:[n.jsx("span",{className:"classicyPlacardContent",children:k}),t&&n.jsx("span",{className:"classicyPlacardArrow","aria-hidden":!0})]});return n.jsxs("div",{className:C("classicyPlacardHolder",I),style:j,ref:f,children:[h?n.jsx("button",{...s.attrs,ref:l,type:"button",tabIndex:0,disabled:c,"aria-haspopup":t?"menu":void 0,"aria-expanded":t?a:void 0,...w,onClick:A,onKeyDown:R,onKeyUp:M,onMouseDown:()=>{o(!0),s.emit("press",{input:"pointer"}),g({isOver:e=>e instanceof Node&&!!l.current?.contains(e),onRelease:e=>{o(!1),s.emit("release",{input:"pointer",lost:!1,canceled:e})},onLost:()=>{o(!1),s.emit("release",{input:"pointer",lost:!0,canceled:!0})}})},onMouseUp:e=>{o(!1),!O(e.nativeEvent)&&s.emit("release",{input:"pointer",lost:!1,canceled:!1})},onMouseLeave:()=>o(!1),children:x}):n.jsx("div",{...s.attrs,ref:l,...w,children:x}),t&&a&&n.jsx("ul",{className:"classicyPlacardMenu",role:"menu",children:u?.map(e=>n.jsx("li",{role:"none",children:n.jsx("button",{type:"button",role:"menuitem",className:"classicyPlacardMenuItem",disabled:e.disabled,onClick:()=>S(e),children:e.title})},e.id))})]})};U.__docgenInfo={description:`A Platinum placard (HIGOS8 Ch.2 "Placards", p.46): a small beveled
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
\`\`\``,methods:[],displayName:"ClassicyPlacard",props:{disabled:{defaultValue:{value:"false",computed:!1},required:!1}}};export{U as C};
