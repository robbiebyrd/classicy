import{m as a,j as o}from"./iframe-BS4IKdgB.js";import{a as k,C}from"./ClassicyAppearanceProbe-B3k4js7K.js";import{d as f,S as t}from"./helpers-C5L8HUTj.js";import{m as S}from"./mirrored-BUlRgDlY.js";import"./preload-helper-CiDKIbga.js";const{fn:e}=__STORYBOOK_MODULE_TEST__,I={title:"Dialogs/Alert",component:a,parameters:f},r={render:()=>o.jsx(h,{})};function h(){return o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-note",appId:"storybook.app",alertType:"note",label:"The document has been saved.",message:"Your changes to \u201CUntitled\u201D were written to disk successfully.",onClose:e()})})}const n={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-caution",appId:"storybook.app",alertType:"caution",label:"Are you sure you want to empty the Trash?",message:"It contains 3 items. This action cannot be undone.",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"ok",label:"Empty Trash",role:"default",onClick:e()}],onClose:e()})})},s={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-dataloss",appId:"storybook.app",alertType:"caution",label:"Discard unsaved changes?",message:"If you don\u2019t save, your changes will be lost.",defaultButtonId:"cancel",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"discard",label:"Discard",onClick:e()}],onClose:e()})})},l={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-stop",appId:"storybook.app",alertType:"stop",label:"The application \u201CSimple Text\u201D could not be opened.",message:"There is not enough memory available to open this application.",onClose:e()})})},i={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-help",appId:"storybook.app",alertType:"caution",label:"Save changes before closing?",message:"Your document contains unsaved changes.",buttons:[{id:"help",label:"?",role:"help",onClick:e()},{id:"dontsave",label:"Don\u2019t Save",onClick:e()},{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"save",label:"Save",role:"default",onClick:e()}],onClose:e()})})},p={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-movable",appId:"storybook.app",alertType:"caution",movable:!0,title:"Replace File",label:"A file named \u201CReport\u201D already exists.",message:"Do you want to replace it with the one you are moving?",buttons:[{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"replace",label:"Replace",role:"default",onClick:e()}],onClose:e()})})},c={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-movable-note",appId:"storybook.app",alertType:"note",movable:!0,label:"The document has been printed.",buttons:[{id:"ok",label:"OK",role:"default",onClick:e()}],onClose:e()})})},d={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-movable-stop",appId:"storybook.app",alertType:"stop",movable:!0,label:"The file could not be saved, because the disk is full.",buttons:[{id:"ok",label:"OK",role:"default",onClick:e()}],onClose:e()})})},u={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-movable-dialog-box",appId:"storybook.app",alertType:"caution",movable:!0,dialogBox:!0,label:"Save changes to the document \u201Cuntitled\u201D before closing?",buttons:[{id:"dont-save",label:"Don\u2019t Save",onClick:e()},{id:"cancel",label:"Cancel",role:"cancel",onClick:e()},{id:"save",label:"Save",role:"default",onClick:e()}],onClose:e()})})},b={render:()=>o.jsx(t,{id:"storybook.app",name:"Storybook",children:o.jsx(a,{id:"alert-caution-defaults",appId:"storybook.app",alertType:"caution",label:"The disk is almost full.",message:"Continuing may leave too little space to save your work.",onClose:e()})})},m={render:()=>o.jsx(C,{children:o.jsx(h,{})}),parameters:k("600px")},y={...n,parameters:S};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <NoteAlertStory />
}`,...r.parameters?.docs?.source},description:{story:"A `note` alert with no `buttons` prop: the note icon and the generated single\nOK button. Use a note to report something the user should know but need not\ndecide on.",...r.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...n.parameters?.docs?.source},description:{story:'A `caution` alert with explicit buttons: Cancel (`role: "cancel"`, fired by\nEscape / Command-period) and a specific verb as the default (fired by\nReturn). HIG: name the action ("Empty Trash"), not "OK".',...n.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-dataloss" appId="storybook.app" alertType="caution" label="Discard unsaved changes?" message="If you don\u2019t save, your changes will be lost." defaultButtonId="cancel" buttons={[{
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
            <ClassicyAlert id="alert-stop" appId="storybook.app" alertType="stop" label="The application \u201CSimple Text\u201D could not be opened." message="There is not enough memory available to open this application." onClose={fn()} />
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
      label: "Don\u2019t Save",
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
            <ClassicyAlert id="alert-movable" appId="storybook.app" alertType="caution" movable={true} title="Replace File" label="A file named \u201CReport\u201D already exists." message="Do you want to replace it with the one you are moving?" buttons={[{
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
}`,...p.parameters?.docs?.source},description:{story:"The movable variant (`movable`): a draggable window whose title bar carries\nthe red highlight and shows `title`, where the fixed alert has no title bar\n(HIGOS8 p.57). Both draw the red frame of HIGOS8 pp.61-64, Figures 3-4 to\n3-8, around their contents (under Platinum). It plays the alert sound\nitself on open.",...p.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-movable-note" appId="storybook.app" alertType="note" movable={true} label="The document has been printed." buttons={[{
      id: "ok",
      label: "OK",
      role: "default",
      onClick: fn()
    }]} onClose={fn()} />
        </StoryApp>
}`,...c.parameters?.docs?.source},description:{story:"A movable `note` alert: the same red title-bar highlight as every movable\nalert box (HIGOS8 p.61); only the icon tells the types apart.",...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-movable-stop" appId="storybook.app" alertType="stop" movable={true} label="The file could not be saved, because the disk is full." buttons={[{
      id: "ok",
      label: "OK",
      role: "default",
      onClick: fn()
    }]} onClose={fn()} />
        </StoryApp>
}`,...d.parameters?.docs?.source},description:{story:"A movable `stop` alert: the same frame, with the stop icon.",...d.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-movable-dialog-box" appId="storybook.app" alertType="caution" movable={true} dialogBox={true} label="Save changes to the document \u201Cuntitled\u201D before closing?" buttons={[{
      id: "dont-save",
      label: "Don\u2019t Save",
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
}`,...u.parameters?.docs?.source},description:{story:`\`dialogBox\`: an alert in a movable modal dialog box's frame, the plain
title bar (HIGOS8 p.59), as Mac OS 8.1's SimpleText asks "Save changes\u2026".`,...u.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <StoryApp id="storybook.app" name="Storybook">
            <ClassicyAlert id="alert-caution-defaults" appId="storybook.app" alertType="caution" label="The disk is almost full." message="Continuing may leave too little space to save your work." onClose={fn()} />
        </StoryApp>
}`,...b.parameters?.docs?.source},description:{story:"A `caution` alert with no `buttons` prop: the generated Cancel + Continue\npair, with Continue as the default. Pass `buttons` to name the action\ninstead, as the Caution story does.",...b.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <ClassicyAppearanceProbe>
            <NoteAlertStory />
        </ClassicyAppearanceProbe>,
  parameters: appearanceHooksParameters("600px")
}`,...m.parameters?.docs?.source},description:{story:`The Appearance Package hook surface, under the Storybook probe package:
every root \`decorate()\` reaches is outlined (green while pressed), and every
event the component emits is logged in the Actions panel.

It renders a fixed tree and takes no args.`,...m.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  ...Caution,
  parameters: mirroredParameters
}`,...y.parameters?.docs?.source},description:{story:"`Caution` under the Storybook-only `mirrored` Appearance Package: the icon\non the right of the message and the default button leftmost, by CSS alone\n(`flex-direction: row-reverse` on the top row and the button row). Return\nand Escape still pick the same buttons.",...y.parameters?.docs?.description}}};const w=["Note","Caution","CautionDataLoss","Stop","WithHelpButton","Movable","MovableNote","MovableStop","MovableDialogBox","CautionDefaultButtons","AppearanceHooks","Mirrored"];export{m as AppearanceHooks,n as Caution,s as CautionDataLoss,b as CautionDefaultButtons,y as Mirrored,p as Movable,u as MovableDialogBox,c as MovableNote,d as MovableStop,r as Note,l as Stop,i as WithHelpButton,w as __namedExportsOrder,I as default};
