import{bt as U,h as c,bu as W,bp as z,bq as d,bv as G,bw as T,bn as k,j as n}from"./iframe-BESxYuUA.js";const V=({disabled:l=!1,menuItems:u,onClick:p,onSelect:y,menuStatus:I=!1,children:j,className:A,style:N})=>{const t=Array.isArray(u)&&u.length>0,h=U(I),E=c.useContext(W),K=h!==null&&E!==!1,w=!l&&(t||!!p),[M,o]=c.useState(!1),[a,f]=c.useState(!1),m=c.useRef(null),r=c.useRef(null),s=z("Placard",{disabled:l,pressed:!l&&(M||a)},r),b=s.emit,v=c.useRef(a);c.useEffect(()=>{v.current!==a&&(v.current=a,a||b("close",d()))},[a,b]),c.useEffect(()=>{if(!a)return;const e=i=>{m.current&&!m.current.contains(i.target)&&f(!1)};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[a]);const R=e=>{l||(s.emit("click",d({menu:t})),t&&(f(i=>!i),a||s.emit("open",d())),p&&p(e))},{watchKeyPress:S,releaseKey:g}=G(r),P=e=>e==="Enter"||e===" ",O=e=>{!e.repeat&&P(e.key)&&(s.emit("press",d()),S(e.key,i=>s.emit("release",{input:"keyboard",lost:i,canceled:!0})))},D=e=>{P(e.key)&&g(e)&&s.emit("release",d({lost:!1,canceled:!1}))},{watchPress:L,releasedOver:q}=T(),H=e=>{e.disabled||(f(!1),y&&y(e.id))},x={className:k("classicyPlacard",s.className,{classicyPlacardInteractive:w,classicyPlacardHasMenu:t}),style:s.style},C=n.jsxs(n.Fragment,{children:[n.jsx("span",{className:"classicyPlacardContent",children:K?h:j}),t&&n.jsx("span",{className:"classicyPlacardArrow","aria-hidden":!0})]});return n.jsxs("div",{className:k("classicyPlacardHolder",A),style:N,ref:m,children:[w?n.jsx("button",{...s.attrs,ref:r,type:"button",tabIndex:0,disabled:l,"aria-haspopup":t?"menu":void 0,"aria-expanded":t?a:void 0,...x,onClick:R,onKeyDown:O,onKeyUp:D,onMouseDown:()=>{o(!0),s.emit("press",{input:"pointer"}),L({isOver:e=>e instanceof Node&&!!r.current?.contains(e),onRelease:e=>{o(!1),s.emit("release",{input:"pointer",lost:!1,canceled:e})},onLost:()=>{o(!1),s.emit("release",{input:"pointer",lost:!0,canceled:!0})}})},onMouseUp:e=>{o(!1),!q(e.nativeEvent)&&s.emit("release",{input:"pointer",lost:!1,canceled:!1})},onMouseLeave:()=>o(!1),children:C}):n.jsx("div",{...s.attrs,ref:r,...x,children:C}),t&&a&&n.jsx("ul",{className:"classicyPlacardMenu",role:"menu",children:u?.map(e=>n.jsx("li",{role:"none",children:n.jsx("button",{type:"button",role:"menuitem",className:"classicyPlacardMenuItem",disabled:e.disabled,onClick:()=>H(e),children:e.title})},e.id))})]})};V.__docgenInfo={description:`A Platinum placard (HIGOS8 Ch.2 "Placards", p.46): a small beveled
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
\`\`\``,methods:[],displayName:"ClassicyPlacard",props:{disabled:{defaultValue:{value:"false",computed:!1},required:!1},menuStatus:{defaultValue:{value:"false",computed:!1},required:!1}}};export{V as C};
