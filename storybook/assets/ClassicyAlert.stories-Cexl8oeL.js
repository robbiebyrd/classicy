import{b as a,j as o}from"./iframe-DjPB8_gN.js";import{d as p,S as n}from"./helpers-gWbsItmN.js";import"./preload-helper-PPVm8Dsz.js";const{fn:e}=__STORYBOOK_MODULE_TEST__,y={title:"Dialogs/Alert",component:a,parameters:p},t={render:()=>o.jsx(n,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-note",appId:"storybook.app",alertType:"note",label:"The document has been saved.",message:"Your changes to “Untitled” were written to disk successfully.",onClose:e()})})},r={render:()=>o.jsx(n,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-caution",appId:"storybook.app",alertType:"caution",label:"Are you sure you want to empty the Trash?",message:"It contains 3 items. This action cannot be undone.",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"ok",label:"Empty Trash",role:"default",onClick:e()}],onClose:e()})})},s={render:()=>o.jsx(n,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-dataloss",appId:"storybook.app",alertType:"caution",label:"Discard unsaved changes?",message:"If you don’t save, your changes will be lost.",defaultButtonId:"cancel",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"discard",label:"Discard",onClick:e()}],onClose:e()})})},l={render:()=>o.jsx(n,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-stop",appId:"storybook.app",alertType:"stop",label:"The application “Simple Text” could not be opened.",message:"There is not enough memory available to open this application.",onClose:e()})})},i={render:()=>o.jsx(n,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-help",appId:"storybook.app",alertType:"caution",label:"Save changes before closing?",message:"Your document contains unsaved changes.",buttons:[{id:"help",label:"?",role:"help",onClick:e()},{id:"dontsave",label:"Don’t Save",onClick:e()},{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"save",label:"Save",role:"default",onClick:e()}],onClose:e()})})},c={render:()=>o.jsx(n,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-movable",appId:"storybook.app",alertType:"caution",movable:!0,title:"Replace File",label:"A file named “Report” already exists.",message:"Do you want to replace it with the one you are moving?",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"replace",label:"Replace",role:"default",onClick:e()}],onClose:e()})})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-note" appId="storybook.app" alertType="note" label="The document has been saved." message="Your changes to “Untitled” were written to disk successfully." onClose={fn()} />
        </StoryApp>
}`,...t.parameters?.docs?.source},description:{story:"Note — talking-face icon, single OK button.",...t.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-caution" appId="storybook.app" alertType="caution" label="Are you sure you want to empty the Trash?" message="It contains 3 items. This action cannot be undone." buttons={[{
      id: "cancel",
      label: "Cancel",
      role: "cancel",
      onClick: fn()
    }, {
      id: "ok",
      label: "Empty Trash",
      role: "default",
      onClick: fn()
    }]} onClose={fn()} />
        </StoryApp>
}`,...r.parameters?.docs?.source},description:{story:'Caution — triangle + "!", Cancel + default Continue.',...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-dataloss" appId="storybook.app" alertType="caution" label="Discard unsaved changes?" message="If you don’t save, your changes will be lost." defaultButtonId="cancel" buttons={[{
      id: "cancel",
      label: "Cancel",
      role: "cancel",
      onClick: fn()
    }, {
      id: "discard",
      label: "Discard",
      onClick: fn()
    }]} onClose={fn()} />
        </StoryApp>
}`,...s.parameters?.docs?.source},description:{story:"Caution that risks data loss — the safe choice (Cancel) is made default via\n`defaultButtonId`, per the HIG.",...s.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-stop" appId="storybook.app" alertType="stop" label="The application “Simple Text” could not be opened." message="There is not enough memory available to open this application." onClose={fn()} />
        </StoryApp>
}`,...l.parameters?.docs?.source},description:{story:"Stop — octagon + hand, single OK button.",...l.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-help" appId="storybook.app" alertType="caution" label="Save changes before closing?" message="Your document contains unsaved changes." buttons={[{
      id: "help",
      label: "?",
      role: "help",
      onClick: fn()
    }, {
      id: "dontsave",
      label: "Don’t Save",
      onClick: fn()
    }, {
      id: "cancel",
      label: "Cancel",
      role: "cancel",
      onClick: fn()
    }, {
      id: "save",
      label: "Save",
      role: "default",
      onClick: fn()
    }]} onClose={fn()} />
        </StoryApp>
}`,...i.parameters?.docs?.source},description:{story:'Full four-button caution with a Help ("?") button and an optional third action.',...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-movable" appId="storybook.app" alertType="caution" movable={true} title="Replace File" label="A file named “Report” already exists." message="Do you want to replace it with the one you are moving?" buttons={[{
      id: "cancel",
      label: "Cancel",
      role: "cancel",
      onClick: fn()
    }, {
      id: "replace",
      label: "Replace",
      role: "default",
      onClick: fn()
    }]} onClose={fn()} />
        </StoryApp>
}`,...c.parameters?.docs?.source},description:{story:"Movable variant — draggable window with a red title-bar highlight.",...c.parameters?.docs?.description}}};const m=["Note","Caution","CautionDataLoss","Stop","WithHelpButton","Movable"];export{r as Caution,s as CautionDataLoss,c as Movable,t as Note,l as Stop,i as WithHelpButton,m as __namedExportsOrder,y as default};
