import{k as n,j as e,C as a,m as i,i as p,n as h}from"./iframe-BrwpSEZU.js";import{d as y,S as r}from"./helpers-rphVVeRn.js";import"./preload-helper-PPVm8Dsz.js";const k={title:"Dialogs/Assistant",component:n,parameters:y},s={render:()=>e.jsx(r,{id:"storybook.app",name:"Storybook",children:e.jsx(a,{id:"about-help",appId:"storybook.app",title:"",initialSize:[420,220],initialPosition:["center","center"],resizable:!1,zoomable:!1,children:e.jsx(n,{pages:[{title:"About Help",content:e.jsxs("div",{children:[e.jsx("p",{children:"The Help menu includes:"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Balloons—to help you identify items on the screen."}),e.jsx("li",{children:"Help—to guide you step-by-step through tasks."})]}),e.jsx("p",{children:"- End -"})]})}]})})})},t={render:()=>e.jsx(r,{id:"storybook.app",name:"Storybook",children:e.jsx(a,{id:"setup",appId:"storybook.app",title:"Mac OS Setup Assistant",initialSize:[560,420],initialPosition:["center","center"],resizable:!0,zoomable:!0,children:e.jsx(n,{buttons:[{title:"Cancel",onClick:()=>{}}],pages:[{title:"Introduction",accessoryIcon:i.applications.setupAssistant.setupAssistant,accessoryIconSize:"lg",content:e.jsxs("div",{children:[e.jsx("p",{children:"Welcome to the Mac OS Setup Assistant!"}),e.jsx("p",{children:"Based on your answers to a few questions, this assistant makes some basic settings on your computer and sets it up so that you can print documents and share files over a local network."}),e.jsx("p",{children:"This assistant starts with some questions about yourself, where you are, and how you plan to use your computer."}),e.jsx("p",{children:"Click the right arrow to continue."})]})},{title:"Regional Preferences",accessoryIcon:i.applications.setupAssistant.setupAssistant,accessoryIconSize:"lg",content:e.jsx("p",{children:"Choose your keyboard layout and time zone here."})},{title:"Conclusion",accessoryIcon:i.applications.setupAssistant.setupAssistant,accessoryIconSize:"lg",content:e.jsx("p",{children:"You're all set. Click Done to finish."}),buttons:[{title:"Done",onClick:()=>{}}]}]})})})},m=()=>{const[c,d]=p.useState(0),[l,u]=p.useState(!1);return e.jsx(r,{id:"storybook.app",name:"Storybook",children:e.jsx(a,{id:"gated",appId:"storybook.app",title:`Installer — step ${c+1} of 2`,initialSize:[440,260],initialPosition:["center","center"],children:e.jsx(n,{page:c,onPageChange:d,pages:[{title:"License",content:e.jsx(h,{id:"assistant-agree",label:"I agree to the license",checked:l,onClickFunc:u}),canAdvance:()=>l},{title:"Install",content:e.jsx("p",{children:"Ready to install."})}]})})})},o={render:()=>e.jsx(m,{})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="setup" appId="storybook.app" title="Mac OS Setup Assistant" initialSize={[560, 420]} initialPosition={["center", "center"]} resizable zoomable>
                <ClassicyAssistant buttons={[{
        title: "Cancel",
        onClick: () => {}
      }]} pages={[{
        title: "Introduction",
        accessoryIcon: ClassicyIcons.applications.setupAssistant.setupAssistant,
        accessoryIconSize: "lg",
        content: <div>
                                    <p>Welcome to the Mac OS Setup Assistant!</p>
                                    <p>
                                        Based on your answers to a few questions, this assistant
                                        makes some basic settings on your computer and sets it up so
                                        that you can print documents and share files over a local
                                        network.
                                    </p>
                                    <p>
                                        This assistant starts with some questions about yourself,
                                        where you are, and how you plan to use your computer.
                                    </p>
                                    <p>Click the right arrow to continue.</p>
                                </div>
      }, {
        title: "Regional Preferences",
        accessoryIcon: ClassicyIcons.applications.setupAssistant.setupAssistant,
        accessoryIconSize: "lg",
        content: <p>Choose your keyboard layout and time zone here.</p>
      }, {
        title: "Conclusion",
        accessoryIcon: ClassicyIcons.applications.setupAssistant.setupAssistant,
        accessoryIconSize: "lg",
        content: <p>You're all set. Click Done to finish.</p>,
        buttons: [{
          title: "Done",
          onClick: () => {}
        }]
      }]} />
            </ClassicyWindow>
        </StoryApp>
}`,...t.parameters?.docs?.source},description:{story:`The full "Mac OS Setup Assistant": a titled document window, a large
(\`"lg"\`) accessory icon overflowing the header, and an assistant-wide
Cancel button that the last page replaces with its own Done button. Page
with the arrows or, with focus inside, the ← / → keys.`,...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <GatedAssistant />
}`,...o.parameters?.docs?.source},description:{story:"Controlled paging with a gate: the parent owns `page` through\n`onPageChange` (here echoed in the window title), and the first page's\n`canAdvance` refuses to move on — playing the error sound — until the\ncheckbox is ticked.",...o.parameters?.docs?.description}}};const S=["CompactAssistantLayoutReference","SetupAssistant","ControlledWithGate"];export{s as CompactAssistantLayoutReference,o as ControlledWithGate,t as SetupAssistant,S as __namedExportsOrder,k as default};
