import{aG as g,j as s,aB as S,u as C,C as L}from"./iframe-C17m_umD.js";import{d as x,S as A}from"./helpers-283wJ7oZ.js";import"./preload-helper-CvV3Uv_A.js";const l=({href:n,disposition:m="classicy",event:i,eventData:h,onClickFunc:y,disabled:t=!1,className:u,children:w,...b})=>{const d=C(),{track:k}=g(),v=e=>{if(t){e.preventDefault();return}if(k("click",{type:"ClassicyLink",href:n,event:i}),!(y&&(y(e),e.defaultPrevented))){if(i){e.preventDefault(),d({type:i,...h??{}});return}if(!n){e.preventDefault();return}e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button===1||(e.preventDefault(),d({type:"ClassicyDesktopOpenUrl",url:n,disposition:m}))}},f=e=>{e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar"||(e.preventDefault(),!t&&(k("click",{type:"ClassicyLink",event:i}),i&&d({type:i,...h??{}})))};return s.jsx("a",{...b,href:n,role:n?void 0:"button",tabIndex:t?-1:n?void 0:0,"aria-disabled":t||void 0,className:S("classicyLink",t?"classicyLinkDisabled":"",u),onClick:v,onKeyDown:n?void 0:f,children:w})};l.__docgenInfo={description:'A Platinum-styled hyperlink — use it instead of a raw `<a>`, which it\nrenders (other anchor attributes pass through). A plain click on an `href`\nlink dispatches `ClassicyDesktopOpenUrl`, so by default the page opens in\nthe desktop\'s own WebViewer window; `disposition` sends it to the browser\ninstead. Modifier and middle clicks keep the browser\'s native behaviour\n(open in a new tab, …). Invalid or non-http URLs raise the desktop error\ndialog.\n\nWith `event` (and `eventData`) it instead dispatches an internal action,\nlike a menu item, and the anchor takes `role="button"` and activates on\nEnter/Space. Opening a URL needs a mounted `ClassicyDesktop`: its WebViewer\nand URL controller are what act on the dispatch.\n\n```tsx\n<ClassicyLink href="https://example.com">Example</ClassicyLink>\n<ClassicyLink href="https://example.com" disposition="browser-new">New tab</ClassicyLink>\n<ClassicyLink event="ClassicyAppScreenSaverActivate">Start the screen saver</ClassicyLink>\n```',methods:[],displayName:"ClassicyLink",props:{disposition:{defaultValue:{value:'"classicy"',computed:!1},required:!1},disabled:{defaultValue:{value:"false",computed:!1},required:!1}}};const O={title:"Controls/Link",component:l},a={args:{href:"https://classicy.ing",children:"Visit classicy.ing"},decorators:[n=>s.jsxs("p",{style:{margin:0},children:["Learn more at ",s.jsx(n,{})," — opens in a WebViewer window."]})]},r={args:{href:"https://classicy.ing",disposition:"browser-new",children:"Open in a new tab"}},o={args:{event:"ClassicyAppScreenSaverActivate",children:"Start the screen saver"}},c={args:{href:"https://classicy.ing",disabled:!0,children:"Unavailable link"}},p={parameters:x,render:()=>s.jsx(A,{id:"storybook.app",name:"Storybook",children:s.jsx(L,{id:"links",appId:"storybook.app",title:"Links",initialSize:[360,180],initialPosition:[80,60],children:s.jsxs("div",{style:{padding:"1em"},children:[s.jsx("p",{children:s.jsx(l,{href:"https://classicy.ing",children:"Visit classicy.ing"})}),s.jsx("p",{children:s.jsx(l,{href:"https://classicy.ing",disposition:"browser-new",children:"Open in a new tab"})}),s.jsx("p",{children:s.jsx(l,{event:"ClassicyAppScreenSaverActivate",children:"Start the screen saver"})})]})})})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    children: "Visit classicy.ing"
  },
  decorators: [Story => <p style={{
    margin: 0
  }}>
                Learn more at <Story /> — opens in a WebViewer window.
            </p>]
}`,...a.parameters?.docs?.source},description:{story:'The default `disposition="classicy"`: a plain click opens the page in the\ndesktop\'s WebViewer window. On this bare canvas there is no desktop to act\non the dispatch — see `OnTheDesktop` for the live behaviour.',...a.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    disposition: "browser-new",
    children: "Open in a new tab"
  }
}`,...r.parameters?.docs?.source},description:{story:'`disposition="browser-new"` opens the URL in a new browser tab (through the\ndesktop\'s URL controller) instead of a WebViewer window.',...r.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    event: "ClassicyAppScreenSaverActivate",
    children: "Start the screen saver"
  }
}`,...o.parameters?.docs?.source},description:{story:'`event` makes the link dispatch an internal action instead of navigating —\nhere starting the screen saver. With no `href` the anchor gets\n`role="button"` and activates on Enter/Space.',...o.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    disabled: true,
    children: "Unavailable link"
  }
}`,...c.parameters?.docs?.source},description:{story:"A disabled link: greyed, out of the tab order, and clicks do nothing.",...c.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  parameters: desktopParameters,
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="links" appId="storybook.app" title="Links" initialSize={[360, 180]} initialPosition={[80, 60]}>
                <div style={{
        padding: "1em"
      }}>
                    <p>
                        <ClassicyLink href="https://classicy.ing">
                            Visit classicy.ing
                        </ClassicyLink>
                    </p>
                    <p>
                        <ClassicyLink href="https://classicy.ing" disposition="browser-new">
                            Open in a new tab
                        </ClassicyLink>
                    </p>
                    <p>
                        <ClassicyLink event="ClassicyAppScreenSaverActivate">
                            Start the screen saver
                        </ClassicyLink>
                    </p>
                </div>
            </ClassicyWindow>
        </StoryApp>
}`,...p.parameters?.docs?.source},description:{story:`Links inside a window on a live desktop: the first opens a WebViewer
window, the second a new browser tab, and the third starts the screen
saver (move the mouse to wake it).`,...p.parameters?.docs?.description}}};const W=["InDesktopViewer","NewBrowserTab","InternalAction","Disabled","OnTheDesktop"];export{c as Disabled,a as InDesktopViewer,o as InternalAction,r as NewBrowserTab,p as OnTheDesktop,W as __namedExportsOrder,O as default};
