import{j as o,C as a,ak as d,s as p,m as e}from"./iframe-7JEmh2mt.js";import{C as c,a as l}from"./ClassicyButtonToolbar-CxEoc6zD.js";import{C as u}from"./ClassicyPlacard-Be8n7m8o.js";import{S as r}from"./helpers-DWcsdqVm.js";import{w as m}from"./windows98-bXnIjVR1.js";import"./preload-helper-DhQH6ajB.js";import"./index-DYS3yo0c.js";const B={title:"Appearance/Windows 98/ToolTips",parameters:m},n={render:()=>{const t=p("icons","system.info")??"";return o.jsx(r,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"windows98-tooltips",appId:"storybook.app",title:"Exploring - My Documents",initialSize:[360,140],initialPosition:[80,60],children:o.jsxs(c,{children:[o.jsxs(l,{children:[o.jsx(e,{icon:t,iconAlt:"Back"}),o.jsx(e,{icon:t,iconAlt:"Forward"}),o.jsx(e,{icon:t,iconAlt:"Up"})]}),o.jsxs(l,{children:[o.jsx(e,{icon:t,iconAlt:"Cut"}),o.jsx(e,{icon:t,iconAlt:"Copy"}),o.jsx(e,{icon:t,iconAlt:"Paste"})]})]})})})}},y=[{id:"wordpad-file",title:"File",menuChildren:[{id:"wordpad-new",title:"New...",balloon:{content:"Creates a new document"}},{id:"wordpad-open",title:"Open...",balloon:{content:"Opens an existing document"}},{id:"wordpad-save",title:"Save",balloon:{content:"Saves the active document"}},{id:"spacer"},{id:"wordpad-exit",title:"Exit",balloon:{content:"Quits the application; prompts you to save documents"}}]},{id:"wordpad-edit",title:"Edit",menuChildren:[{id:"wordpad-cut",title:"Cut",disabled:!0,balloon:{content:"Cuts the selection and puts it on the Clipboard",disabledContent:"This command is not available because no text is selected."}},{id:"wordpad-copy",title:"Copy",disabled:!0,balloon:{content:"Copies the selection and puts it on the Clipboard",disabledContent:"This command is not available because no text is selected."}},{id:"wordpad-paste",title:"Paste",balloon:{content:"Inserts Clipboard contents"}},{id:"spacer"},{id:"wordpad-select-all",title:"Select All",balloon:{content:"Selects the entire document"}}]}],i={render:()=>o.jsx(r,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"windows98-status",appId:"storybook.app",title:"Document - WordPad",initialSize:[420,220],initialPosition:[80,60],appMenu:y,placard:o.jsx(u,{menuStatus:!0,children:"For Help, press F1"}),children:o.jsx("div",{style:{padding:"1em"},children:o.jsx("p",{children:"Open a menu and point at its items."})})})})},s={render:()=>o.jsx(r,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"windows98-rich-text",appId:"storybook.app",title:"Notes.md - SimpleText",initialSize:[420,240],initialPosition:[80,60],children:o.jsx(d,{content:`# Notes

Point at a **toolbar** button.`})})})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => {
    const icon = resolveClassicyAsset("icons", "system.info") ?? "";
    return <StoryApp id="storybook.app" name="Storybook">
                <ClassicyWindow id="windows98-tooltips" appId="storybook.app" title="Exploring - My Documents" initialSize={[360, 140]} initialPosition={[80, 60]}>
                    <ClassicyButtonToolbar>
                        <ClassicyButtonToolbarGroup>
                            <ClassicyBevelButton icon={icon} iconAlt="Back" />
                            <ClassicyBevelButton icon={icon} iconAlt="Forward" />
                            <ClassicyBevelButton icon={icon} iconAlt="Up" />
                        </ClassicyButtonToolbarGroup>
                        <ClassicyButtonToolbarGroup>
                            <ClassicyBevelButton icon={icon} iconAlt="Cut" />
                            <ClassicyBevelButton icon={icon} iconAlt="Copy" />
                            <ClassicyBevelButton icon={icon} iconAlt="Paste" />
                        </ClassicyButtonToolbarGroup>
                    </ClassicyButtonToolbar>
                </ClassicyWindow>
            </StoryApp>;
  }
}`,...n.parameters?.docs?.source},description:{story:`Icon-only toolbar buttons, each named by a ToolTip: point at one and rest
half a second; it goes on a press, after five seconds, or when the
pointer leaves, and the next button's shows a tenth of a second after the
pointer reaches it. Balloon Help's Show/Hide does not hide them.`,...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="windows98-status" appId="storybook.app" title="Document - WordPad" initialSize={[420, 220]} initialPosition={[80, 60]} appMenu={wordpadMenu} placard={<ClassicyPlacard menuStatus>For Help, press F1</ClassicyPlacard>}>
                <div style={{
        padding: "1em"
      }}>
                    <p>Open a menu and point at its items.</p>
                </div>
            </ClassicyWindow>
        </StoryApp>
}`,...i.parameters?.docs?.source},description:{story:`A highlighted menu item's message in the window's status bar, a placard
given \`menuStatus\`: open File or Edit and point at an item (or walk the
items with the arrow keys); an unavailable item tells why. The menus show
no balloons, and the status bar returns to "For Help, press F1" when the
menu closes.`,...i.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyWindow id="windows98-rich-text" appId="storybook.app" title="Notes.md - SimpleText" initialSize={[420, 240]} initialPosition={[80, 60]}>
                <ClassicyRichTextEditor content={"# Notes\\n\\nPoint at a **toolbar** button."} />
            </ClassicyWindow>
        </StoryApp>
}`,...s.parameters?.docs?.source},description:{story:`The rich text editor's toolbar tips (Undo, Redo, Bold, Italic, Underline,
Code, Rule), opened in the desktop and drawn as ToolTips.`,...s.parameters?.docs?.description}}};const k=["ToolbarTips","MenuStatusBar","RichTextEditorTips"];export{i as MenuStatusBar,s as RichTextEditorTips,n as ToolbarTips,k as __namedExportsOrder,B as default};
