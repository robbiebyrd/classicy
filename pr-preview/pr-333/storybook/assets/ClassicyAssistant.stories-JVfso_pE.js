import{R as a,j as e,y as i,S as r,r as d,T as m}from"./iframe-CIezP3KD.js";import{a as g,C as b}from"./ClassicyAppearanceProbe-D6HKSZXt.js";import{d as A,S as c}from"./helpers-BLkRM-3u.js";import"./preload-helper-shce2T3m.js";const w={title:"Dialogs/Assistant",component:a,parameters:A},s={render:()=>e.jsx(c,{id:"storybook.app",name:"Storybook",children:e.jsx(i,{id:"about-help",appId:"storybook.app",title:"",initialSize:[420,220],initialPosition:["center","center"],resizable:!1,zoomable:!1,children:e.jsx(a,{pages:[{title:"About Help",content:e.jsxs("div",{children:[e.jsx("p",{children:"The Help menu includes:"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Balloons—to help you identify items on the screen."}),e.jsx("li",{children:"Help—to guide you step-by-step through tasks."})]}),e.jsx("p",{children:"- End -"})]})}]})})})},t={render:()=>e.jsx(u,{})};function u(){return e.jsx(c,{id:"storybook.app",name:"Storybook",children:e.jsx(i,{id:"setup",appId:"storybook.app",title:"Mac OS Setup Assistant",initialSize:[560,420],initialPosition:["center","center"],resizable:!0,zoomable:!0,children:e.jsx(a,{buttons:[{title:"Cancel",onClick:()=>{}}],pages:[{title:"Introduction",accessoryIcon:r.applications.setupAssistant.setupAssistant,accessoryIconSize:"lg",content:e.jsxs("div",{children:[e.jsx("p",{children:"Welcome to the Mac OS Setup Assistant!"}),e.jsx("p",{children:"Based on your answers to a few questions, this assistant makes some basic settings on your computer and sets it up so that you can print documents and share files over a local network."}),e.jsx("p",{children:"This assistant starts with some questions about yourself, where you are, and how you plan to use your computer."}),e.jsx("p",{children:"Click the right arrow to continue."})]})},{title:"Regional Preferences",accessoryIcon:r.applications.setupAssistant.setupAssistant,accessoryIconSize:"lg",content:e.jsx("p",{children:"Choose your keyboard layout and time zone here."})},{title:"Conclusion",accessoryIcon:r.applications.setupAssistant.setupAssistant,accessoryIconSize:"lg",content:e.jsx("p",{children:"You're all set. Click Done to finish."}),buttons:[{title:"Done",onClick:()=>{}}]}]})})})}const x=()=>{const[p,h]=d.useState(0),[l,y]=d.useState(!1);return e.jsx(c,{id:"storybook.app",name:"Storybook",children:e.jsx(i,{id:"gated",appId:"storybook.app",title:`Installer — step ${p+1} of 2`,initialSize:[440,260],initialPosition:["center","center"],children:e.jsx(a,{page:p,onPageChange:h,pages:[{title:"License",content:e.jsx(m,{id:"assistant-agree",label:"I agree to the license",checked:l,onClickFunc:y}),canAdvance:()=>l},{title:"Install",content:e.jsx("p",{children:"Ready to install."})}]})})})},n={render:()=>e.jsx(x,{})},o={render:()=>e.jsx(b,{children:e.jsx(u,{})}),parameters:g("600px")};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="about-help" appId="storybook.app" title="" initialSize={[420, 220]} initialPosition={["center", "center"]} resizable={false} zoomable={false}>
                <ClassicyAssistant pages={[{
        title: "About Help",
        content: <div>
                                    <p>The Help menu includes:</p>
                                    <ul>
                                        <li>Balloons—to help you identify items on the screen.</li>
                                        <li>Help—to guide you step-by-step through tasks.</li>
                                    </ul>
                                    <p>- End -</p>
                                </div>
      }]} />
            </ClassicyWindow>
        </StoryApp>
}`,...s.parameters?.docs?.source},description:{story:`A compact single-page assistant in a small, non-resizable, untitled
window — no icons, so both pager arrows are disabled. A sizing and geometry
reference only: the real "About Balloon Help…" window is \`AppleGuideWindow\`
(Extensions/AppleGuide), opened from the desktop's Help menu.`,...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <SetupAssistantStory />
}`,...t.parameters?.docs?.source},description:{story:`The full "Mac OS Setup Assistant": a titled document window, a large
(\`"lg"\`) accessory icon overflowing the header, and an assistant-wide
Cancel button that the last page replaces with its own Done button. Page
with the arrows or, with focus inside, the ← / → keys.`,...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <GatedAssistant />
}`,...n.parameters?.docs?.source},description:{story:"Controlled paging with a gate: the parent owns `page` through\n`onPageChange` (here echoed in the window title), and the first page's\n`canAdvance` refuses to move on — playing the error sound — until the\ncheckbox is ticked.",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyAppearanceProbe>
            <SetupAssistantStory />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters("600px")
}`,...o.parameters?.docs?.source},description:{story:`The Appearance Package hook surface, under the Storybook probe package:
every root \`decorate()\` reaches is outlined (green while pressed), and every
event the component emits is logged in the Actions panel.

Uses the paged \`SetupAssistant\`: the single-page layout reference has no
page to change to.

It renders a fixed tree and takes no args.`,...o.parameters?.docs?.description}}};const C=["CompactAssistantLayoutReference","SetupAssistant","ControlledWithGate","AppearanceHooks"];export{o as AppearanceHooks,s as CompactAssistantLayoutReference,n as ControlledWithGate,t as SetupAssistant,C as __namedExportsOrder,w as default};
