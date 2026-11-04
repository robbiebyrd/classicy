import{r,b8 as O,b9 as l,ba as S,b5 as C,j as n}from"./iframe-BT1seu4_.js";const D=({disabled:o=!1,menuItems:d,onClick:p,onSelect:h,children:I,className:j,style:k})=>{const t=Array.isArray(d)&&d.length>0,y=!o&&(t||!!p),[N,c]=r.useState(!1),[a,u]=r.useState(!1),m=r.useRef(null),i=r.useRef(null),s=O("Placard",{disabled:o,pressed:!o&&(N||a)},i),P=s.emit,b=r.useRef(a);r.useEffect(()=>{b.current!==a&&(b.current=a,a||P("close",l()))},[a,P]),r.useEffect(()=>{if(!a)return;const e=f=>{m.current&&!m.current.contains(f.target)&&u(!1)};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[a]);const A=e=>{o||(s.emit("click",l({menu:t})),t&&(u(f=>!f),a||s.emit("open",l())),p&&p(e))},v=e=>e==="Enter"||e===" ",E=e=>{!e.repeat&&v(e.key)&&s.emit("press",l())},R=e=>{v(e.key)&&s.emit("release",l({lost:!1,canceled:!1}))},{watchPress:M,releasedOver:g}=S(),K=e=>{e.disabled||(u(!1),h&&h(e.id))},w={className:C("classicyPlacard",s.className,{classicyPlacardInteractive:y,classicyPlacardHasMenu:t}),style:s.style},x=n.jsxs(n.Fragment,{children:[n.jsx("span",{className:"classicyPlacardContent",children:I}),t&&n.jsx("span",{className:"classicyPlacardArrow","aria-hidden":!0})]});return n.jsxs("div",{className:C("classicyPlacardHolder",j),style:k,ref:m,children:[y?n.jsx("button",{...s.attrs,ref:i,type:"button",tabIndex:0,disabled:o,"aria-haspopup":t?"menu":void 0,"aria-expanded":t?a:void 0,...w,onClick:A,onKeyDown:E,onKeyUp:R,onMouseDown:()=>{c(!0),s.emit("press",{input:"pointer"}),M({isOver:e=>e instanceof Node&&!!i.current?.contains(e),onRelease:e=>{c(!1),s.emit("release",{input:"pointer",lost:!1,canceled:e})},onLost:()=>{c(!1),s.emit("release",{input:"pointer",lost:!0,canceled:!0})}})},onMouseUp:e=>{c(!1),!g(e.nativeEvent)&&s.emit("release",{input:"pointer",lost:!1,canceled:!1})},onMouseLeave:()=>c(!1),children:x}):n.jsx("div",{...s.attrs,ref:i,...w,children:x}),t&&a&&n.jsx("ul",{className:"classicyPlacardMenu",role:"menu",children:d?.map(e=>n.jsx("li",{role:"none",children:n.jsx("button",{type:"button",role:"menuitem",className:"classicyPlacardMenuItem",disabled:e.disabled,onClick:()=>K(e),children:e.title})},e.id))})]})};D.__docgenInfo={description:`A Platinum placard (HIGOS8 Ch.2 "Placards", p.46): a small beveled
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
