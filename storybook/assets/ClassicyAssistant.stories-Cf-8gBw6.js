import{e as i,j as s,d as o,f as n}from"./iframe-BZOTByd6.js";import"./preload-helper-PPVm8Dsz.js";const l={title:"SystemResources/Assistant",component:i,parameters:{classicy:{desktop:!0}}},e={render:()=>s.jsx(o,{id:"about-help",appId:"about-help",title:"",initialSize:[420,220],initialPosition:["center","center"],resizable:!1,zoomable:!1,children:s.jsx(i,{pages:[{title:"About Help",content:s.jsxs("div",{children:[s.jsx("p",{children:"The Help menu includes:"}),s.jsxs("ul",{children:[s.jsx("li",{children:"Balloons—to help you identify items on the screen."}),s.jsx("li",{children:"Help—to guide you step-by-step through tasks."})]}),s.jsx("p",{children:"- End -"})]})}]})})},t={render:()=>s.jsx(o,{id:"setup",appId:"setup",title:"Mac OS Setup Assistant",initialSize:[560,420],initialPosition:["center","center"],resizable:!0,zoomable:!0,children:s.jsx(i,{buttons:[{title:"Cancel",onClick:()=>{}}],pages:[{title:"Introduction",accessoryIcon:n.applications.setupAssistant.setupAssistant,accessoryIconSize:"lg",content:s.jsxs("div",{children:[s.jsx("p",{children:"Welcome to the Mac OS Setup Assistant!"}),s.jsx("p",{children:"Based on your answers to a few questions, this assistant makes some basic settings on your computer and sets it up so that you can print documents and share files over a local network."}),s.jsx("p",{children:"This assistant starts with some questions about yourself, where you are, and how you plan to use your computer."}),s.jsx("p",{children:"Click the right arrow to continue."})]})},{title:"Regional Preferences",accessoryIcon:n.applications.setupAssistant.setupAssistant,accessoryIconSize:"lg",content:s.jsx("p",{children:"Choose your keyboard layout and time zone here."})},{title:"Conclusion",accessoryIcon:n.applications.setupAssistant.setupAssistant,accessoryIconSize:"lg",content:s.jsx("p",{children:"You're all set. Click Done to finish."}),buttons:[{title:"Done",onClick:()=>{}}]}]})})};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyWindow id="about-help" appId="about-help" title="" initialSize={[420, 220]} initialPosition={["center", "center"]} resizable={false} zoomable={false}>
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
}`,...e.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyWindow id="setup" appId="setup" title="Mac OS Setup Assistant" initialSize={[560, 420]} initialPosition={["center", "center"]} resizable zoomable>
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
                                    Based on your answers to a few questions, this assistant makes
                                    some basic settings on your computer and sets it up so that
                                    you can print documents and share files over a local network.
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
}`,...t.parameters?.docs?.source}}};const r=["CompactAssistantLayoutReference","SetupAssistant"];export{e as CompactAssistantLayoutReference,t as SetupAssistant,r as __namedExportsOrder,l as default};
