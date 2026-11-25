import{j as e,d as u,ak as k,al as y,am as A,C as M,b as m,u as b}from"./iframe-fjZGO0Og.js";import{s as w}from"./icon-16x16-Cycod0X3.js";import{d as g,S as x}from"./helpers-DT2SckrD.js";import"./preload-helper-CiDKIbga.js";const{fn:q}=__STORYBOOK_MODULE_TEST__,v={title:"Desktop/Notification Manager",parameters:{...g,docs:{...g.docs,description:{component:"The Notification Manager (Inside Macintosh: Processes, ch. 5): an app or a\nhost asks for the user's attention with `classicyNotify`, from anywhere.\nThe app's name is marked with \u25C6 in the Application menu, its icon blinks\nin the menu bar, its sound plays at the alert volume and its alert shows,\neach as requested; `onResponse` is called after OK."}}}},o="storybook.mailbox.app",h=({request:r,openMenu:t=!1})=>{const l=b(),a=u.useRef(r);return u.useEffect(()=>{let n="";const s=window.setTimeout(()=>{l({type:"ClassicyAppFocus",app:{id:"Finder.app"}}),n=k({...a.current,appId:o}),t&&window.setTimeout(()=>document.querySelector("#app-switcher > p")?.click(),100)},300);return()=>{window.clearTimeout(s),n&&y(n)}},[l,t]),e.jsx(x,{id:o,name:"Mailbox",icon:w})},i={render:()=>e.jsx(h,{request:{message:"Mailbox has received 3 new messages.",sound:!0,onResponse:q()}})},c={render:()=>e.jsx(h,{request:{},openMenu:!0})},d={render:()=>e.jsx(h,{request:{mark:!1}})},j=()=>{const r=A(),[t,l]=u.useState(!1),a=s=>{const f=()=>k({...s,appId:o});t?window.setTimeout(f,3e3):f()},n=u.useRef(r);return n.current=r,u.useEffect(()=>()=>{for(const s of n.current)s.appId===o&&y(s.id)},[]),e.jsx(M,{id:"playground",appId:o,title:"Notification Manager",initialSize:[340,230],initialPosition:[80,60],children:e.jsxs("div",{style:{padding:"1em",display:"flex",flexDirection:"column",gap:"0.5em"},children:[e.jsxs("label",{children:[e.jsx("input",{type:"checkbox",checked:t,onChange:s=>l(s.target.checked)})," ","Post 3 seconds later (switch to the Finder meanwhile)"]}),e.jsx(m,{onClickFunc:()=>a({}),children:"Mark and icon"}),e.jsx(m,{onClickFunc:()=>a({sound:!0,message:"Your download is complete."}),children:"Sound and alert"}),e.jsx(m,{onClickFunc:()=>a({mark:!1}),children:"Icon over the Apple menu"}),e.jsxs("p",{children:["Installed requests: ",r.length]})]})})},p={render:()=>e.jsx(x,{id:o,name:"Mailbox",icon:w,children:e.jsx(j,{})})};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <BackgroundRequest request={{
    message: "Mailbox has received 3 new messages.",
    sound: true,
    onResponse: fn()
  }} />
}`,...i.parameters?.docs?.source},description:{story:`A background app's full request: the \u25C6 beside "Mailbox" in the
Application menu, its icon alternating with the Application menu's once a
second (steady for users who prefer reduced motion), the user's alert
sound, and a note alert with an OK button (Figure 5-2). The mark and the
icon stay after OK, until the Mailbox comes to the front.`,...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <BackgroundRequest request={{}} openMenu />
}`,...c.parameters?.docs?.source},description:{story:`The suggested default (Inside Macintosh, p. 5-5, level 2): the mark and
the blinking icon, no sound and no alert. The Application menu is open,
showing the \u25C6 in the mark column, where the Finder's check is.`,...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <BackgroundRequest request={{
    mark: false
  }} />
}`,...d.parameters?.docs?.source},description:{story:"A request with `mark: false` blinks its icon over the Apple menu instead,\nas one from a desk accessory or a driver did (p. 5-4).",...d.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id={APP_ID} name="Mailbox" icon={smallAppIcon}>
            <PlaygroundWindow />
        </StoryApp>
}`,...p.parameters?.docs?.source},description:{story:`Post requests from a window. A request for this app is removed when it
comes to the front, so check "Post 3 seconds later" and bring the Finder
forward to see a background app's mark and icon.`,...p.parameters?.docs?.description}}};const R=["BackgroundApp","MarkInApplicationMenu","IconOverAppleMenu","Playground"];export{i as BackgroundApp,d as IconOverAppleMenu,c as MarkInApplicationMenu,p as Playground,R as __namedExportsOrder,v as default};
