import{aa as b,j as l,a9 as v,x as D}from"./iframe-D44mm1Vl.js";import"./preload-helper-DWV1EXqE.js";const y=({href:s,disposition:m="classicy",event:a,eventData:p,onClickFunc:d,disabled:r=!1,className:f,children:g,...h})=>{const o=D(),{track:u}=b(),w=e=>{if(r){e.preventDefault();return}if(u("click",{type:"ClassicyLink",href:s,event:a}),!(d&&(d(e),e.defaultPrevented))){if(a){e.preventDefault(),o({type:a,...p??{}});return}if(!s){e.preventDefault();return}e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button===1||(e.preventDefault(),o({type:"ClassicyDesktopOpenUrl",url:s,disposition:m}))}},k=e=>{e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar"||(e.preventDefault(),!r&&(u("click",{type:"ClassicyLink",event:a}),a&&o({type:a,...p??{}})))};return l.jsx("a",{...h,href:s,role:s?void 0:"button",tabIndex:r?-1:s?void 0:0,"aria-disabled":r||void 0,className:v("classicyLink",r?"classicyLinkDisabled":"",f),onClick:w,onKeyDown:s?void 0:k,children:g})};y.__docgenInfo={description:"",methods:[],displayName:"ClassicyLink",props:{disposition:{defaultValue:{value:'"classicy"',computed:!1},required:!1},disabled:{defaultValue:{value:"false",computed:!1},required:!1}}};const C={title:"Controls/Link",component:y},n={args:{href:"https://classicy.ing",children:"Visit classicy.ing"},decorators:[s=>l.jsxs("p",{style:{margin:0},children:["Learn more at ",l.jsx(s,{})," — opens in a WebViewer window."]})]},t={args:{href:"https://classicy.ing",disposition:"browser-new",children:"Open in a new tab"}},i={args:{event:"ClassicyAppScreenSaverActivate",children:"Start the screen saver"}},c={args:{href:"https://classicy.ing",disabled:!0,children:"Unavailable link"}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    children: "Visit classicy.ing"
  },
  decorators: [Story => <p style={{
    margin: 0
  }}>
                Learn more at <Story /> — opens in a WebViewer window.
            </p>]
}`,...n.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    disposition: "browser-new",
    children: "Open in a new tab"
  }
}`,...t.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    event: "ClassicyAppScreenSaverActivate",
    children: "Start the screen saver"
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    disabled: true,
    children: "Unavailable link"
  }
}`,...c.parameters?.docs?.source}}};const L=["InDesktopViewer","NewBrowserTab","InternalAction","Disabled"];export{c as Disabled,n as InDesktopViewer,i as InternalAction,t as NewBrowserTab,L as __namedExportsOrder,C as default};
