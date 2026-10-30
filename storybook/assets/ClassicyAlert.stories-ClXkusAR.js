import{f as a,j as o}from"./iframe-Bm2OfEvH.js";import{d,S as t}from"./helpers-DeqakgJy.js";import"./preload-helper-PPVm8Dsz.js";const{fn:e}=__STORYBOOK_MODULE_TEST__,m={title:"Dialogs/Alert",component:a,parameters:d},n={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-note",appId:"storybook.app",alertType:"note",label:"The document has been saved.",message:"Your changes to “Untitled” were written to disk successfully.",onClose:e()})})},r={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-caution",appId:"storybook.app",alertType:"caution",label:"Are you sure you want to empty the Trash?",message:"It contains 3 items. This action cannot be undone.",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"ok",label:"Empty Trash",role:"default",onClick:e()}],onClose:e()})})},s={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-dataloss",appId:"storybook.app",alertType:"caution",label:"Discard unsaved changes?",message:"If you don’t save, your changes will be lost.",defaultButtonId:"cancel",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"discard",label:"Discard",onClick:e()}],onClose:e()})})},l={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-stop",appId:"storybook.app",alertType:"stop",label:"The application “Simple Text” could not be opened.",message:"There is not enough memory available to open this application.",onClose:e()})})},i={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-help",appId:"storybook.app",alertType:"caution",label:"Save changes before closing?",message:"Your document contains unsaved changes.",buttons:[{id:"help",label:"?",role:"help",onClick:e()},{id:"dontsave",label:"Don’t Save",onClick:e()},{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"save",label:"Save",role:"default",onClick:e()}],onClose:e()})})},p={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-movable",appId:"storybook.app",alertType:"caution",movable:!0,title:"Replace File",label:"A file named “Report” already exists.",message:"Do you want to replace it with the one you are moving?",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"replace",label:"Replace",role:"default",onClick:e()}],onClose:e()})})},c={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-caution-defaults",appId:"storybook.app",alertType:"caution",label:"The disk is almost full.",message:"Continuing may leave too little space to save your work.",onClose:e()})})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-note" appId="storybook.app" alertType="note" label="The document has been saved." message="Your changes to “Untitled” were written to disk successfully." onClose={fn()} />
        </StoryApp>
}`,...n.parameters?.docs?.source},description:{story:"A `note` alert with no `buttons` prop: the note icon and the generated single\nOK button. Use a note to report something the user should know but need not\ndecide on.",...n.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
}`,...r.parameters?.docs?.source},description:{story:'A `caution` alert with explicit buttons: Cancel (`role: "cancel"`, fired by\nEscape / Command-period) and a specific verb as the default (fired by\nReturn). HIG: name the action ("Empty Trash"), not "OK".',...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source},description:{story:"A caution that risks data loss: `defaultButtonId` makes the safe choice\n(Cancel) the default button, so a reflexive Return cannot destroy work\n(HIGOS8 p.60).",...s.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-stop" appId="storybook.app" alertType="stop" label="The application “Simple Text” could not be opened." message="There is not enough memory available to open this application." onClose={fn()} />
        </StoryApp>
}`,...l.parameters?.docs?.source},description:{story:"A `stop` alert: the stop icon and a single OK button, for a problem that\nprevented the action. Explain what happened and, where possible, what to do.",...l.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
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
}`,...i.parameters?.docs?.source},description:{story:'The four-button maximum: a `help`-role button (drawn as `ClassicyHelpButton`\nat the far left), an optional third action, Cancel and the default. A `"?"`\nlabel becomes the accessible name "Help".',...i.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
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
}`,...p.parameters?.docs?.source},description:{story:"The movable variant (`movable`): a draggable window whose title bar carries\nthe red highlight and shows `title`, instead of the fixed alert's red\ncontent border (HIGOS8 p.57). It plays the alert sound itself on open.",...p.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-caution-defaults" appId="storybook.app" alertType="caution" label="The disk is almost full." message="Continuing may leave too little space to save your work." onClose={fn()} />
        </StoryApp>
}`,...c.parameters?.docs?.source},description:{story:"A `caution` alert with no `buttons` prop: the generated Cancel + Continue\npair, with Continue as the default. Pass `buttons` to name the action\ninstead, as the Caution story does.",...c.parameters?.docs?.description}}};const h=["Note","Caution","CautionDataLoss","Stop","WithHelpButton","Movable","CautionDefaultButtons"];export{r as Caution,s as CautionDataLoss,c as CautionDefaultButtons,p as Movable,n as Note,l as Stop,i as WithHelpButton,h as __namedExportsOrder,m as default};
