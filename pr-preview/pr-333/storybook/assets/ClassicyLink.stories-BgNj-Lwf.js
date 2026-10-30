import{bl as A,r as x,bh as D,j as s,be as j,bi as V,w as P,y as O}from"./iframe-BVrgAG4n.js";import{a as W,C as I}from"./ClassicyAppearanceProbe-vq_yGkDk.js";import{d as U,S as R}from"./helpers-wEAF1F5F.js";import"./preload-helper-shce2T3m.js";const r=({href:n,disposition:w="classicy",event:h,eventData:b,onClickFunc:y,disabled:t=!1,className:g,style:m,children:v,...f})=>{const k=P(),{track:C}=A(),u=x.useRef(null),i=D("Link",{disabled:t},u),S=e=>{if(t){e.preventDefault();return}if(i.emit("click",V()),C("click",{type:"ClassicyLink",href:n,event:h}),!(y&&(y(e),e.defaultPrevented))){if(h){e.preventDefault(),k({type:h,...b??{}});return}if(!n){e.preventDefault();return}e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button===1||(e.preventDefault(),k({type:"ClassicyDesktopOpenUrl",url:n,disposition:w}))}},L=e=>{e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar"||(e.preventDefault(),!t&&e.currentTarget.click())};return s.jsx("a",{...i.attrs,...f,ref:u,href:n,role:n?void 0:"button",tabIndex:t?-1:n?void 0:0,"aria-disabled":t||void 0,className:j("classicyLink",i.className,g),style:i.style?{...i.style,...m}:m,onClick:S,onKeyDown:n?void 0:L,children:v})};r.__docgenInfo={description:'A Platinum-styled hyperlink — use it instead of a raw `<a>`, which it\nrenders (other anchor attributes pass through). A plain click on an `href`\nlink dispatches `ClassicyDesktopOpenUrl`, so by default the page opens in\nthe desktop\'s own WebViewer window; `disposition` sends it to the browser\ninstead. Modifier and middle clicks keep the browser\'s native behaviour\n(open in a new tab, …). Invalid or non-http URLs raise the desktop error\ndialog.\n\nWith `event` (and `eventData`) it instead dispatches an internal action,\nlike a menu item, and the anchor takes `role="button"` and activates on\nEnter/Space. Opening a URL needs a mounted `ClassicyDesktop`: its WebViewer\nand URL controller are what act on the dispatch.\n\n```tsx\n<ClassicyLink href="https://example.com">Example</ClassicyLink>\n<ClassicyLink href="https://example.com" disposition="browser-new">New tab</ClassicyLink>\n<ClassicyLink event="ClassicyAppScreenSaverActivate">Start the screen saver</ClassicyLink>\n```',methods:[],displayName:"ClassicyLink",props:{disposition:{defaultValue:{value:'"classicy"',computed:!1},required:!1},disabled:{defaultValue:{value:"false",computed:!1},required:!1}}};const H={title:"Controls/Link",component:r},a={args:{href:"https://classicy.ing",children:"Visit classicy.ing"},decorators:[n=>s.jsxs("p",{style:{margin:0},children:["Learn more at ",s.jsx(n,{})," — opens in a WebViewer window."]})]},o={args:{href:"https://classicy.ing",disposition:"browser-new",children:"Open in a new tab"}},c={args:{event:"ClassicyAppScreenSaverActivate",children:"Start the screen saver"}},p={args:{href:"https://classicy.ing",disabled:!0,children:"Unavailable link"}},l={parameters:U,render:()=>s.jsx(R,{id:"storybook.app",name:"Storybook",children:s.jsx(O,{id:"links",appId:"storybook.app",title:"Links",initialSize:[360,180],initialPosition:[80,60],children:s.jsxs("div",{style:{padding:"1em"},children:[s.jsx("p",{children:s.jsx(r,{href:"https://classicy.ing",children:"Visit classicy.ing"})}),s.jsx("p",{children:s.jsx(r,{href:"https://classicy.ing",disposition:"browser-new",children:"Open in a new tab"})}),s.jsx("p",{children:s.jsx(r,{event:"ClassicyAppScreenSaverActivate",children:"Start the screen saver"})})]})})})},d={args:a.args,render:n=>s.jsx(I,{children:s.jsx(r,{...n})}),parameters:W()};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    children: "Visit classicy.ing"
  },
  decorators: [Story => <p style={{
    margin: 0
  }}>
                Learn more at <Story /> — opens in a WebViewer window.
            </p>]
}`,...a.parameters?.docs?.source},description:{story:'The default `disposition="classicy"`: a plain click opens the page in the\ndesktop\'s WebViewer window. On this bare canvas there is no desktop to act\non the dispatch — see `OnTheDesktop` for the live behaviour.',...a.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    disposition: "browser-new",
    children: "Open in a new tab"
  }
}`,...o.parameters?.docs?.source},description:{story:'`disposition="browser-new"` opens the URL in a new browser tab (through the\ndesktop\'s URL controller) instead of a WebViewer window.',...o.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    event: "ClassicyAppScreenSaverActivate",
    children: "Start the screen saver"
  }
}`,...c.parameters?.docs?.source},description:{story:'`event` makes the link dispatch an internal action instead of navigating —\nhere starting the screen saver. With no `href` the anchor gets\n`role="button"` and activates on Enter/Space.',...c.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    disabled: true,
    children: "Unavailable link"
  }
}`,...p.parameters?.docs?.source},description:{story:"A disabled link: greyed, out of the tab order, and clicks do nothing.",...p.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source},description:{story:`Links inside a window on a live desktop: the first opens a WebViewer
window, the second a new browser tab, and the third starts the screen
saver (move the mouse to wake it).`,...l.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: InDesktopViewer.args,
  render: (args: ComponentProps<typeof ClassicyLink>) => <ClassicyAppearanceProbe>
            <ClassicyLink {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...d.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...d.parameters?.docs?.description}}};const _=["InDesktopViewer","NewBrowserTab","InternalAction","Disabled","OnTheDesktop","AppearanceHooks"];export{d as AppearanceHooks,p as Disabled,a as InDesktopViewer,c as InternalAction,o as NewBrowserTab,l as OnTheDesktop,_ as __namedExportsOrder,H as default};
