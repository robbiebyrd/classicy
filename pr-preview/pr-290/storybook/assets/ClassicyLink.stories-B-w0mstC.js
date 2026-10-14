import{aj as b,j as l,ah as v,E as D}from"./iframe-DWz8lL3k.js";import"./preload-helper-sftlJAir.js";const y=({href:s,disposition:m="classicy",event:r,eventData:p,onClickFunc:d,disabled:a=!1,className:f,children:g,...h})=>{const o=D(),{track:u}=b(),w=e=>{if(a){e.preventDefault();return}if(u("click",{type:"ClassicyLink",href:s,event:r}),!(d&&(d(e),e.defaultPrevented))){if(r){e.preventDefault(),o({type:r,...p??{}});return}if(!s){e.preventDefault();return}e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button===1||(e.preventDefault(),o({type:"ClassicyDesktopOpenUrl",url:s,disposition:m}))}},k=e=>{e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar"||(e.preventDefault(),!a&&(u("click",{type:"ClassicyLink",event:r}),r&&o({type:r,...p??{}})))};return l.jsx("a",{...h,href:s,role:s?void 0:"button",tabIndex:a?-1:s?void 0:0,"aria-disabled":a||void 0,className:v("classicyLink",a?"classicyLinkDisabled":"",f),onClick:w,onKeyDown:s?void 0:k,children:g})};y.__docgenInfo={description:"",methods:[],displayName:"ClassicyLink",props:{disposition:{defaultValue:{value:'"classicy"',computed:!1},required:!1},disabled:{defaultValue:{value:"false",computed:!1},required:!1}}};const L={title:"Controls/Link",component:y},n={args:{href:"https://classicy.ing",children:"Visit classicy.ing"},decorators:[s=>l.jsxs("p",{style:{margin:0},children:["Learn more at ",l.jsx(s,{})," — opens in a WebViewer window."]})]},t={args:{href:"https://classicy.ing",disposition:"browser-new",children:"Open in a new tab"}},i={args:{event:"ClassicyAppScreenSaverActivate",children:"Start the screen saver"}},c={args:{href:"https://classicy.ing",disabled:!0,children:"Unavailable link"}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...c.parameters?.docs?.source}}};const x=["InDesktopViewer","NewBrowserTab","InternalAction","Disabled"];export{c as Disabled,n as InDesktopViewer,i as InternalAction,t as NewBrowserTab,x as __namedExportsOrder,L as default};
