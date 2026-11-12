import{j as e,C as p}from"./iframe-DvwfkZms.js";import{a as d,C as l}from"./ClassicyAppearanceProbe-Z4PIYxLl.js";import{d as h,S as m}from"./helpers--e_PtLqa.js";import{C as o}from"./ClassicyLink-BcWpTU3V.js";import"./preload-helper-CxPGPiBr.js";const u={title:"Controls/Link",component:o},s={args:{href:"https://classicy.ing",children:"Visit classicy.ing"},decorators:[c=>e.jsxs("p",{style:{margin:0},children:["Learn more at ",e.jsx(c,{})," \u2014 opens in a WebViewer window."]})]},r={args:{href:"https://classicy.ing",disposition:"browser-new",children:"Open in a new tab"}},n={args:{event:"ClassicyAppScreenSaverActivate",children:"Start the screen saver"}},a={args:{href:"https://classicy.ing",disabled:!0,children:"Unavailable link"}},i={parameters:h,render:()=>e.jsx(m,{id:"storybook.app",name:"Storybook",children:e.jsx(p,{id:"links",appId:"storybook.app",title:"Links",initialSize:[360,180],initialPosition:[80,60],children:e.jsxs("div",{style:{padding:"1em"},children:[e.jsx("p",{children:e.jsx(o,{href:"https://classicy.ing",children:"Visit classicy.ing"})}),e.jsx("p",{children:e.jsx(o,{href:"https://classicy.ing",disposition:"browser-new",children:"Open in a new tab"})}),e.jsx("p",{children:e.jsx(o,{event:"ClassicyAppScreenSaverActivate",children:"Start the screen saver"})})]})})})},t={args:s.args,render:c=>e.jsx(l,{children:e.jsx(o,{...c})}),parameters:d()};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    children: "Visit classicy.ing"
  },
  decorators: [Story => <p style={{
    margin: 0
  }}>
                Learn more at <Story /> \u2014 opens in a WebViewer window.
            </p>]
}`,...s.parameters?.docs?.source},description:{story:'The default `disposition="classicy"`: a plain click opens the page in the\ndesktop\'s WebViewer window. On this bare canvas there is no desktop to act\non the dispatch \u2014 see `OnTheDesktop` for the live behavior.',...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    disposition: "browser-new",
    children: "Open in a new tab"
  }
}`,...r.parameters?.docs?.source},description:{story:'`disposition="browser-new"` opens the URL in a new browser tab (through the\ndesktop\'s URL controller) instead of a WebViewer window.',...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    event: "ClassicyAppScreenSaverActivate",
    children: "Start the screen saver"
  }
}`,...n.parameters?.docs?.source},description:{story:'`event` makes the link dispatch an internal action instead of navigating \u2014\nhere starting the screen saver. With no `href` the anchor gets\n`role="button"` and activates on Enter/Space.',...n.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    href: "https://classicy.ing",
    disabled: true,
    children: "Unavailable link"
  }
}`,...a.parameters?.docs?.source},description:{story:"A disabled link: grayed, out of the tab order, and clicks do nothing.",...a.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
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
}`,...i.parameters?.docs?.source},description:{story:`Links inside a window on a live desktop: the first opens a WebViewer
window, the second a new browser tab, and the third starts the screen
saver (move the mouse to wake it).`,...i.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: InDesktopViewer.args,
  render: (args: ComponentProps<typeof ClassicyLink>) => <ClassicyAppearanceProbe>
            <ClassicyLink {...args} />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters()
}`,...t.parameters?.docs?.source},description:{story:"The Appearance Package hook surface, under the Storybook probe package:\nevery root `decorate()` reaches is outlined (green while pressed), and every\nevent the component emits is logged in the Actions panel.",...t.parameters?.docs?.description}}};const v=["InDesktopViewer","NewBrowserTab","InternalAction","Disabled","OnTheDesktop","AppearanceHooks"];export{t as AppearanceHooks,a as Disabled,s as InDesktopViewer,n as InternalAction,r as NewBrowserTab,i as OnTheDesktop,v as __namedExportsOrder,u as default};
